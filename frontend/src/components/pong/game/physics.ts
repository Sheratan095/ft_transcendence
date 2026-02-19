// Physics configuration (from .env file - matching backend)
// Note: Speeds are per SECOND in .env, converted to per-frame (60fps) here
const PHYSICS_CONFIG =
{
	BALL_INITIAL_SPEED: (parseFloat(import.meta.env.VITE_BALL_INITIAL_SPEED) || 0.5) / 60,
	BALL_SPEED_FACTOR: parseFloat(import.meta.env.VITE_BALL_SPEED_FACTOR) || 1.1,
	BALL_MAX_SPEED: (parseFloat(import.meta.env.VITE_BALL_MAX_SPEED) || 2.0) / 60,
	BALL_RADIUS: parseFloat(import.meta.env.VITE_BALL_RADIUS) || 0.015,
	PADDLE_HEIGHT: parseFloat(import.meta.env.VITE_PADDLE_HEIGHT) || 0.3,
	PADDLE_SPEED: (parseFloat(import.meta.env.VITE_PADDLE_SPEED) || 1.5) / 60,
	MAX_BOUNCE_ANGLE: parseFloat(import.meta.env.VITE_MAX_BOUNCE_ANGLE) || 60, // degrees
};

/**
 * Initialize game state with normalized coordinates (0-1)
 * @param {string} playerLeftId - ID of left player
 * @param {string} playerRightId - ID of right player
 * @returns {object} Initial game state
 */
export function initGameState(playerLeftId: string, playerRightId: string): any
{
	const ballComponents = generateStartingBallComponents(PHYSICS_CONFIG.BALL_INITIAL_SPEED);
	const paddleHeight = PHYSICS_CONFIG.PADDLE_HEIGHT;

	const gameState =
	{
		ball:
		{
			x: 0.5, // Middle of canvas horizontally
			y: 0.5, // Middle of canvas vertically
			vx: ballComponents.newVx,
			vy: ballComponents.newVy,
			speed: PHYSICS_CONFIG.BALL_INITIAL_SPEED,
			radius: PHYSICS_CONFIG.BALL_RADIUS,
		},
		paddles:
		{
			[playerLeftId]: {
				y: 0.5 - paddleHeight / 2, // Center paddle on screen
				height: paddleHeight,
				x: 0, // Start of canvas
			},
			[playerRightId]: {
				y: 0.5 - paddleHeight / 2, // Center paddle on screen
				height: paddleHeight,
				x: 1, // End of canvas
			},
		},
		scores:
		{
			[playerLeftId]: 0,
			[playerRightId]: 0,
		},
	};

	return gameState;
}

/**
 * Update ball position based on velocity
 * @param {object} ball - Ball state
 * @param {number} deltaTime - Time delta (for frame-independent movement)
 */
export function updateBallPosition(ball: any, deltaTime: number = 1): void
{
	ball.x += ball.vx * deltaTime;
	ball.y += ball.vy * deltaTime;
}

/**
 * Move paddle in a direction
 * @param {number} startingY - Current Y position (0-1)
 * @param {string} direction - 'up' or 'down'
 * @returns {number} New Y position
 */
export function movePaddle(startingY: number, direction: string): number
{
	const moveAmount = PHYSICS_CONFIG.PADDLE_SPEED;

	switch (direction)
	{
		case "up":
			// Move paddle up, ensuring it doesn't go out of bounds
			return Math.max(0, startingY - moveAmount);

		case "down":
			// Move paddle down, ensuring it doesn't go out of bounds
			return Math.min(1 - PHYSICS_CONFIG.PADDLE_HEIGHT, startingY + moveAmount);

		default:
			console.error(`[PHYSICS] Invalid direction: ${direction}`);
			return startingY;
	}
}

/**
 * Check if ball collides with paddle
 * @param {object} ball - Ball state
 * @param {object} paddle - Paddle state
 * @returns {boolean} True if collision detected
 */
export function checkPaddleCollision(ball: any, paddle: any): boolean
{
	// Check X overlap using paddle's x position (treat paddle as vertical line)
	const ballLeft = ball.x - ball.radius;
	const ballRight = ball.x + ball.radius;

	let xOverlap = false;
	if (paddle.x === 0) // Left paddle at x=0
		xOverlap = ballLeft <= paddle.x;
	else // Right paddle at x=1
		xOverlap = ballRight >= paddle.x;

	// Check Y overlap
	const ballTop = ball.y - ball.radius;
	const ballBottom = ball.y + ball.radius;
	const yOverlap = ballBottom >= paddle.y && ballTop <= paddle.y + paddle.height;

	return (xOverlap && yOverlap);
}

/**
 * Elaborate paddle collision (same as backend)
 * @param {object} ball - Ball state (modified in place)
 * @param {object} paddle - Paddle state
 * @param {number} direction - -1 for left, 1 for right
 * @returns {object} Modified ball state
 */
export function elaboratePaddleCollision(ball: any, paddle: any, direction: number): any
{
	// Increase ball speed upon paddle hit
	ball.speed *= PHYSICS_CONFIG.BALL_SPEED_FACTOR;

	// Cap ball speed to prevent infinite acceleration
	if (ball.speed > PHYSICS_CONFIG.BALL_MAX_SPEED)
		ball.speed = PHYSICS_CONFIG.BALL_MAX_SPEED;

	// Calculate hit position from paddle center
	const paddleCenter = paddle.y + paddle.height / 2;
	const hitOffset = ball.y - paddleCenter;
	
	// Map hit position from -1 (top) to +1 (bottom)
	const deltaYHitNorm = hitOffset / (paddle.height / 2);
	const clampedDeltaY = clamp(deltaYHitNorm, -1, 1);
	
	const maxBounceAngle = PHYSICS_CONFIG.MAX_BOUNCE_ANGLE;
	const bounceAngle = clampedDeltaY * maxBounceAngle;

	const { vx, vy } = calculateBallComponents(ball.speed, bounceAngle, direction);

	ball.vx = vx;
	ball.vy = vy;

	return ball;
}

/**
 * Elaborate wall collision (top/bottom)
 * @param {object} ball - Ball state (modified in place)
 */
export function elaborateWallCollision(ball: any): void
{
	// Invert vertical velocity
	ball.vy = -ball.vy;

	// Clamp ball position to stay within bounds
	if (ball.y < ball.radius)
		ball.y = ball.radius;
	else if (ball.y > 1 - ball.radius)
		ball.y = 1 - ball.radius;
}

/**
 * Check if ball is out of bounds (goal)
 * @param {object} ball - Ball state
 * @returns {string|null} 'left' if left player scored, 'right' if right player scored, null otherwise
 */
export function checkGoal(ball: any): string | null
{
	if (ball.x < 0)
		return "right"; // Right player scored

	if (ball.x > 1)
		return "left"; // Left player scored

	return null;
}

/**
 * Reset ball to center with new direction
 * @param {object} ball - Ball state (modified in place)
 * @param {number} direction - -1 for left, 1 for right
 */
export function resetBall(ball: any, direction: number): void
{
	ball.x = 0.5;
	ball.y = 0.5;
	ball.speed = PHYSICS_CONFIG.BALL_INITIAL_SPEED;
	
	const ballComponents = generateStartingBallComponents(ball.speed, direction);
	ball.vx = ballComponents.newVx;
	ball.vy = ballComponents.newVy;
}

/**
 * Generate starting ball components
 * @param {number} initialSpeed - Initial speed
 * @param {number} [forcedDirection] - Force direction (-1 or 1), random if not provided
 * @returns {object} Ball velocity components
 */
export function generateStartingBallComponents(initialSpeed: number, forcedDirection?: number): any
{
	const angleDegrees = Math.random() * 120 - 60; // Random angle between -60 and +60 degrees
	const direction = forcedDirection !== undefined ? forcedDirection : (Math.random() < 0.5 ? -1 : 1);

	const { vx, vy } = calculateBallComponents(initialSpeed, angleDegrees, direction);

	return { newVx: vx, newVy: vy };
}

/**
 * Calculate ball velocity components from speed and angle
 * @param {number} speed - Ball speed
 * @param {number} angleDegrees - Angle in degrees
 * @param {number} direction - -1 for left, 1 for right
 * @returns {object} Velocity components {vx, vy}
 */
export function calculateBallComponents(speed: number, angleDegrees: number, direction: number): any
{
	const theta = (angleDegrees * Math.PI) / 180; // Convert to radians

	const vx = direction * speed * Math.cos(theta);
	const vy = speed * Math.sin(theta);

	return { vx, vy };
}

/**
 * Clamp value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value: number, min: number, max: number): number
{
	if (value < min)
		return min;

	if (value > max)
		return max;

	return value;
}

/**
 * Get physics configuration (for debugging/tuning)
 * @returns {object} Physics configuration
 */
export function getPhysicsConfig(): any
{
	return { ...PHYSICS_CONFIG };
}

/**
 * Update physics configuration
 * @param {object} updates - Configuration updates
 */
export function updatePhysicsConfig(updates: any): void
{
	Object.assign(PHYSICS_CONFIG, updates);
}
