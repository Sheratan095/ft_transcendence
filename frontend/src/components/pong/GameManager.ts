import * as Physics from "./game/physics.ts";
import { LocalInputController, AIController, NetworkInputController } from "./game/InputController.ts";

/**
 * Game modes enum
 */
export const GAME_MODES =
{
	LOCAL_MULTIPLAYER: "local_multiplayer", // 2 players, same keyboard
	LOCAL_VS_AI: "local_vs_ai", // Player vs AI
	ONLINE: "online", // Player vs Remote player
};

/**
 * Game Manager - handles game logic, physics, and input for all game modes
 */
export class GameManager
{
	mode: string;
	config: any;
	gameState: any;
	targetBall: any;
	targetPaddles: any;
	interpolationSpeed: number;
	leftInputController: any;
	rightInputController: any;
	networkController: any;
	localPlayerId: string;
	onGoal?: (scorer: string, scores: any) => void;
	onGameOver?: (winner: string) => void;
	onBallActivate?: () => void;

	constructor(mode: string, config: any = {})
	{
		this.mode = mode;
		this.config =
		{
			maxScore: config.maxScore || parseInt(import.meta.env.VITE_MAX_SCORE) || 5,
			aiDifficulty: config.aiDifficulty || import.meta.env.VITE_AI_DEFAULT_DIFFICULTY || "medium",
			cooldownTime: config.cooldownTime || parseInt(import.meta.env.VITE_COOLDOWN_BETWEEN_POINTS_MS) || 3000,
			websocket: config.websocket || null,
			playerNames: config.playerNames || { left: "Player 1", right: "Player 2" },
			...config,
		};

		// Initialize game state using physics engine
		this.gameState = Physics.initGameState("left", "right");
		this.gameState.playerNames = this.config.playerNames;
		this.gameState.maxScore = this.config.maxScore;
		this.gameState.gameOver = false;
		this.gameState.winner = null;
		this.gameState.isCooldown = false;
		this.gameState.cooldownTimer = 0;

		// For interpolation in online mode
		this.targetBall = { x: this.gameState.ball.x, y: this.gameState.ball.y };
		this.targetPaddles = {
			left: { y: this.gameState.paddles.left.y },
			right: { y: this.gameState.paddles.right.y }
		};
		this.interpolationSpeed = 0.2; // Adjust for smoothness

		// Input controllers
		this.leftInputController = null;
		this.rightInputController = null;

		// For network mode
		this.networkController = null;
		this.localPlayerId = config.localPlayerId || "left";

		// Initialize based on mode
		this.initializeMode();
	}

	/**
	 * Initialize input controllers based on game mode
	 */
	initializeMode(): void
	{
		switch (this.mode)
		{
			case GAME_MODES.LOCAL_MULTIPLAYER:
				// Left player: W/S, Right player: Arrow keys
				this.leftInputController = new LocalInputController("w", "s");
				this.rightInputController = new LocalInputController("ArrowUp", "ArrowDown");
				break;

			case GAME_MODES.LOCAL_VS_AI:
			// Player controls left paddle, AI controls right
			this.leftInputController = new LocalInputController(["ArrowUp", "w"], ["ArrowDown", "s"]);
			this.rightInputController = new AIController(
				this.gameState,
				"right",
				this.config.aiDifficulty
			);
			break;

			case GAME_MODES.ONLINE:
				// Local player and network opponent
				this.networkController = new NetworkInputController(this.config.websocket);
				
				if (this.localPlayerId === "left")
				{
					this.leftInputController = new LocalInputController("ArrowUp", "ArrowDown");
					this.rightInputController = this.networkController;
				}
				else
				{
					this.leftInputController = this.networkController;
					this.rightInputController = new LocalInputController("ArrowUp", "ArrowDown");
				}

				break;

			default:
				console.error(`[GameManager] Unknown game mode: ${this.mode}`);
		}
	}

	/**
	 * Main update loop - call this every frame
	 * @param {number} deltaTime - Time delta (default 1 for 60fps)
	 */
	update(deltaTime: number = 1): void
	{
		if (this.gameState.gameOver)
			return;

		// Handle cooldown between points
		if (this.gameState.isCooldown) {
			// Convert ms to roughly frames (assuming 60fps if deltaTime=1)
			// deltaTime is usually constant in this simple implementation
			this.gameState.cooldownTimer -= deltaTime * (1000 / 60); 
			if (this.gameState.cooldownTimer <= 0) {
				this.gameState.isCooldown = false;
				this.gameState.ball.active = true;
			}
			return;
		}

		// Get input from both controllers
		const leftMovement = this.leftInputController?.getMovement();
		const rightMovement = this.rightInputController?.getMovement();

		// For online mode, server is authoritative - NO LOCAL PHYSICS
		if (this.mode === GAME_MODES.ONLINE && this.networkController)
		{
			// 1. Send movement to server
			const localMovement = this.localPlayerId === "left" ? leftMovement : rightMovement;
			this.networkController.sendMovement(localMovement);

			// 2. Apply server state if available
			const serverState = this.networkController.getServerGameState();
			if (serverState)
			{
				// Set targets for interpolation
				if (serverState.ball) {
					this.targetBall.x = serverState.ball.x;
					this.targetBall.y = serverState.ball.y;
				}
				
				// Map server paddles to client paddles based on X position
				if (serverState.paddles)
				{
					for (const paddle of Object.values(serverState.paddles) as any[])
					{
						if (paddle.x === 0 || paddle.x < 0.5)
						{
							this.targetPaddles.left.y = paddle.y;
						}
						else
						{
							this.targetPaddles.right.y = paddle.y;
						}
					}
				}
				
				// Update scores
				if (serverState.scores)
				{
					let scoreChanged = false;

					for (const [id, score] of Object.entries(serverState.scores) as [string, number][])
					{
						// Map score to side based on paddle position in the SAME serverState
						const paddle = serverState.paddles ? serverState.paddles[id] : null;
						if (paddle)
						{
							const side = (paddle.x === 0 || paddle.x < 0.5) ? "left" : "right";
							if (this.gameState.scores[side] !== score)
							{
								this.gameState.scores[side] = score;
								scoreChanged = true;
							}
						}
					}

					if (scoreChanged && this.onGoal)
					{
						this.onGoal("", this.gameState.scores);
					}
				}
			}
			
			// Interpolate positions for smooth movement
			this.interpolatePositions(deltaTime);
			
			// 3. EXIT - Do not run local physics simulation
			return;
		}

		// Update paddle positions (Local / AI modes only)
		if (leftMovement)
		{
			this.gameState.paddles.left.y = Physics.movePaddle(this.gameState.paddles.left.y, leftMovement);
		
			// Activate ball on first movement
			if (!this.gameState.ball.active)
				this.gameState.ball.active = true;
		}

		if (rightMovement)
		{
			this.gameState.paddles.right.y = Physics.movePaddle(this.gameState.paddles.right.y, rightMovement);
		
			// Activate ball on first movement
			if (!this.gameState.ball.active)
				this.gameState.ball.active = true;
		}

		// Update ball position if active
		if (this.gameState.ball.active)
			Physics.updateBallPosition(this.gameState.ball, deltaTime);

		// Check wall collisions (top/bottom)
		const ball = this.gameState.ball;
		if (ball.y <= ball.radius || ball.y >= 1 - ball.radius)
			Physics.elaborateWallCollision(ball);

		// Check paddle collisions
		const leftPaddle = this.gameState.paddles.left;
		const rightPaddle = this.gameState.paddles.right;

		// Left paddle collision
		if (ball.vx < 0 && Physics.checkPaddleCollision(ball, leftPaddle))
			Physics.elaboratePaddleCollision(ball, leftPaddle, 1); // Bounce right

		// Right paddle collision
		if (ball.vx > 0 && Physics.checkPaddleCollision(ball, rightPaddle))
			Physics.elaboratePaddleCollision(ball, rightPaddle, -1); // Bounce left

		// Check for goals
		const goal = Physics.checkGoal(ball);
		if (goal)
			this.handleGoal(goal);
	}

	/**
	 * Set scores manually (e.g. from server)
	 * @param {number} left - Left score
	 * @param {number} right - Right score
	 */
	setScores(left: number, right: number): void
	{
		this.gameState.scores.left = left;
		this.gameState.scores.right = right;
		if (this.onGoal)
			this.onGoal("", this.gameState.scores);
	}

	/**
	 * Set player names
	 */
	setPlayerNames(left: string, right: string): void
	{
		this.gameState.playerNames = { left, right };
	}

	/**
	 * Handle goal scoring
	 * @param {string} scorer - 'left' or 'right'
	 */
	handleGoal(scorer: string): void
	{
		// Update score
		this.gameState.scores[scorer]++;

		// Reset ball towards the player who got scored on
		const ballDirection = scorer === "left" ? 1 : -1;
		Physics.resetBall(this.gameState.ball, ballDirection);
		this.gameState.ball.active = false; // Stop ball for cooldown

		// Reset paddles to center
		this.gameState.paddles.left.y = 0.5 - this.gameState.paddles.left.height / 2;
		this.gameState.paddles.right.y = 0.5 - this.gameState.paddles.right.height / 2;

		// Check for game over
		if (this.gameState.scores[scorer] >= this.config.maxScore)
		{
			this.gameState.gameOver = true;
			this.gameState.winner = scorer;
			if (this.onGameOver)
				this.onGameOver(scorer);
		}
		else 
		{
			// Start cooldown
			this.gameState.isCooldown = true;
			this.gameState.cooldownTimer = this.config.cooldownTime;
		}

		// Callback for goal event
		if (this.onGoal)
			this.onGoal(scorer, this.gameState.scores);
	}

	/**
	 * Called when game is over
	 * @param {string} winner - 'left' or 'right'
	 */

	/**
	 * Set event callbacks
	 * @param {object} callbacks - Object with callback functions
	 */
	setCallbacks(callbacks: any): void 
	{
		if (callbacks.onGoal)
			this.onGoal = callbacks.onGoal;
		if (callbacks.onGameOver)
			this.onGameOver = callbacks.onGameOver;
		if (callbacks.onBallActivate)
			this.onBallActivate = callbacks.onBallActivate;
	}

/**
 * Get current game state (for rendering)
 * @returns {object} Current game state
 */
getGameState(): any
{
	return this.gameState;
}

/**
 * Get normalized coordinates converted to world coordinates
 * @param {number} minX - Min X in world coordinates
 * @param {number} maxX - Max X in world coordinates
 * @param {number} minZ - Min Z in world coordinates
 * @param {number} maxZ - Max Z in world coordinates
 * @returns {object} World coordinates for rendering
 */
getWorldCoordinates(minX: number, maxX: number, minZ: number, maxZ: number): any
{
	const ball = this.gameState.ball;
	const leftPaddle = this.gameState.paddles.left;
	const rightPaddle = this.gameState.paddles.right;

	// Convert normalized (0-1) to world coordinates
	// X: 0 -> minX, 1 -> maxX
	// Y (which is Z in 3D): 0 -> maxZ (top), 1 -> minZ (bottom) - INVERTED for 3D coordinates
	return {
		ball:
		{
			x: minX + ball.x * (maxX - minX),
			z: maxZ - ball.y * (maxZ - minZ),  // Inverted: 0 maps to maxZ, 1 maps to minZ
		},
		paddles: 
		{
			left:
			{
				x: minX,
				z: maxZ - (leftPaddle.y + leftPaddle.height / 2) * (maxZ - minZ),  // Inverted
			},
			right:
			{
				x: maxX,
				z: maxZ - (rightPaddle.y + rightPaddle.height / 2) * (maxZ - minZ),  // Inverted
			},
		},
		scores: this.gameState.scores,
		gameOver: this.gameState.gameOver,
		winner: this.gameState.winner,
	};
}

	/**
	 * Reset game to initial state
	 */
	reset(): void
	{
		this.gameState = Physics.initGameState("left", "right");
		this.gameState.playerNames = this.config.playerNames;
		this.gameState.maxScore = this.config.maxScore;
		this.gameState.gameOver = false;
		this.gameState.winner = null;
		this.gameState.ball.active = false;
	}

	/**
	 * Change game mode (reinitializes controllers)
	 * @param {string} newMode - New game mode
	 * @param {object} newConfig - New configuration
	 */
	changeMode(newMode: string, newConfig: any = {}): void
	{
		this.destroy();
		this.mode = newMode;
		this.config = { ...this.config, ...newConfig };
		this.reset();
		this.initializeMode();
	}

	/**
	 * Interpolate positions towards targets for smooth movement in online mode
	 * @param {number} deltaTime
	 */
	interpolatePositions(deltaTime: number): void
	{
		const lerp = (current, target, speed) => current + (target - current) * speed * deltaTime;

		// Interpolate ball
		this.gameState.ball.x = lerp(this.gameState.ball.x, this.targetBall.x, this.interpolationSpeed);
		this.gameState.ball.y = lerp(this.gameState.ball.y, this.targetBall.y, this.interpolationSpeed);

		// Interpolate paddles
		this.gameState.paddles.left.y = lerp(this.gameState.paddles.left.y, this.targetPaddles.left.y, this.interpolationSpeed);
		this.gameState.paddles.right.y = lerp(this.gameState.paddles.right.y, this.targetPaddles.right.y, this.interpolationSpeed);
	}

	/**
	 * Clean up resources
	 */
	/**
	 * Enable input for offline modes (local 1v1 and AI)
	 */
	enableOfflineInput(): void
	{
		if (this.leftInputController && typeof this.leftInputController.enabled !== 'undefined')
		{
			this.leftInputController.enabled = true;
		}
		if (this.rightInputController && typeof this.rightInputController.enabled !== 'undefined')
		{
			this.rightInputController.enabled = true;
		}
	}

	/**
	 * Activate the ball immediately
	 */
	activateBall(): void
	{
		this.gameState.ball.active = true;
	}

	destroy(): void
	{
		if (this.leftInputController?.destroy)
			this.leftInputController.destroy();
		if (this.rightInputController?.destroy)
			this.rightInputController.destroy();
		if (this.networkController?.destroy)
			this.networkController.destroy();
	}
}

export default GameManager;
