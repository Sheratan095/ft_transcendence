/**
 * Base class for input controllers
 */
class InputController
{
	enabled: boolean = false;

	getMovement(): string | null
	{
		throw new Error("getMovement() must be implemented");
	}

	destroy(): void
	{
		// Override if cleanup is needed
	}
}

/**
 * Local keyboard input controller
 */
export class LocalInputController extends InputController
{
	upKeys: string[];
	downKeys: string[];
	inputMap: Record<string, boolean>;
	onKeyDown: ((evt: KeyboardEvent) => void) | null = null;
	onKeyUp: ((evt: KeyboardEvent) => void) | null = null;

	constructor(upKeys: string | string[], downKeys: string | string[])
	{
		super();
		this.upKeys = Array.isArray(upKeys) ? upKeys : [upKeys];
		this.downKeys = Array.isArray(downKeys) ? downKeys : [downKeys];
		this.inputMap = {};
		this.setupListeners();
  }

	setupListeners(): void
	{
		this.onKeyDown = (evt) => {
			this.inputMap[evt.key] = true;
		};

		this.onKeyUp = (evt) => {
			this.inputMap[evt.key] = false;
		};

		window.addEventListener("keydown", this.onKeyDown);
		window.addEventListener("keyup", this.onKeyUp);
	}

	getMovement(): string | null
	{
		if (!this.enabled)
			return (null);

		const upPressed = this.upKeys.some(key => this.inputMap[key] || 
						(key.toLowerCase() === "w" && this.inputMap["W"]) ||
						(key.toLowerCase() === "s" && this.inputMap["S"]));
		const downPressed = this.downKeys.some(key => this.inputMap[key] ||
							(key.toLowerCase() === "w" && this.inputMap["W"]) ||
							(key.toLowerCase() === "s" && this.inputMap["S"]));

		if (upPressed)
			return ("up");
		if (downPressed)
			return ("down");

		return (null);
	}

	isAnyKeyPressed(): boolean
	{
		return (this.getMovement() !== null);
	}

	destroy(): void
	{
		if (this.onKeyDown)
			window.removeEventListener("keydown", this.onKeyDown);
		if (this.onKeyUp)
			window.removeEventListener("keyup", this.onKeyUp);
	}
}

export class AIController extends InputController
{
	gameState: any;
	playerId: string;
	difficulty: string;
	params: any;

	constructor(gameState: any, playerId: string, difficulty: string = "medium")
	{
		super();
		this.gameState = gameState;
		this.playerId = playerId;
		this.difficulty = difficulty;
		
		// AI parameters based on difficulty
		this.params = this.getDifficultyParams(difficulty);
  }

	getDifficultyParams(difficulty: string): any
	{
		const params =
		{
		easy: {
			reactionDelay: 0.15, // React slower
			errorMargin: 0.1, // More error in positioning
			trackingSpeed: 0.7, // Move slower
			predictionDepth: 0, // Don't predict ball trajectory
		},
		medium: {
			reactionDelay: 0.08,
			errorMargin: 0.05,
			trackingSpeed: 0.85,
			predictionDepth: 0.2,
		},
		hard: {
			reactionDelay: 0.03,
			errorMargin: 0.02,
			trackingSpeed: 1.0,
			predictionDepth: 0.5,
		},
		impossible: {
			reactionDelay: 0,
			errorMargin: 0,
			trackingSpeed: 1.0,
			predictionDepth: 1.0,
		},
		};

		return params[difficulty] || params.medium;
	}

	/**
	 * Predict where the ball will be when it reaches the paddle
	 * @returns {number} Predicted Y position (0-1)
	 */
	predictBallPosition(): number
	{
		const ball = this.gameState.ball;
		const paddle = this.gameState.paddles[this.playerId];
		
		// Simple prediction: extrapolate ball trajectory
		const distanceX = Math.abs(ball.x - paddle.x);
		const timeToReach = ball.vx !== 0 ? distanceX / Math.abs(ball.vx) : Infinity;
		
		// Predict Y position with some depth
		const predictionTime = timeToReach * this.params.predictionDepth;
		let predictedY = ball.y + ball.vy * predictionTime;
		
		// Account for wall bounces (simplified)
		while (predictedY < 0 || predictedY > 1)
		{
			if (predictedY < 0)
				predictedY = -predictedY;
			if (predictedY > 1)
				predictedY = 2 - predictedY;
		}
		
		// Add error margin for realism
		const error = (Math.random() - 0.5) * this.params.errorMargin;
		predictedY += error;
		
		return Math.max(0, Math.min(1, predictedY));
	}

	/**
	 * Get AI movement decision
	 * @returns {string|null} 'up', 'down', or null
	 */
	getMovement(): string | null
	{
		if (!this.enabled)
			return null;

		const ball = this.gameState.ball;
		const paddle = this.gameState.paddles[this.playerId];
		
		// Check if ball is moving towards AI paddle
		const movingTowardsAI = (paddle.x === 0 && ball.vx < 0) || (paddle.x === 1 && ball.vx > 0);
		
		// Only react if ball is moving towards AI or already close
		const distanceX = Math.abs(ball.x - paddle.x);
		const shouldReact = movingTowardsAI || distanceX < 0.3;
		
		if (!shouldReact)
		{
			// Return to center when ball is not approaching
			const paddleCenter = paddle.y + paddle.height / 2;
			if (Math.abs(paddleCenter - 0.5) < 0.02)
				return null;

			return paddleCenter < 0.5 ? "down" : "up";
		}
		
		// Get target Y position (either predicted or current ball position)
		const targetY = this.params.predictionDepth > 0 ? this.predictBallPosition() : ball.y;
		
		// Calculate paddle center
		const paddleCenter = paddle.y + paddle.height / 2;
		const diff = targetY - paddleCenter;
		
		// Dead zone to prevent jittering
		const deadZone = 0.01;
		if (Math.abs(diff) < deadZone)
			return null;
		
		// Move towards target with tracking speed consideration
		if (Math.random() > this.params.trackingSpeed)
			return null; // Sometimes don't move (simulates slower reaction)
		
		return diff > 0 ? "down" : "up";
	}

	/**
	 * Update AI difficulty
	 * @param {string} difficulty - New difficulty level
	 */
	setDifficulty(difficulty: string): void
	{
		this.difficulty = difficulty;
		this.params = this.getDifficultyParams(difficulty);
	}
}

/**
 * Network input controller for online multiplayer
 */
export class NetworkInputController extends InputController
{
	websocket: any;
	lastMovement: string | null;
	serverGameState: any;

	constructor(websocket: any)
	{
		super();
		this.websocket = websocket;
		this.lastMovement = null;
		this.setupWebSocket();
	}

	setupWebSocket(): void
	{
		if (!this.websocket)
			return;

		this.websocket.on("opponent_move", (data) => {
		this.lastMovement = data.movement; // 'up', 'down', or null
		});

		this.websocket.on("game_state", (data) => {
		// Receive full game state from server
		this.serverGameState = data;
		});
	}

	getMovement(): string | null
	{
		return this.lastMovement;
	}

	/**
	 * Send local player movement to server
	 * @param {string|null} movement - 'up', 'down', or null
	 */
	sendMovement(movement: string | null): void
	{
		if (this.websocket && this.websocket.connected)
			this.websocket.emit("player_move", { movement });
	}

	/**
	 * Set server-authoritative game state (called externally)
	 * @param {object} state - Server game state
	 */
	setServerGameState(state: any): void
	{
		this.serverGameState = state;
	}

	/**
	 * Get server-authoritative game state (if available)
	 * Consumes the state (clears it after reading) to prevent re-applying old data
	 * @returns {object|null} Server game state
	 */
	getServerGameState(): any
	{
		const state = this.serverGameState;
		this.serverGameState = null; // Clear after reading
		return state;
	}

	destroy(): void
	{
		if (this.websocket)
		{
			this.websocket.off("opponent_move");
			this.websocket.off("game_state");
		}
	}
}

export default InputController;
