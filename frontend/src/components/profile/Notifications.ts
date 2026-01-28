import { showSuccessToast, showInfoToast, showWarningToast, showErrorToast } from '../shared/Toast';
import { FriendsManager } from './FriendsManager';
import { openTrisModalAndJoinGame } from '../../lib/tris-ui';

let notifSocket: WebSocket | null = null;
let friendsManager: FriendsManager | null = null;

export function setFriendsManager(manager: FriendsManager) {
  friendsManager = manager;
}

export function sendPing() {
  if (notifSocket) {
	const pingMessage = JSON.stringify({ event: 'ping' });
	notifSocket.send(pingMessage);
	console.log('Sent ping to notifications server');
  }
}

export function connectNotificationsWebSocket() {
  if (!notifSocket || notifSocket.readyState !== WebSocket.OPEN) 
	{
			// Determine API base (VITE_API_URL when built or injected at runtime) with safe fallbacks
			const apiBase = (((import.meta as any)?.env && (import.meta as any).env.VITE_API_URL) || (globalThis as any).__VITE_API_URL || '').replace(/\/+$/, '');
			let wsUrl: string;

				if (apiBase) {
					// Convert http(s) to ws(s) and target the gateway path for notifications
					if (/^https?:\/\//.test(apiBase)) {
						wsUrl = apiBase.replace(/^http/, 'ws').replace(/\/+$/, '') + '/notifications/ws';
					} else {
						// Unexpected format, fallback to origin using gateway-style path
						const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
						wsUrl = `${proto}://${window.location.host}/notifications/ws`;
					}
			} else {
					const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
					wsUrl = `${proto}://${window.location.host}/notifications/ws`;
			}

			console.log('Connecting to notifications WebSocket at', wsUrl);
			notifSocket = new WebSocket(wsUrl);

		notifSocket.addEventListener('open', () => {
			console.log('Notifications WebSocket connected');
		});

		notifSocket.addEventListener('message', (event) => {
			try {
				const data = JSON.parse(event.data);
				handleNotificationEvent(data);
			} catch (err) {
				console.error('Failed to parse notification WebSocket message:', err);
			}
		});

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
    // Send initial ping to establish connection
    sendPing();
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
				const username = data.data?.username || 'Someone';
				const userId = data.data?.userId;
				
				showWarningToast(`Friend request from ${username}`, { 
					duration: 0, // Keep toast until user acts
					actions: [
						{
							label: '✓ Accept',
							style: 'primary',
							onClick: async () => {
								if (friendsManager && userId) {
									try {
										await friendsManager.acceptFriendRequest(userId);
										showSuccessToast(`You accepted ${username}'s friend request`, { duration: 3000 });
										await friendsManager.loadFriends();
										await friendsManager.loadFriendRequests();
									} catch (err) {
										console.error('Error accepting friend request:', err);
										showErrorToast(`Failed to accept friend request`, { duration: 3000 });
									}
								}
							}
						},
						{
							label: '✕ Reject',
							style: 'secondary',
							onClick: async () => {
								if (friendsManager && userId) {
									try {
										await friendsManager.rejectFriendRequest(userId);
										showInfoToast(`You rejected ${username}'s friend request`, { duration: 3000 });
										await friendsManager.loadFriendRequests();
									} catch (err) {
										console.error('Error rejecting friend request:', err);
										showErrorToast(`Failed to reject friend request`, { duration: 3000 });
									}
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
				showInfoToast(`${username} rejected your friend request`, { duration: 4000 });
			}
			break;

		case 'friend.removed':
			{
				const username = data.data?.username || 'Someone';
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

		case 'achievement.unlocked':
			{
				const achievement = data.data?.achievement || 'Achievement';
				showSuccessToast(`🏆 ${achievement} unlocked!`, { duration: 4000 });
			}
			break;

		case 'pong':
			// Heartbeat - don't show toast, just log
			console.log('Pong received');
			break;

		default:
			console.log('Unknown notification event:', data.event);
			showInfoToast(`Notification: ${data.event}`, { duration: 3000 });
	}
}