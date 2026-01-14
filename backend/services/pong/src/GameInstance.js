import { gameManager } from './GameManager.js';
import { pongConnectionManager } from './PongConnectionManager.js';
import { initGameState, movePaddle, elaboratePaddleCollision, elaborateWallCollision, calculateBallPosition } from './pong-physics.js';

export const	GameStatus =
{
	WAITING: 'WAITING', // Just for custom games, waiting for opponent to join
	IN_LOBBY: 'IN_LOBBY',
	IN_PROGRESS: 'IN_PROGRESS',
	FINISHED: 'FINISHED',
};

export const	GameType =
{
	CUSTOM: 'CUSTOM',
	RANDOM: 'RANDOM',
};

export class	GameInstance
{
	// By defaualt, the left player is the creator
	constructor(id, playerLeftId, playerRightId, playerLeftUsername, playerRightUsername, type)
	{
		this.id = id;

		this.playerLeftId = playerLeftId;
		this.playerRightId = playerRightId;

		this.playerLeftUsername = playerLeftUsername;
		this.playerRightUsername = playerRightUsername;

		this.playerLeftReady = false;
		this.playerRightReady = false;

		// CUSTOM GAMES start in WAITING, RANDOM GAMES start in LOBBY because both players are known
		this.gameStatus = type === GameType.CUSTOM ? GameStatus.WAITING : GameStatus.IN_LOBBY;
		this.gameType = type;

		this.type = type;

		this.scores =
		{
			[playerLeftId]: 0,
			[playerRightId]: 0,
		};

		// Game physics state
		this.gameState = initGameState(playerLeftId, playerRightId);

		// Game constants
		this.CANVAS_WIDTH = 1;
		this.CANVAS_HEIGHT = 1;
		this.WINNING_SCORE = parseInt(process.env.WIN_TARGET_POINTS);
		this.PADDLE_SPEED = parseFloat(process.env.PADDLE_SPEED);
		this.BALL_RADIUS = parseFloat(process.env.BALL_RADIUS);

		// Game loop control
		this.gameLoop = null;
		this.lastUpdateTime = Date.now();
		this.frameRate = 60; // 60 FPS
		this.frameInterval = 1000 / this.frameRate;
	}

	startGame()
	{
		this.gameStatus = GameStatus.IN_PROGRESS;
		this._startGameLoop();
	}

	processMove(playerId, direction)
	{
		const	paddle = this.gameState.paddles[playerId];
		if (!paddle)
			return;

		const	newY = movePaddle(paddle.y, direction);
		if (newY === null)
			return;
		
		paddle.y = newY;

		// Broadcast paddle position to both players
		this._broadcastPaddleMove(playerId, paddle.y);
	}

	hasPlayer(playerId)
	{
		return (this.playerLeftId === playerId || this.playerRightId === playerId);
	}

	// Game loop methods
	_startGameLoop()
	{
		// Clear any existing game loop, in case of restart/pause
		if (this.gameLoop)
			clearInterval(this.gameLoop);

		this._timerBeforeBallMove();

		// Every frameInterval milliseconds, update the game state
		this.gameLoop = setInterval(() =>
		{
			this._updateGameState();
		}, this.frameInterval);
	}

	stopGameLoop()
	{
		// Clear the game loop interval
		if (this.gameLoop)
		{
			clearInterval(this.gameLoop);
			this.gameLoop = null;
		}
	}

	_updateGameState()
	{
		// If the game is not in progress, stop the loop
		if (this.gameStatus !== GameStatus.IN_PROGRESS)
		{
			this.stopGameLoop();
			return;
		}

		// Retrieve delta time since last update
		const	now = Date.now();
		const	deltaTime = (now - this.lastUpdateTime) / 1000; // Convert to seconds
		this.lastUpdateTime = now;

		// Update ball position
		this._updateBallPosition(deltaTime);

		// Check collisions
		this._checkCollisions();

		// Check for scoring
		this._checkScoring();

		// Broadcast game state every few frames (reduce network traffic)
		//	now its EVERY 2 FRAMES
		if (Math.floor(now / this.frameInterval) % 2 === 0)
		{
			this._broadcastGameState();
			// console.log(this.gameState.ball);	
		}
	}

	_updateBallPosition(deltaTime)
	{
		let	ball = this.gameState.ball;

		// Update ball position directly with velocity
		ball.x += ball.vx * deltaTime;
		ball.y += ball.vy * deltaTime;

		// Ball collision with top and bottom walls
		if (ball.y <= this.BALL_RADIUS || ball.y >= this.CANVAS_HEIGHT - this.BALL_RADIUS)
			elaborateWallCollision(ball);
	}

	_checkCollisions()
	{
		let		ball = this.gameState.ball;
		const	leftPaddle = this.gameState.paddles[this.playerLeftId];
		const	rightPaddle = this.gameState.paddles[this.playerRightId];

		// Left paddle collision
		if (ball.x <= leftPaddle.x + this.BALL_RADIUS &&
			ball.y >= leftPaddle.y &&
			ball.y <= leftPaddle.y + leftPaddle.height &&
			ball.vx < 0)
		{
			ball = elaboratePaddleCollision(ball, leftPaddle, +1);
		}

		// Right paddle collision
		if (ball.x >= rightPaddle.x - this.BALL_RADIUS &&
			ball.y >= rightPaddle.y &&
			ball.y <= rightPaddle.y + rightPaddle.height &&
			ball.vx > 0)
		{
			ball = elaboratePaddleCollision(ball, rightPaddle, -1);
		}

	}

	_checkScoring()
	{
		const	ball = this.gameState.ball;

		// Left player scores (ball went past right paddle)
		if (ball.x > this.CANVAS_WIDTH)
		{
			this.scores[this.playerLeftId]++;
			this._broadcastScore(this.playerLeftId);
			this._resetGameState();
			
			if (this.scores[this.playerLeftId] >= this.WINNING_SCORE)
				this._endGame(this.playerLeftId);
		}
		// Right player scores (ball went past left paddle)
		else if (ball.x < 0)
		{
			this.scores[this.playerRightId]++;
			this._broadcastScore(this.playerRightId);
			this._resetGameState();
			
			if (this.scores[this.playerRightId] >= this.WINNING_SCORE)
				this._endGame(this.playerRightId);
		}
	}

	_resetGameState()
	{
		this.gameState = initGameState(this.playerLeftId, this.playerRightId);

		this._timerBeforeBallMove();
	}

	_timerBeforeBallMove()
	{
		// Update once to set ball position
		this._updateGameState();
		this._updateGameState();
		this._updateGameState();

		// Small delay before restarting next point
		this.stopGameLoop();

		setTimeout(() => {
			this.lastUpdateTime = Date.now();
			this._startGameLoop();
		}, parseInt(process.env.COLLDOWN_BETWEEN_POINTS_MS));
	}

	_endGame(winnerId)
	{
		this.gameStatus = GameStatus.FINISHED;
		this.stopGameLoop();

		const	loserId = winnerId === this.playerLeftId ? this.playerRightId : this.playerLeftId;
		const	winnerUsername = winnerId === this.playerLeftId ? this.playerLeftUsername : this.playerRightUsername;
		
		gameManager._gameEnd(this, winnerId, loserId, winnerUsername, false);
		
		console.log(`[PONG] Game ${this.id} ended. Winner: ${winnerUsername}`);
	}

	_broadcastGameState()
	{
		const	gameStateData =
		{
			gameId: this.id,
			ball: this.gameState.ball,
			paddles: this.gameState.paddles,
			scores: this.scores
		};

		pongConnectionManager.sendGameState(this.playerLeftId, gameStateData);
		pongConnectionManager.sendGameState(this.playerRightId, gameStateData);
	}

	_broadcastPaddleMove(playerId, paddleY)
	{
		const	paddleMoveData =
		{
			gameId: this.id,
			playerId: playerId,
			paddleY: paddleY
		};

		// Send to both players
		pongConnectionManager.sendPaddleMove(this.playerLeftId, paddleMoveData);
		pongConnectionManager.sendPaddleMove(this.playerRightId, paddleMoveData);
	}

	_broadcastScore(scorerId)
	{
		const	scoreData =
		{
			gameId: this.id,
			scorerId: scorerId,
			scores: this.scores
		};

		pongConnectionManager.sendScore(this.playerLeftId, scoreData);
		pongConnectionManager.sendScore(this.playerRightId, scoreData);
	}

	// Cleanup method
	destroy()
	{
		this.stopGameLoop();
	}
}