
import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import { GameManager, GAME_MODES } from "./game/GameManager.js";

/**
 * World coordinate bounds for converting normalized to 3D
 */
const fieldWidthEnv = parseInt(import.meta.env.VITE_FIELD_WIDTH) || 50;
const fieldHeightEnv = parseInt(import.meta.env.VITE_FIELD_HEIGHT) || 50;

export const WORLD_BOUNDS = {
  minX: -fieldWidthEnv / 2,
  maxX: fieldWidthEnv / 2,
  minZ: -fieldHeightEnv / 2,
  maxZ: fieldHeightEnv / 2
};

export class PongGame {
  constructor(canvasId, mode = GAME_MODES.LOCAL_VS_AI, config = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas with id ${canvasId} not found`);
    }

    this.engine = new BABYLON.Engine(this.canvas, true);
    this.gameManager = new GameManager(mode, config);
    this.scene = this.createScene();
    
    this.setupRenderLoop();
    this.setupResize();
  }

  createScene() {
    const scene = new BABYLON.Scene(this.engine);
    scene.clearColor = new BABYLON.Color3(0.6, 0.5, 0);

    /* =======================
       CAMERA
    ======================= */
    const camera = new BABYLON.UniversalCamera(
      "camera",
      new BABYLON.Vector3(0, 100, -40),
      scene
    );
    camera.inputs.clear();
    camera.attachControl(this.canvas, true);
    scene.activeCamera = camera;

    /* =======================
       LIGHT
    ======================= */
    const light = new BABYLON.HemisphericLight(
      "light",
      new BABYLON.Vector3(60, 100, 20),
      scene
    );
    light.intensity = 0.5;

    /* =======================
       SHADOW LIGHT
    ======================= */
    const shadowLight = new BABYLON.DirectionalLight(
      "shadowLight",
      new BABYLON.Vector3(-1, -2, -1),
      scene
    );
    shadowLight.position = new BABYLON.Vector3(0, 40, 0);

    const shadowGenerator = new BABYLON.ShadowGenerator(1024, shadowLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 32;

    /* =======================
       UI
    ======================= */
    const ui = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);

    this.scoreText = new GUI.TextBlock();
    this.scoreText.text = "0 : 0";
    this.scoreText.color = "white";
    this.scoreText.fontSize = 48;
    this.scoreText.fontFamily = "Liberation Sans";
    this.scoreText.top = "-40%";
    // Do not add score text to UI to avoid 2D/3D text overlays

    this.playerNameLeft = new GUI.TextBlock();
    this.playerNameLeft.text = this.gameManager.getGameState().playerNames.left;
    this.playerNameLeft.color = "white";
    this.playerNameLeft.fontFamily = "Liberation Sans";
    this.playerNameLeft.fontSize = 48;
    this.playerNameLeft.top = "-40%";
    this.playerNameLeft.left = "-40%";
    // Do not add player name (left) to UI

    this.playerNameRight = new GUI.TextBlock();
    this.playerNameRight.text = this.gameManager.getGameState().playerNames.right;
    this.playerNameRight.color = "white";
    this.playerNameRight.fontFamily = "Liberation Sans";
    this.playerNameRight.fontSize = 48;
    this.playerNameRight.top = "-40%";
    this.playerNameRight.left = "40%";
    // Do not add player name (right) to UI

    this.gameOverText = new GUI.TextBlock();
    this.gameOverText.text = "";
    this.gameOverText.color = "red";
    this.gameOverText.top = "-35%";
    this.gameOverText.fontSize = 48;
    this.gameOverText.fontFamily = "Liberation Sans";
    // Do not add game over text to UI

    /* =======================
       PADDLES (Babylon meshes)
    ======================= */
    const gameState = this.gameManager.getGameState();
    const worldHeight = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ;
    const paddleVisualDepth = gameState.paddles.left.height * worldHeight;
    const ballVisualDiameter = gameState.ball.radius * worldHeight * 2;

    this.rightPaddleMesh = BABYLON.MeshBuilder.CreateBox("rightPaddle", {
      height: 1, width: 1.5, depth: paddleVisualDepth,
      faceColors: Array(6).fill(new BABYLON.Color4(1, 0, 0, 1))
    }, scene);
    this.rightPaddleMesh.position.set(WORLD_BOUNDS.maxX, 4, 0);

    this.leftPaddleMesh = BABYLON.MeshBuilder.CreateBox("leftPaddle", {
      height: 1, width: 1.5, depth: paddleVisualDepth,
      faceColors: Array(6).fill(new BABYLON.Color4(0, 0, 1, 1))
    }, scene);
    this.leftPaddleMesh.position.set(WORLD_BOUNDS.minX, 4, 0);

    /* =======================
       BALL
    ======================= */
    this.ballMesh = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: ballVisualDiameter, segments: 32 }, scene);
    this.ballMesh.position.set(0, 4, 0);

    shadowGenerator.addShadowCaster(this.ballMesh);
    shadowGenerator.addShadowCaster(this.rightPaddleMesh);
    shadowGenerator.addShadowCaster(this.leftPaddleMesh);

    /* =======================
       GROUND
    ======================= */
    const fieldWidth = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX;
    const fieldDepth = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ;
    
    // Create ground slightly larger than the field
    const ground = BABYLON.MeshBuilder.CreateGround("ground", { 
      width: fieldWidth * 1.2, 
      height: fieldDepth * 1.2 
    }, scene);
    ground.position.y = -1;
    ground.receiveShadows = true;

    const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.2);
    groundMaterial.specularColor = BABYLON.Color3.Black();
    ground.material = groundMaterial;

    /* =======================
       FIELD MARKINGS
    ======================= */
    const markMaterial = new BABYLON.StandardMaterial("markMat", scene);
    markMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
    markMaterial.specularColor = BABYLON.Color3.Black();

    const lineThickness = 0.4;
    const markY = -0.95; // Slightly above ground level

    // Horizontal boundaries (Top & Bottom)
    const topBoundary = BABYLON.MeshBuilder.CreateBox("topBoundary", { width: fieldWidth + lineThickness, height: 0.1, depth: lineThickness }, scene);
    topBoundary.position.set(0, markY, WORLD_BOUNDS.maxZ);
    topBoundary.material = markMaterial;

    const bottomBoundary = BABYLON.MeshBuilder.CreateBox("bottomBoundary", { width: fieldWidth + lineThickness, height: 0.1, depth: lineThickness }, scene);
    bottomBoundary.position.set(0, markY, WORLD_BOUNDS.minZ);
    bottomBoundary.material = markMaterial;

    // Goal lines (Left & Right)
    const leftBoundary = BABYLON.MeshBuilder.CreateBox("leftBoundary", { width: lineThickness, height: 0.1, depth: fieldDepth + lineThickness }, scene);
    leftBoundary.position.set(WORLD_BOUNDS.minX, markY, 0);
    leftBoundary.material = markMaterial;

    const rightBoundary = BABYLON.MeshBuilder.CreateBox("rightBoundary", { width: lineThickness, height: 0.1, depth: fieldDepth + lineThickness }, scene);
    rightBoundary.position.set(WORLD_BOUNDS.maxX, markY, 0);
    rightBoundary.material = markMaterial;

    // Center divider
    const centerLine = BABYLON.MeshBuilder.CreateBox("centerLine", { width: lineThickness, height: 0.1, depth: fieldDepth }, scene);
    centerLine.position.set(0, markY, 0);
    centerLine.material = markMaterial;

    camera.setTarget(ground.position);

    /* =======================
       GAME MANAGER CALLBACKS
    ======================= */
    this.gameManager.setCallbacks({
      onGoal: (scorer, scores) => {
        this.scoreText.text = `${scores.left} : ${scores.right}`;
      },
      onGameOver: (winner) => {
        const winnerName = winner === "left" 
          ? this.gameManager.getGameState().playerNames.left 
          : this.gameManager.getGameState().playerNames.right;
        this.gameOverText.text = `${winnerName} HAS WON`;
      }
    });

    return scene;
  }

  setupRenderLoop() {
    this.engine.runRenderLoop(() => {
      // Update game logic via GameManager
      this.gameManager.update();

      // Get world coordinates from normalized game state
      const worldCoords = this.gameManager.getWorldCoordinates(
        WORLD_BOUNDS.minX,
        WORLD_BOUNDS.maxX,
        WORLD_BOUNDS.minZ,
        WORLD_BOUNDS.maxZ
      );

      // Update visual representation
      this.ballMesh.position.x = worldCoords.ball.x;
      this.ballMesh.position.z = worldCoords.ball.z;

      this.leftPaddleMesh.position.z = worldCoords.paddles.left.z;
      this.rightPaddleMesh.position.z = worldCoords.paddles.right.z;

      this.scene.render();
    });
  }

  setupResize() {
    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }

  // --- External API ---

  updatePlayerNames(left, right) {
    this.gameManager.gameState.playerNames = { left, right };
    this.playerNameLeft.text = left;
    this.playerNameRight.text = right;
  }

  updateOnlineState(serverState) {
    if (this.gameManager.mode !== GAME_MODES.ONLINE) return;
    
    // Pass server state to network controller if it exists
    if (this.gameManager.networkController) {
      this.gameManager.networkController.setServerGameState(serverState);
    }
  }

  changeMode(mode, config = {}) {
    this.gameManager.changeMode(mode, config);
    this.playerNameLeft.text = this.gameManager.getGameState().playerNames.left;
    this.playerNameRight.text = this.gameManager.getGameState().playerNames.right;
    this.scoreText.text = "0 : 0";
    this.gameOverText.text = "";
  }

  destroy() {
    this.gameManager.destroy();
    this.engine.dispose();
  }
}

// Map between HTML modes and GameManager modes
export { GAME_MODES };

// 	box.position.set(25, 4, 0);

// 	/* =======================
// 	   BOX player 1
// 	======================= */

// 	const box2 = BABYLON.MeshBuilder.CreateBox("box2", {
// 		height: 1,
// 		width: 2,
// 		depth: 5,
// 		faceColors: [
// 			new BABYLON.Color4(0, 0, 1, 1),
// 			new BABYLON.Color4(0, 0, 1, 1),
// 			new BABYLON.Color4(0, 0, 1, 1),
// 			new BABYLON.Color4(0, 0, 1, 1),
// 			new BABYLON.Color4(0, 0, 1, 1),
// 			new BABYLON.Color4(0, 0, 1, 1)
// 		]
// 	}, scene);

// 	box2.position.set(-25, 4, 0);

// 	/* =======================
// 	   SPHERE
// 	======================= */

// 	const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {
// 		diameter: 2,
// 		segments: 32
// 	}, scene);

// 	sphere.position.set(0, 4, 0);
// 	let ballDir = new BABYLON.Vector3(0.15, 0, 0.2);
// 	let ballSpeed = 2.00;
// 	const ballLimit = 24;

// 	shadowGenerator.addShadowCaster(sphere);
// 	shadowGenerator.addShadowCaster(box);
// 	shadowGenerator.addShadowCaster(box2);

// 	/* =======================
// 	SCORE
// 	======================= */
// 	let scorePlayer1 = 0; // box2 (sinistra)
// 	let scorePlayer2 = 0; // box (destra)


// 	/* =======================
// 	   GROUND
// 	======================= */

// 	const groundHighMap = new BABYLON.MeshBuilder.CreateGroundFromHeightMap('heighMapGround', '/public/topoGraphicMap.png',
// 		{
// 			height: 60,
// 			depth: 50,
// 			width: 80,
// 			// per vedere i rilievi
// 			// subdivisiion: 50
// 		}, scene);
// 	groundHighMap.position.y = -1;
// 	groundHighMap.receiveShadows = true;

// 	/* =======================
// 	GROUND MATERIAL
// 	======================= */
// 	const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
// 	groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.2); // verde campo
// 	groundMaterial.specularColor = BABYLON.Color3.Black(); // niente riflessi

// 	groundHighMap.material = groundMaterial;

// 	camera.setTarget(groundHighMap.position);

// 	/* =======================
// 	   INPUT
// 	======================= */

// 	const inputMap = {};
// 	scene.actionManager = new BABYLON.ActionManager(scene);

// 	scene.actionManager.registerAction(
// 		new BABYLON.ExecuteCodeAction(
// 			BABYLON.ActionManager.OnKeyDownTrigger,
// 			evt => inputMap[evt.sourceEvent.key] = true
// 		)
// 	);

// 	scene.actionManager.registerAction(
// 		new BABYLON.ExecuteCodeAction(
// 			BABYLON.ActionManager.OnKeyUpTrigger,
// 			evt => inputMap[evt.sourceEvent.key] = false
// 		)
// 	);

// 	/* =======================
// 	   MOVIMENTO PLAYER + CAMERA
// 	======================= */
// 	let playerBox = 0;
// 	let playerBox2 = 0;
// 	const speed = 0.5;
// 	const minZ = -25;
// 	const maxZ = 25;
// 	let ballActive = false;

// 	// per AI player
// 	const aiSpeed = 0.35;
// 	const aiReactionDistance = 20; // quanto vicino deve essere la palla
// 	let aiActive = false;


// 	/* =======================
// 	   FUNZIONE PER COLLISIONE PALLA <-> PADDLE
// 	======================= */
// 	function checkBallPaddleCollision(ball, paddle, player) {
// 		const ballRadius = 1;
// 		const paddleHalfZ = 2.5;
// 		const paddleHalfX = 1;

// 		const collisionX =
// 			Math.abs(ball.position.x - paddle.position.x) <=
// 			ballRadius + paddleHalfX;

// 		const collisionZ =
// 			Math.abs(ball.position.z - paddle.position.z) <=
// 			ballRadius + paddleHalfZ;
// 		return collisionX && collisionZ;
// 	}

// 	scene.onBeforeRenderObservable.add(() => {

// 		if (gameOver && winner != ""){
// 			const gameOvertext = new GUI.TextBlock();
// 			gameOvertext.text = winner + " HAS WON";
// 			gameOvertext.color = "red";
// 			gameOvertext.top = "-35%";
// 			gameOvertext.fontSize = 48;
// 			gameOvertext.fontFamily = "Liberation Sans";
// 			ui.addControl(gameOvertext);
// 			return;	
// 		} 
// 		/* =======================
// 		   PLAYER 1 – up / down (default camera)
// 		======================= */
// 		if (inputMap["ArrowUp"]) {
// 			if (ballActive === false)
// 				ballActive = true;
// 			playerBox += speed;
// 		}
// 		if (inputMap["ArrowDown"]) {
// 			if (ballActive === false)
// 				ballActive = true;
// 			playerBox -= speed;
// 		}

// 		playerBox = BABYLON.Scalar.Clamp(playerBox, minZ, maxZ);

// 		box.position.z = playerBox;
// 		/* =======================
// 		   PLAYER 2 – W / S (default camera)
// 		======================= */
// 		if (inputMap["s"] || inputMap["S"]) {
// 			if (ballActive === false)
// 				ballActive = true;
// 			playerBox2 -= speed;
// 		}
// 		if (inputMap["w"] || inputMap["W"]) {
// 			if (ballActive === false)
// 				ballActive = true;
// 			playerBox2 += speed;
// 		}

// 		playerBox2 = BABYLON.Scalar.Clamp(playerBox2, minZ, maxZ);
// 		box2.position.z = playerBox2;

// 		/* =======================
// 		BALL MOVEMENT
// 		======================= */

// 		// funzione per cambio coordinate palla
		

// 		// Movimento lineare
// 		if (ballActive) {
// 			sphere.position.x += ballDir.x * ballSpeed;
// 			sphere.position.z += ballDir.z * ballSpeed;
// 		}

// 		/* =======================
// 		BALL ↔ PADDLE COLLISION
// 		======================= */

// 		// Paddle destro
// 		if (checkBallPaddleCollision(sphere, box, 2) && ballDir.x > 0) {
// 			ballDir.x *= -1;

// 			// variazione angolo in base a dove colpisce il paddle
// 			const hitOffset = sphere.position.z - box.position.z;
// 			ballDir.z = hitOffset * 0.05;
// 		}

// 		// Paddle sinistro
// 		if (checkBallPaddleCollision(sphere, box2, 1) && ballDir.x < 0) {
// 			ballDir.x *= -1;

// 			const hitOffset = sphere.position.z - box2.position.z;
// 			ballDir.z = hitOffset * 0.05;
// 		}

// 		/* =======================
// 		   AI PLAYER
// 		======================= */
// 		// TODO decomment
// 		// if (!gameOver) {
// 		// 	const distanceX = Math.abs(sphere.position.x - box2.position.x);

// 		// 	if (aiActive && distanceX < aiReactionDistance) {
// 		// 		if (sphere.position.z > box2.position.z + 0.7) {
// 		// 			playerBox2 += aiSpeed;
// 		// 		}
// 		// 		else if (sphere.position.z < box2.position.z - 0.7) {
// 		// 			playerBox2 -= aiSpeed;
// 		// 		}
// 		// 	}

// 		// 	playerBox2 = BABYLON.Scalar.Clamp(playerBox2, minZ, maxZ);
// 		// 	box2.position.z = playerBox2;
// 		// }

// 		// Limiti X
// 		/* =======================
// 		   GOAL + RESET
// 		======================= */
// 		if (sphere.position.x > ballLimit) {
// 			scorePlayer1++;
// 			scoreText.text = `${scorePlayer1} : ${scorePlayer2}`;
// 			sphere.position.set(0, 4, 0);
// 			ballDir = new BABYLON.Vector3(-0.15, 0, 0.2);
// 			ballActive = false;
// 			ballSpeed += 0.05;
// 			playerBox = 0;
// 			playerBox2 = 0;
// 			box.position.set(25, 4, 0);
// 			box2.position.set(-25, 4, 0);
// 			if (scorePlayer1 == 5)
// 			{
// 				winner = playerName1.text;
// 				gameOver = true;
// 			}
// 			return;
// 		}

// 		if (sphere.position.x < -ballLimit) {
// 			scorePlayer2++;
// 			scoreText.text = `${scorePlayer1} : ${scorePlayer2}`;
// 			sphere.position.set(0, 4, 0);
// 			ballDir = new BABYLON.Vector3(0.15, 0, 0.2);
// 			ballActive = false;
// 			ballSpeed += 0.05;
// 			playerBox = 0;
// 			playerBox2 = 0;
// 			box.position.set(25, 4, 0);
// 			box2.position.set(-25, 4, 0);
// 			if (scorePlayer2 == 5)
// 			{
// 				winner = playerName2.text;
// 				gameOver = true;
// 			}
// 			return;
// 		}

// 		// Limiti Z
// 		if (sphere.position.z >= ballLimit || sphere.position.z <= -ballLimit) {
// 			ballDir.z *= -1;
// 		}
// 	});

// 	return scene;
// }

// const scenario = createScene();

// engine.runRenderLoop(() => {
// 	scenario.render();
// });

// window.addEventListener("resize", () => {
// 	engine.resize();
// });
