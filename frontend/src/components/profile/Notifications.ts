import { showSuccessToast, showInfoToast, showWarningToast } from '../shared/Toast';

let notifSocket: WebSocket | null = null;


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
				showWarningToast(`Friend request from ${username}`, { duration: 5000 });
			}
			break;

		case 'friend.accept':
			{
				const username = data.data?.username || 'A user';
				showSuccessToast(`${username} accepted your friend request!`, { duration: 4000 });
			}
			break;

		case 'friend.userAdded':
			{
				const username = data.data?.username || 'Someone';
				showSuccessToast(`You are now friends with ${username}!`, { duration: 4000 });
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


export function sendPing() {
  if (notifSocket && notifSocket.readyState === WebSocket.OPEN) {
	const pingMessage = JSON.stringify({ event: 'ping' });
	notifSocket.send(pingMessage);
	console.log('Sent ping to notifications server');
  }
}