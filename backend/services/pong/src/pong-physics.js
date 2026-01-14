
export function	initGameState()
{
	const	ballComponents = generateStartingBallComponents(parseFloat(process.env.INITIAL_BALL_SPEED));

	gameState =
	{
		ball:
		{
			x: 0.5, // Middle of canvas
			y: 0.5, // Middle of canvas
			vx: ballComponents.newVx,
			vy: ballComponents.newVy,
			speed: parseFloat(process.env.INITIAL_BALL_SPEED)
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

// Direction: 1 = right, -1 = left
export function	calculateBallComponents(ball, angleDegrees)
{
	const	direction = ball.vx > 0 ? 1 : -1;
	const	theta = Math.atan2(ball.vy, ball.vx) * angleDegrees;

	ball.vx = direction * ball.speed * Math.cos(theta);
	ball.vy	 = ball.speed * Math.sin(theta);
	
	return (ball);
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

	const	vx = direction * initialSpeed * Math.cos(theta);
	const	vy = initialSpeed * Math.sin(theta);

	return ({ newVx: vx, newVy: vy });
}