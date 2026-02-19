import { showSuccessToast, showInfoToast, showWarningToast, showErrorToast } from './Toast';
import { FriendsManager } from '../profile/FriendsManager';
import { openTrisModalAndJoinGame } from '../../lib/tris-ui';
import { openPongModal } from '../pong/modal';
import { joinCustomGame } from '../pong/ws';

let notifSocket: WebSocket | null = null;
let friendsManager: FriendsManager | null = null;

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

  if (notifSocket && notifSocket.readyState === WebSocket.OPEN) {
    console.log('Notifications WebSocket already connected');
    return;
  };

  const wsUrl = `/notification/ws`;
  console.log('Connecting to notifications WebSocket at', wsUrl);
  notifSocket = new WebSocket(wsUrl);

  notifSocket.addEventListener('open', () => {
    console.log('Notifications WebSocket connected');
    showInfoToast('Connected to notifications', { duration: 2000 });
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
    showWarningToast('Disconnected from notifications', { duration: 2000 });
    notifSocket = null;
  });

  notifSocket.addEventListener('error', (error) => {
    console.error('Notifications WebSocket error:', error);
    showErrorToast('Notification connection error', { duration: 3000 });
    notifSocket = null;
  });
}

export function disconnectNotificationsWebSocket() 
{
  if (!notifSocket)
	return;
  console.log('Disconnecting from notifications WebSocket');
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
				const username = data.data?.username || 'A friend';
				showInfoToast(`${username} is now online`, { duration: 3000 });
			}
			break;

		case 'friend.offline':
			{
				const username = data.data?.username || 'A friend';
				showInfoToast(`${username} is now offline`, { duration: 3000 });
			}
			break;

		case 'friend.request':
			{
				console.log('[Notifications] friend.request data:', data);
				const username = data.data?.username || 'Someone';
				let userId = data.data?.userId || data.data?.id || data.data?.requesterId || data.userId || data.id;
				console.log('[Notifications] Extracted userId:', userId, 'from data:', data.data);
				
				// Notify subscribers
				if (userId) {
					notifyRelationshipEvent('friend.request', userId, 'pending');
				}
				
				showWarningToast(`Friend request from ${username}`, { 
					duration: 0, // Keep toast until user acts
					actions: [
						{
							label: '✓ Accept',
							style: 'primary',
							onClick: async () => {
								console.log('[Notifications] Accept button clicked');
								console.log('  - friendsManager:', !!friendsManager);
								console.log('  - userId:', userId);
								console.log('  - username:', username);
								console.log('  - Full data object:', data);
								if (!friendsManager) {
									showErrorToast('Friends manager not initialized', { duration: 3000 });
									return;
								}
								if (!userId) {
									console.error('[Notifications] userId is missing. Available data:', data.data);
									showErrorToast('User ID not available. Data: ' + JSON.stringify(data.data), { duration: 3000 });
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
														window.location.href = '/profile?id=' + userId; // force full reload to sync
													}
												}
											} catch (err) {
												console.error('Failed to refresh profile after accept returned 404:', err);
											}
										}
									} else {
										showErrorToast(`Failed to accept friend request`, { duration: 3000 });
									}
								} catch (err) {
									console.error('Error accepting friend request:', err);
									showErrorToast(`Failed to accept friend request`, { duration: 3000 });
								}
							}
						},
						{
							label: '✕ Reject',
							style: 'secondary',
							onClick: async () => {
								console.log('[Notifications] Reject button clicked, friendsManager:', friendsManager, 'userId:', userId);
								if (!friendsManager) {
									showErrorToast('Friends manager not initialized', { duration: 3000 });
									return;
								}
								if (!userId) {
									showErrorToast('User ID not available', { duration: 3000 });
									return;
								}
								try {
									console.log('[Notifications] Rejecting friend request from:', userId);
									const result = await friendsManager.rejectFriendRequest(userId);
									console.log('[Notifications] Reject result:', result);
									if (result) {
										showInfoToast(`You rejected ${username}'s friend request`, { duration: 3000 });
										await friendsManager.loadFriendRequests();
										try {
											if (window.location.pathname === '/profile') {
												const params = new URLSearchParams(window.location.search);
												const id = params.get('id');
												if (id === userId) {
													// Re-render the profile route to reflect the rejection
													window.location.href = '/profile?id=' + userId; // Force reload to update profile state
												}
											}
										} catch (err) {
											console.error('Failed to refresh profile after rejecting friend request:', err);
										}
									} else {
										showErrorToast(`Failed to reject friend request`, { duration: 3000 });
									}
								} catch (err) {
									console.error('Error rejecting friend request:', err);
									showErrorToast(`Failed to reject friend request`, { duration: 3000 });
								}
							}
						}
					]
				});
			}
			break;

		case 'friend.accept':
			{
				const username = data.data?.username || 'A user';
				const userId = data.data?.userId;
				
				// Notify subscribers
				if (userId) {
					notifyRelationshipEvent('friend.accept', userId, 'accepted');
				}
				
				showSuccessToast(`${username} accepted your friend request!`, { duration: 4000 });
				
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
				const username = data.data?.username || 'Someone';
				const userId = data.data?.userId;
				
				// Notify subscribers
				if (userId) {
					notifyRelationshipEvent('friend.userAdded', userId, 'accepted');
				}
				
				showSuccessToast(`You are now friends with ${username}!`, { duration: 4000 });
				
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
				const username = data.data?.username || 'Someone';
				const userId = data.data?.userId;
				
				// Notify subscribers
				if (userId) {
					notifyRelationshipEvent('friend.rejected', userId, 'rejected');
				}
				
				showInfoToast(`${username} rejected your friend request`, { duration: 4000 });
			}
			break;

		case 'friend.removed':
			{
				const username = data.data?.username || 'Someone';
				const userId = data.data?.userId;
				
				// Notify subscribers
				if (userId) {
					notifyRelationshipEvent('friend.removed', userId, 'none');
				}
				
				showWarningToast(`${username} removed you as a friend`, { duration: 4000 });
				
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
				const username = data.data?.username || 'Someone';
				const gameType = data.data?.gameType || 'tris';
				const gameId = data.data?.gameId || '';

				showWarningToast(`${username} invited you to play ${gameType}`, { 
					duration: 0, // Keep toast until user acts
					actions: [
						{
							label: '✓ Accept',
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
										showSuccessToast('Joined pong game!', { duration: 2000 });
									}
								} catch (err) {
									console.error('Error accepting game invite:', err);
									showErrorToast(`Failed to join game`, { duration: 3000 });
								}
							}
						},
						{
							label: '✕ Reject',
							style: 'secondary',
							onClick: async () => {
								try {
									// If it's a tris game, cancel via WebSocket
									if (gameType === 'tris' && gameId) {
										showInfoToast(`You rejected ${username}'s invitation`, { duration: 3000 });
									} else if (gameType === 'pong' && gameId) {
										showInfoToast(`You rejected ${username}'s pong invitation`, { duration: 3000 });
									}
								} catch (err) {
									console.error('Error rejecting game invite:', err);
									showErrorToast(`Failed to reject invitation`, { duration: 3000 });
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
				showInfoToast(`Game ${gameId} has started`, { duration: 3000 });
			}
			break;

		case 'game.ended':
			{
				const gameId = data.data?.gameId || 'unknown';
				const winner = data.data?.winner || 'Unknown';
				showInfoToast(`Game ${gameId} ended. Winner: ${winner}`, { duration: 4000 });
			}
			break;

		case 'chat.message':
			{
				const sender = data.data?.sender || 'Someone';
				const preview = data.data?.message?.substring(0, 30) || 'sent you a message';
				showInfoToast(`${sender}: ${preview}...`, { duration: 4000 });
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
				const username = data.data?.username || 'A user';
				const userId = data.data?.userId || data.data?.id || data.userId || data.id;
				
				console.log('[Notifications] Now friends with:', username, 'userId:', userId);
				
				// Notify subscribers - both the requester and accepter should see accepted status
				if (userId) {
					notifyRelationshipEvent('friend.now', userId, 'accepted');
				}
				
				// Show success message
				showSuccessToast(`You are now friends with ${username}!`, { duration: 4000 });
				
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
			showInfoToast(`Notification: ${data.event}`, { duration: 3000 });
	}
}