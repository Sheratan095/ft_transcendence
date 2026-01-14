
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

export function	elaboratePaddleCollision(ball, paddle, direction)
{
	// Increase ball speed upon paddle hit
	ball.speed *= parseFloat(process.env.BALL_SPEED_FACTOR) || 1.05;

	// Map hit position from -1 (top) to +1 (bottom)
	const	deltaYHitNorm = (ball.y - paddle.y) / paddle.height;
	const	clampedDeltaY = clamp(deltaYHitNorm, -1, 1); // Prevent extreme angles
	const	maxBounceAngle = parseFloat(process.env.MAX_BOUNCE_ANGLE) || 60; // Max 60 degrees
	const	bounceAngle = clampedDeltaY * maxBounceAngle;

	const	{ vx, vy } = calculateBallComponents(ball.speed, bounceAngle, direction);

	ball.vx = vx;
	ball.vy = vy;

	return (ball);
}

export function	elaborateWallCollision(ball)
{
	ball.vy = -ball.vy;
}

export function	generateStartingBallComponents(initialSpeed)
{
	const	angleDegrees = (Math.random() * 120) - 60; // Random angle between -60 and +60 degrees
	const	direction = Math.random() < 0.5 ? -1 : 1; // Randomly left or right

	const	{ vx, vy } = calculateBallComponents(initialSpeed, angleDegrees, direction);

	return ({ newVx: vx, newVy: vy });
}

export function	calculateBallComponents(speed, angleDegrees, direction)
{
	const	theta = (angleDegrees * Math.PI) / 180; // Convert to radians

	// Scale speed for 60 FPS (divide by 60 to get per-frame velocity)
	const	frameSpeed = (speed || 0.01) / 60;

	const	vx = direction * frameSpeed * Math.cos(theta);
	const	vy = frameSpeed * Math.sin(theta);

	return ({ vx, vy });
}

export function	clamp(value, min, max)
{
	if (value < min)
		return (min);
	if (value > max)
		return (max);
	return (value);
}