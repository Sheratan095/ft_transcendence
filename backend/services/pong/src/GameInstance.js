import { pongConnectionManager } from './PongConnectionManager.js';

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
		this.gameState =
		{
			ball:
			{
				x: 400, // Middle of 800px canvas
				y: 200, // Middle of 400px canvas
				vx: Math.random() > 0.5 ? 3 : -3, // Random initial direction
				vy: Math.random() * 2 - 1, // Random Y velocity
				speed: 3
			},
			paddles:
			{
				[playerLeftId]:
				{
					y: 150, // Middle of paddle area
					height: 100,
					width: 10,
					x: 10
				},
				[playerRightId]:
				{
					y: 150,
					height: 100,
					width: 10,
					x: 780
				}
			}
		};

		// Game constants
		this.CANVAS_WIDTH = 800;
		this.CANVAS_HEIGHT = 400;
		this.WINNING_SCORE = 5;
		this.PADDLE_SPEED = 5;
		this.BALL_RADIUS = 10;

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
		this._broadcastGameStart();
		console.log(`[PONG] Game ${this.id} started between ${this.playerLeftUsername} and ${this.playerRightUsername}`);
	}

	processMove(playerId, direction)
	{
		const	paddle = this.gameState.paddles[playerId];
		if (!paddle) return;

		// Update paddle position based on direction
		switch (direction)
		{
			case 'up':
				paddle.y = Math.max(0, paddle.y - this.PADDLE_SPEED);
				break;

			case 'down':
				paddle.y = Math.min(this.CANVAS_HEIGHT - paddle.height, paddle.y + this.PADDLE_SPEED);
				break;

				default:
				console.error(`[PONG] Invalid direction: ${direction}`);
				return;
		}

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
		if (this.gameLoop)
			clearInterval(this.gameLoop);

		this.gameLoop = setInterval(() =>
		{
			this._updateGameState();
		}, this.frameInterval);
	}

	_stopGameLoop()
	{
		if (this.gameLoop)
		{
			clearInterval(this.gameLoop);
			this.gameLoop = null;
		}
	}

	_updateGameState()
	{
		if (this.gameStatus !== GameStatus.IN_PROGRESS)
		{
			this._stopGameLoop();
			return;
		}

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
		if (Math.floor(now / this.frameInterval) % 2 === 0)
			this._broadcastGameState();
	}

	_updateBallPosition(deltaTime)
	{
		const	ball = this.gameState.ball;
		
		// Update ball position
		ball.x += ball.vx * ball.speed * (deltaTime * 60); // Normalize to 60 FPS
		ball.y += ball.vy * ball.speed * (deltaTime * 60);

		// Ball collision with top and bottom walls
		if (ball.y <= this.BALL_RADIUS || ball.y >= this.CANVAS_HEIGHT - this.BALL_RADIUS)
		{
			ball.vy = -ball.vy;
			ball.y = Math.max(this.BALL_RADIUS, Math.min(this.CANVAS_HEIGHT - this.BALL_RADIUS, ball.y));
		}
	}

	_checkCollisions()
	{
		const	ball = this.gameState.ball;
		const	leftPaddle = this.gameState.paddles[this.playerLeftId];
		const	rightPaddle = this.gameState.paddles[this.playerRightId];

		// Left paddle collision
		if (ball.x <= leftPaddle.x + leftPaddle.width + this.BALL_RADIUS &&
			ball.y >= leftPaddle.y &&
			ball.y <= leftPaddle.y + leftPaddle.height &&
			ball.vx < 0)
		{
			
			ball.vx = -ball.vx;
			ball.x = leftPaddle.x + leftPaddle.width + this.BALL_RADIUS;
			
			// Add some spin based on where the ball hit the paddle
			const	hitPos = (ball.y - leftPaddle.y) / leftPaddle.height - 0.5;
			ball.vy += hitPos * 2;
			
			// Increase speed slightly
			ball.speed = Math.min(ball.speed * 1.05, 8);
		}

		// Right paddle collision
		if (ball.x >= rightPaddle.x - this.BALL_RADIUS &&
			ball.y >= rightPaddle.y &&
			ball.y <= rightPaddle.y + rightPaddle.height &&
			ball.vx > 0)
		{
			
			ball.vx = -ball.vx;
			ball.x = rightPaddle.x - this.BALL_RADIUS;
			
			// Add some spin based on where the ball hit the paddle
			const	hitPos = (ball.y - rightPaddle.y) / rightPaddle.height - 0.5;
			ball.vy += hitPos * 2;
			
			// Increase speed slightly
			ball.speed = Math.min(ball.speed * 1.05, 8);
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
			this._resetBall();
			
			if (this.scores[this.playerLeftId] >= this.WINNING_SCORE)
				this._endGame(this.playerLeftId);
		}
		// Right player scores (ball went past left paddle)
		else if (ball.x < 0)
		{
			this.scores[this.playerRightId]++;
			this._broadcastScore(this.playerRightId);
			this._resetBall();
			
			if (this.scores[this.playerRightId] >= this.WINNING_SCORE)
				this._endGame(this.playerRightId);
		}
	}

	_resetBall()
	{
		const	ball = this.gameState.ball;
		ball.x = this.CANVAS_WIDTH / 2;
		ball.y = this.CANVAS_HEIGHT / 2;
		ball.vx = Math.random() > 0.5 ? 3 : -3;
		ball.vy = Math.random() * 2 - 1;
		ball.speed = 3;
	}

	_endGame(winnerId)
	{
		this.gameStatus = GameStatus.FINISHED;
		this._stopGameLoop();
		
		const	loserId = winnerId === this.playerLeftId ? this.playerRightId : this.playerLeftId;
		const	winnerUsername = winnerId === this.playerLeftId ? this.playerLeftUsername : this.playerRightUsername;
		
		this._broadcastGameEnd(winnerId, loserId, winnerUsername);
		
		console.log(`[PONG] Game ${this.id} ended. Winner: ${winnerUsername}`);
	}

	// Communication methods
	_broadcastGameStart()
	{
		pongConnectionManager.notifyGameStart(this.playerLeftId, this.id, 'left', this.playerRightUsername);
		pongConnectionManager.notifyGameStart(this.playerRightId, this.id, 'right', this.playerLeftUsername);
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

	_broadcastGameEnd(winnerId, loserId, winnerUsername)
	{
		const	gameEndData =
		{
			gameId: this.id,
			winnerId: winnerId,
			loserId: loserId,
			winnerUsername: winnerUsername,
			finalScores: this.scores
		};

		pongConnectionManager.sendGameEnd(this.playerLeftId, gameEndData);
		pongConnectionManager.sendGameEnd(this.playerRightId, gameEndData);
	}

	// Cleanup method
	destroy()
	{
		this._stopGameLoop();
		console.log(`[PONG] Game instance ${this.id} destroyed`);
	}
}