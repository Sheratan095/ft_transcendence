let notifSocket: WebSocket | null = null;


export function connectNotificationsWebSocket() {
  if (!notifSocket || notifSocket.readyState !== WebSocket.OPEN) 
	{
		const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
		const wsUrl = `${protocol}://${window.location.host}/ws/notifications`;
		console.log('Connecting to notifications WebSocket at', wsUrl);
		notifSocket = new WebSocket(wsUrl);
	}
}