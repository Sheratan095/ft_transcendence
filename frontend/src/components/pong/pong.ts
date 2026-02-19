/**
 * Pong Main Entry Point
 * Re-exports all public APIs
 */

// WebSocket & Commands
export {
	initPong,
	closePong,
	isPongConnected,
	getCurrentGameId,
	getPlayerSide,
	startMatchmaking,
	leaveMatchmaking,
	createCustomGame,
	joinCustomGame,
	cancelCustomGame,
	quitGame,
	setReady,
	startPaddleMove,
	stopPaddleMove,
	sendGameInvite,
	acceptGameInvite,
	declineGameInvite
} from './ws';

// Modal
export {
	openPongModal,
	closePongModal,
	setupPongCardListener
} from './modal';

// Game Manager
export { GameManager, GAME_MODES } from './GameManager';

// 3D Renderer
export { PongGame, WORLD_BOUNDS } from './game/3d';

// Game Logic
export * as Physics from './game/physics';
export { LocalInputController, AIController, NetworkInputController } from './game/InputController';
