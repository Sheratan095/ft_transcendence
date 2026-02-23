/**
 * Tris Main Entry Point
 * Re-exports public API to follow the same pattern as Pong
 */

// WebSocket & Network Commands
export {
	initTris,
	closeTris,
	isTrisConnected,
	createCustomGame,
	joinCustomGame,
	cancelCustomGame,
	setUserReady,
	quitGame,
	startMatchmaking,
	stopMatchmaking,
	getCurrentGameId,
	setCurrentGameId,
	setTrisEventCallback
} from './ws';

// Modal & UI
export {
	openTrisModal,
	closeTrisModal,
	openTrisModeModal,
	closeTrisModeModal,
	getSelectedTrisMode,
	initializeModeSpecificBehaviors,
	resetLocalGame
} from './modal';

// Menu & Page Page
export { renderTrisPage } from './TrisMenù';

// Game Manager & Mode
export { GameManager, TRIS_MODES } from './GameManager';

// Board Logic
export * as Physics from './game/physics';
export { BoardRenderer } from './game/ui';
export { LocalInputController, AIController, NetworkInputController } from './game/InputController';
