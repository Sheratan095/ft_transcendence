
export function	initGameState(playerLeftId, playerRightId)
{
	const	ballComponents = generateStartingBallComponents(parseFloat(process.env.BALL_INITIAL_SPEED));

	const gameState =
	{
		ball:
		{
			x: 0.5, // Middle of canvas
			y: 0.5, // Middle of canvas
			vx: ballComponents.newVx,
			vy: ballComponents.newVy,
			speed: parseFloat(process.env.BALL_INITIAL_SPEED)
		},
		paddles:
		{
			[playerLeftId]:
			{
				y: 0.5, // Middle of paddle area
				height: parseFloat(process.env.PADDLE_HEIGHT),
				x: 0 // Start of canvas
			},
			[playerRightId]:
			{
				y: 0.5,
				height: parseFloat(process.env.PADDLE_HEIGHT),
				x: 1 // End of canvas
			}
		}
	}

	return (gameState);
}

export function	calculateBallPosition(ball, deltaTime)
{
	const	ballNewX = ball.vx * deltaTime;
	const	ballNewY = ball.vy * deltaTime;
	
	return ({ newX: ballNewX, newY: ballNewY });
}

export function	randomInitialBallComponents()
{
	// TO DO
	// const	initialSpeed = parseFloat(process.env.INITIAL_BALL_SPEED);
}

// return new y of paddle
export function	movePaddle(startingY, direction)
{
	switch (direction)
	{
		case 'up':
			// Move paddle up, ensuring it doesn't go out of bounds
			return (Math.max(0, startingY - parseFloat(process.env.PADDLE_SPEED)));

		case 'down':
			// Move paddle down, ensuring it doesn't go out of bounds
			return (Math.min(1 - parseFloat(process.env.PADDLE_HEIGHT), startingY + parseFloat(process.env.PADDLE_SPEED)));

		default:
			console.error(`[PONG] Invalid direction: ${direction}`);
			return (null);
	}
}

export function	elaboratePaddleCollision(paddle, ball, direction)
{
	ball.vx = -ball.vx;
	ball.x = paddle.x - parseFloat(process.env.BALL_RADIUS);
	
	// Add some spin based on where the ball hit the paddle
	const	hitPos = (ball.y - paddle.y) / paddle.height - 0.5;
	ball.vy += hitPos * 2;
	
	// Increase speed slightly
	// ball.speed = Math.min(ball.speed * 1.05, 8);
}

export function	elaborateWallCollision(ball)
{
	ball.vy = -ball.vy;
}

export function	generateStartingBallComponents(initialSpeed)
{
	const	angleDegrees = (Math.random() * 120) - 60; // Random angle between -60 and +60 degrees
	const	direction = Math.random() < 0.5 ? -1 : 1; // Randomly left or right

	const	theta = (angleDegrees * Math.PI) / 180; // Convert to radians

	// Scale speed for 60 FPS (divide by 60 to get per-frame velocity)
	const	frameSpeed = (initialSpeed || 0.01) / 60;
	const	vx = direction * frameSpeed * Math.cos(theta);
	const	vy = frameSpeed * Math.sin(theta);

	return ({ newVx: vx, newVy: vy });
}