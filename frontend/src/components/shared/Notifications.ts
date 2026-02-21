import { showSuccessToast, showInfoToast, showWarningToast, showErrorToast } from './Toast';
import { t } from '../../lib/intlayer';
import { FriendsManager } from '../profile/FriendsManager';
import { openTrisModalAndJoinGame } from '../tris/modal';
import { openPongModal } from '../pong/modal';
import { joinCustomGame } from '../pong/ws';
import { goToRoute } from '../../spa';

let notifSocket: WebSocket | null = null;
let friendsManager: FriendsManager | null = null;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3 seconds

// Callback registry for relationship events
type RelationshipEventCallback = (event: { type: string; userId: string; status: string }) => void;
const relationshipEventCallbacks: Set<RelationshipEventCallback> = new Set();

export function setFriendsManager(manager: FriendsManager) {
  friendsManager = manager;
}

export function onRelationshipEvent(callback: RelationshipEventCallback): () => void {
  relationshipEventCallbacks.add(callback);
  // Return unsubscribe function
  return () => {
    relationshipEventCallbacks.delete(callback);
  };
}

function notifyRelationshipEvent(type: string, userId: string, status: string) {
  relationshipEventCallbacks.forEach(callback => {
    try {
      callback({ type, userId, status });
    } catch (err) {
      console.error('Error in relationship event callback:', err);
    }
  });
}

export function connectNotificationsWebSocket() {
  // Don't connect if already connecting or connected
  if (notifSocket && notifSocket.readyState === WebSocket.CONNECTING) {
    console.log('Notifications WebSocket connection already in progress');
    return;
  }

  if (notifSocket) {
    console.log('Notifications WebSocket already connected');
    return;
  };

  const wsUrl = `/notification/ws`;
  console.log('Connecting to notifications WebSocket at', wsUrl);
  notifSocket = new WebSocket(wsUrl);

  notifSocket.addEventListener('open', () => {
    console.log('Notifications WebSocket connected');
    connectionAttempts = 0; // Reset attempt counter on successful connection
		showInfoToast(t('toast.notifications.connected'), { duration: 2000 });
  });

  notifSocket.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      handleNotificationEvent(data);
    } catch (err) {
      console.error('Failed to parse notification WebSocket message:', err);
    }
  });

  notifSocket.addEventListener('close', () => {
    console.log('Notifications WebSocket closed');
    notifSocket = null;
    
    // Only attempt to reconnect if we haven't exceeded max attempts
    // and it wasn't a manual disconnect
    if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
      connectionAttempts++;
      console.log(`Attempting to reconnect (attempt ${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      setTimeout(() => {
        connectNotificationsWebSocket();
      }, RECONNECT_DELAY);
		} else {
			showWarningToast(t('toast.notifications.disconnected'), { duration: 2000 });
		}
  });

	notifSocket.addEventListener('error', (error) => {
		console.error('Notifications WebSocket error:', error);
		showErrorToast(t('toast.notifications.error'), { duration: 3000 });
		notifSocket = null;
	});
}

export function isNotificationsWebSocketConnected(): boolean {
  return notifSocket !== null && notifSocket.readyState === WebSocket.OPEN;
}

export function disconnectNotificationsWebSocket() 
{
  if (!notifSocket)
	return;
  console.log('Disconnecting from notifications WebSocket');
  connectionAttempts = 0; // Reset attempts on manual disconnect
  notifSocket.close();
  notifSocket = null;
}

function handleNotificationEvent(data: any) {
	console.log('Received notification event:', data);

	switch (data.event) {
		case 'friends.onlineList':
			{
				const count = data.data?.onlineFriends?.length || 0;
				console.log(`${count} online friends:`, data.data);
			}
			break;

		case 'friend.online':
			{
								const username = data.data?.username || t('toast.friend.someone');
								showInfoToast(t('toast.friend.online', { user: username }), { duration: 3000 });
			}
			break;

		case 'friend.offline':
			{
								const username = data.data?.username || t('toast.friend.someone');
								showInfoToast(t('toast.friend.offline', { user: username }), { duration: 3000 });
			}
			break;

		case 'friend.request':
			{
				console.log('[Notifications] friend.request data:', data);
				const username = data.data?.username || t('toast.friend.someone');
				let userId = data.data?.userId || data.data?.id || data.data?.requesterId || data.userId || data.id;
				console.log('[Notifications] Extracted userId:', userId, 'from data:', data.data);
            
				// Notify subscribers
				if (userId) {
					notifyRelationshipEvent('friend.request', userId, 'pending');
				}
            
				showWarningToast(t('toast.friend.request', { user: username }), { 
					duration: 0, // Keep toast until user acts
					actions: [
						{
							label: t('toast.action.accept'),
							style: 'primary',
							onClick: async () => {
								console.log('[Notifications] Accept button clicked');
								console.log('  - friendsManager:', !!friendsManager);
								console.log('  - userId:', userId);
								console.log('  - username:', username);
								console.log('  - Full data object:', data);
								if (!friendsManager) {
									showErrorToast(t('toast.error.friendsManagerNotInitialized'), { duration: 3000 });
									return;
								}
								if (!userId) {
									console.error('[Notifications] userId is missing. Available data:', data.data);
									showErrorToast(t('toast.error.userIdNotAvailable') + ': ' + JSON.stringify(data.data), { duration: 3000 });
									return;
								}
								try {
									console.log('[Notifications] Accepting friend request from:', userId);
									const result = await friendsManager.acceptFriendRequest(userId);
									console.log('[Notifications] Accept result:', result);
									if (result.success) {
										await friendsManager.loadFriends();
										await friendsManager.loadFriendRequests();

										// If server indicated the request was already gone (404), refresh profile if open
										if (result.status === 404) {
											try {
												if (window.location.pathname === '/profile') {
													const params = new URLSearchParams(window.location.search);
													const id = params.get('id');
													if (id === userId) {
														goToRoute('/profile?id=' + userId); // Refresh profile via SPA routing
													}
												}
											} catch (err) {
												console.error('Failed to refresh profile after accept returned 404:', err);
											}
										}
									} else {
										showErrorToast(t('toast.error.acceptFriendFailed'), { duration: 3000 });
									}
								} catch (err) {
									console.error('Error accepting friend request:', err);
									showErrorToast(t('toast.error.acceptFriendFailed'), { duration: 3000 });
								}
							}
						},
						{
							label: t('toast.action.reject'),
							style: 'secondary',
							onClick: async () => {
								console.log('[Notifications] Reject button clicked, friendsManager:', friendsManager, 'userId:', userId);
								if (!friendsManager) {
									showErrorToast(t('toast.error.friendsManagerNotInitialized'), { duration: 3000 });
									return;
								}
								if (!userId) {
									showErrorToast(t('toast.error.userIdNotAvailable'), { duration: 3000 });
									return;
								}
								try {
									console.log('[Notifications] Rejecting friend request from:', userId);
									const result = await friendsManager.rejectFriendRequest(userId);
									console.log('[Notifications] Reject result:', result);
									if (result) {
										showInfoToast(t('toast.info.rejectedFriendRequest', { user: username }), { duration: 3000 });
										await friendsManager.loadFriendRequests();
										try {
											if (window.location.pathname === '/profile') {
												const params = new URLSearchParams(window.location.search);
												const id = params.get('id');
												if (id === userId) {
													// Re-render the profile route to reflect the rejection
													goToRoute('/profile?id=' + userId); // Update profile via SPA routing
												}
											}
										} catch (err) {
											console.error('Failed to refresh profile after rejecting friend request:', err);
										}
									} else {
										showErrorToast(t('toast.error.rejectFriendFailed'), { duration: 3000 });
									}
								} catch (err) {
									console.error('Error rejecting friend request:', err);
									showErrorToast(t('toast.error.rejectFriendFailed'), { duration: 3000 });
								}
							}
						}
					]
				});
			}
			break;

		case 'friend.accept':
			{
				const username = data.data?.username || t('toast.friend.someone');
				const userId = data.data?.userId;
				
				// Notify subscribers
				if (userId) {
					notifyRelationshipEvent('friend.accept', userId, 'accepted');
				}
				
				showSuccessToast(t('toast.success.friendAccepted', { user: username }), { duration: 4000 });
				
				// Reload friends list if FriendsManager is available
				if (friendsManager) {
					friendsManager.loadFriends().catch(err => 
						console.error('Failed to reload friends:', err)
					);
				}
			}
			break;

		case 'friend.userAdded':
			{
				const username = data.data?.username || t('toast.friend.someone');
				const userId = data.data?.userId;
				
				// Notify subscribers
				if (userId) {
					notifyRelationshipEvent('friend.userAdded', userId, 'accepted');
				}
				
				showSuccessToast(t('toast.success.nowFriends', { user: username }), { duration: 4000 });
				
				// Reload both friends and requests if FriendsManager is available
				if (friendsManager) {
					Promise.all([
						friendsManager.loadFriends(),
						friendsManager.loadFriendRequests()
					]).catch(err => 
						console.error('Failed to reload friends data:', err)
					);
				}
			}
			break;

		case 'friend.rejected':
			{
				const username = data.data?.username || t('toast.friend.someone');
				const userId = data.data?.userId;
				
				// Notify subscribers
				if (userId) {
					notifyRelationshipEvent('friend.rejected', userId, 'rejected');
				}
				
				showInfoToast(t('toast.info.friendRejected', { user: username }), { duration: 4000 });
			}
			break;

		case 'friend.removed':
			{
				const username = data.data?.username || t('toast.friend.someone');
				const userId = data.data?.userId;
				
				// Notify subscribers
				if (userId) {
					notifyRelationshipEvent('friend.removed', userId, 'none');
				}
				
				showWarningToast(t('toast.warning.removedFriend', { user: username }), { duration: 4000 });
				
				// Reload friends list if FriendsManager is available
				if (friendsManager) {
					friendsManager.loadFriends().catch(err => 
						console.error('Failed to reload friends:', err)
					);
				}
			}
			break;

		case 'game.invite':
			{
				const username = data.data?.username || t('toast.friend.someone');
				const gameType = data.data?.gameType || 'tris';
				const gameId = data.data?.gameId || '';

				showWarningToast(t('toast.game.invite', { user: username, game: gameType }), { 
					duration: 0, // Keep toast until user acts
					actions: [
						{
							label: t('toast.action.accept'),
							style: 'primary',
							onClick: async () => {
								try {
									// If it's a tris game invite, open modal and join via WebSocket
									if (gameType === 'tris' && gameId) {
										// Import and call function to open tris modal and join game
										await openTrisModalAndJoinGame(gameId);
										// Note: Success feedback will come from handleCustomGameJoinSuccess event
									} else if (gameType === 'pong' && gameId) {
										// For pong, open the pong modal and join the custom game
										await openPongModal();
										joinCustomGame(gameId);
										showSuccessToast(t('toast.info.joinedPongGame'), { duration: 2000 });
									}
								} catch (err) {
									console.error('Error accepting game invite:', err);
									showErrorToast(t('toast.error.joinGameFailed'), { duration: 3000 });
								}
							}
						},
						{
							label: t('toast.action.reject'),
							style: 'secondary',
							onClick: async () => {
								try {
									// If it's a tris game, cancel via WebSocket
									if (gameType === 'tris' && gameId) {
										showInfoToast(t('toast.info.rejectedGameInvite', { user: username }), { duration: 3000 });
									} else if (gameType === 'pong' && gameId) {
										showInfoToast(t('toast.info.rejectedPongInvite', { user: username }), { duration: 3000 });
									}
								} catch (err) {
									console.error('Error rejecting game invite:', err);
									showErrorToast(t('toast.error.rejectInviteFailed'), { duration: 3000 });
								}
							}
						}
					]
				});
			}
			break;

		case 'game.started':
			{
				const gameId = data.data?.gameId || 'unknown';
				showInfoToast(t('toast.info.gameStarted', { id: gameId }), { duration: 3000 });
			}
			break;

		case 'game.ended':
			{
				const gameId = data.data?.gameId || 'unknown';
				const winner = data.data?.winner || 'Unknown';
				showInfoToast(t('toast.info.gameEnded', { id: gameId, winner }), { duration: 4000 });
			}
			break;

		case 'chat.message':
			{
				const sender = data.data?.sender || t('toast.friend.someone');
				const preview = data.data?.message?.substring(0, 30) || t('toast.chat.messagePreview');
				showInfoToast(t('toast.chat.notification', { sender, preview }), { duration: 4000 });
			}
			break;

		

		case 'pong':
			// Heartbeat - don't show toast, just log
			console.log('Pong received');
			break;

		case 'friend.nowFriends':
		case 'Now friend':
			{
				console.log('[Notifications] Now friend event:', data);
				const username = data.data?.username || t('toast.friend.someone');
				const userId = data.data?.userId || data.data?.id || data.userId || data.id;
				
				console.log('[Notifications] Now friends with:', username, 'userId:', userId);
				
				// Notify subscribers - both the requester and accepter should see accepted status
				if (userId) {
					notifyRelationshipEvent('friend.now', userId, 'accepted');
				}
				
				// Show success message
				showSuccessToast(t('toast.success.nowFriends', { user: username }), { duration: 4000 });
				
				// Reload friends list if FriendsManager is available
				if (friendsManager) {
					Promise.all([
						friendsManager.loadFriends(),
						friendsManager.loadFriendRequests()
					]).catch(err => 
						console.error('Failed to reload friends data:', err)
					);
				}
			}
			break;

		default:
			console.log('Unknown notification event:', data.event);
			showInfoToast(t('toast.notification.generic', { event: data.event }), { duration: 3000 });
	}
}