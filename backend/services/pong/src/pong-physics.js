export function	initGameState(playerLeftId, playerRightId)
{
	const	ballComponents = generateStartingBallComponents(parseFloat(process.env.BALL_INITIAL_SPEED));
	const	paddleHeight = parseFloat(process.env.PADDLE_HEIGHT);

	const gameState =
	{
		ball:
		{
			x: 0.5, // Middle of canvas orizontally
			y: 0.5, // Middle of canvas vertically
			vx: ballComponents.newVx,
			vy: ballComponents.newVy,
			speed: parseFloat(process.env.BALL_INITIAL_SPEED),
			radius: parseFloat(process.env.BALL_RADIUS)
		},
		paddles:
		{
			[playerLeftId]:
			{
				y: 0.5 - paddleHeight / 2, // Center paddle on screen, paddle.y is top of paddle
				height: paddleHeight,
				x: 0 // Start of canvas
			},
			[playerRightId]:
			{
				y: 0.5 - paddleHeight / 2, // Center paddle on screen, paddle.y is top of paddle
				height: paddleHeight,
				x: 1 // End of canvas
			}
		}
	}

	return (gameState);
}

// return new y of paddle
export function	movePaddle(startingY, direction)
{
	const	moveAmount = parseFloat(process.env.PADDLE_SPEED) / 60; // Divide by 60 to get per-frame amount
	
	switch (direction)
	{
		case 'up':
			// Move paddle up, ensuring it doesn't go out of bounds
			return (Math.max(0, startingY - moveAmount));

		case 'down':
			// Move paddle down, ensuring it doesn't go out of bounds
			return (Math.min(1 - parseFloat(process.env.PADDLE_HEIGHT), startingY + moveAmount));

		default:
			console.error(`[PONG] Invalid direction: ${direction}`);
			return (null);
	}
}

export function	elaboratePaddleCollision(ball, paddle, direction)
{
	// Increase ball speed upon paddle hit
	ball.speed *= parseFloat(process.env.BALL_SPEED_FACTOR);
	
	// Cap ball speed to prevent infinite acceleration
	const	maxSpeed = parseFloat(process.env.BALL_MAX_SPEED);
	if (ball.speed > maxSpeed)
		ball.speed = maxSpeed;

	// Map hit position from -1 (top) to +1 (bottom)
	const	paddleCenter = paddle.y + paddle.height / 2;  // Get center position
	const	deltaYHitNorm = (ball.y - paddleCenter) / (paddle.height / 2);
	const	clampedDeltaY = clamp(deltaYHitNorm, -1, 1); // Prevent extreme angles
	const	maxBounceAngle = parseFloat(process.env.MAX_BOUNCE_ANGLE); // Max 60 degrees
	const	bounceAngle = clampedDeltaY * maxBounceAngle;

	const	{ vx, vy } = calculateBallComponents(ball.speed, bounceAngle, direction);

	ball.vx = vx;
	ball.vy = vy;

	return (ball);
}

export function	elaborateWallCollision(ball)
{
	// Invert vertical velocity
	ball.vy = -ball.vy;
	
	// Clamp ball position to stay within bounds
	if (ball.y < ball.radius)
		ball.y = ball.radius;
	else if (ball.y > 1 - ball.radius)
		ball.y = 1 - ball.radius;
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
	// const	frameSpeed = (speed || 0.01) / 60;

	// const	vx = direction * frameSpeed * Math.cos(theta);
	// const	vy = frameSpeed * Math.sin(theta);

	const	vx = direction * speed * Math.cos(theta);
	const	vy = speed * Math.sin(theta);

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