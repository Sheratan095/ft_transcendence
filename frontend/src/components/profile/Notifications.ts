import { showSuccessToast, showInfoToast, showWarningToast } from '../shared/Toast';
import { FriendsManager } from './FriendsManager';

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
		const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
		const wsUrl = `${protocol}://${window.location.host}/ws/notification`;
		console.log('Connecting to notifications WebSocket at', wsUrl);
		notifSocket = new WebSocket(wsUrl);

		notifSocket.addEventListener('open', () => {
			console.log('Notifications WebSocket connected');
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
		});

		notifSocket.addEventListener('error', (error) => {
			console.error('Notifications WebSocket error:', error);
		});
	}
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
			console.log('Online friends list:', data.data);
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
				const requesterId = data.data?.requesterId;
				showWarningToast(`Friend request from ${username}`, { duration: 5000 });
				
				// Load friend requests if FriendsManager is available
				if (friendsManager) {
					friendsManager.loadFriendRequests().catch(err => 
						console.error('Failed to reload friend requests:', err)
					);
				}
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

		case 'game.invite':
			{
				const username = data.data?.username || 'Someone';
				const game = data.data?.game || 'a game';
				showWarningToast(`${username} invited you to play ${game}`, { duration: 5000 });
			}
			break;

		case 'pong':
			console.log('Pong received');
			break;

		default:
			console.log('Unknown notification event:', data.event);
	}
}