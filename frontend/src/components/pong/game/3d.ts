
/**
 * 3D Rendering with Babylon.js + Configuration
 */

import * as BABYLON from "@babylonjs/core";
import { GameManager, GAME_MODES } from "../GameManager";

// ============== Configuration ==============

const fieldWidthEnv = parseInt(import.meta.env.VITE_FIELD_WIDTH) || 130;
const fieldHeightEnv = parseInt(import.meta.env.VITE_FIELD_HEIGHT) || 70;

export const WORLD_BOUNDS = {
	minX: -fieldWidthEnv / 2,
	maxX: fieldWidthEnv / 2,
	minZ: -fieldHeightEnv / 2,
	maxZ: fieldHeightEnv / 2
};

const GAME_CONFIG = {
	ballY: 3,
	paddleY: 3,
	groundY: -1,
	markerY: -0.95,
	cameraAlpha: -(Math.PI / 2),
	cameraBeta: 0.7,
	cameraRadius: 110,
	shadowMapSize: 1024,
	lightIntensity: 0.5,
	shadowBlurKernel: 32,
	paddleHeight: 1,
	paddleWidth: 1.5,
	ballSegments: 32,
	lineThickness: 0.4,
	groundScale: 1.25,
};

const COLORS = {
	leftPaddle: new BABYLON.Color3(0, 0, 1),
	rightPaddle: new BABYLON.Color3(1, 0, 0),
	ground: new BABYLON.Color3(0.2, 0.6, 0.2),
	marking: new BABYLON.Color3(1, 1, 1),
};

// ============== 3D Renderer ==============

export class PongGame {
	canvas: HTMLCanvasElement | null;
	engine: BABYLON.Engine | null;
	scene: BABYLON.Scene | null;
	gameManager: GameManager;
	rightPaddleMesh: BABYLON.Mesh | null = null;
	leftPaddleMesh: BABYLON.Mesh | null = null;
	ballMesh: BABYLON.Mesh | null = null;
	_fieldWidth!: number;
	_fieldDepth!: number;
	_fitCamera!: (width: number, depth: number) => any;
	_groundPosition!: BABYLON.Vector3;
	_targetOffset!: BABYLON.Vector3;

	constructor(canvasId: string, mode: string = GAME_MODES.LOCAL_VS_AI, config: any = {}) {
		this.canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
		if (!this.canvas) throw new Error(`Canvas with id ${canvasId} not found`);

		this.engine = new BABYLON.Engine(this.canvas, true, {
			preserveDrawingBuffer: true,
			stencil: true,
			premultipliedAlpha: false,
			alpha: true
		});

		const gmConfig = { ...config };
		if (mode === GAME_MODES.LOCAL_VS_AI && gmConfig.playerSide === undefined) {
			gmConfig.playerSide = "right";
		}
		this.gameManager = new GameManager(mode, gmConfig);
		this.scene = this.createScene();

		this.setupRenderLoop();
		this.setupResize();
	}

	createScene() {
		const scene = new BABYLON.Scene(this.engine!);
		scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

		this._fieldWidth = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX;
		this._fieldDepth = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ;

		this._fitCamera = (width: number, depth: number) => ({
			alpha: GAME_CONFIG.cameraAlpha,
			beta: GAME_CONFIG.cameraBeta,
			radius: GAME_CONFIG.cameraRadius
		});

		// Camera
		const fit = this._fitCamera(this._fieldWidth, this._fieldDepth);
		const camera = new BABYLON.ArcRotateCamera(
			"camera", fit.alpha, fit.beta, fit.radius,
			new BABYLON.Vector3(0, 0, 0), scene
		);
		camera.inputs.clear();
		camera.detachControl();
		camera.lowerRadiusLimit = Math.max(10, Math.max(this._fieldWidth, this._fieldDepth) * 0.3);
		camera.upperRadiusLimit = Math.max(200, Math.max(this._fieldWidth, this._fieldDepth) * 4);
		scene.activeCamera = camera;

		// Lighting
		const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(60, 100, 20), scene);
		light.intensity = GAME_CONFIG.lightIntensity;

		const shadowLight = new BABYLON.DirectionalLight("shadowLight", new BABYLON.Vector3(-1, -2, -1), scene);
		shadowLight.position = new BABYLON.Vector3(80, 60, 0);

		const shadowGenerator = new BABYLON.ShadowGenerator(GAME_CONFIG.shadowMapSize, shadowLight);
		shadowGenerator.useBlurExponentialShadowMap = true;
		shadowGenerator.blurKernel = GAME_CONFIG.shadowBlurKernel;

		// Paddles
		this.setupPaddles(scene, shadowGenerator);

		// Ball
		this.setupBall(scene, shadowGenerator);

		// Ground
		this.setupGround(scene);

		// Field Markings
		this.setupFieldMarkings(scene);

		// Initialize Scorebar Names
		this.updateScorebarNames();

		this.gameManager.setCallbacks({
			onGoal: (_scorer: string, scores: any) => {
				this.updateScorebar(scores.left, scores.right);
			},
			onGameOver: (winner: string) => {
				console.log(`Game Over! Winner: ${winner}`);
			}
		});

		return scene;
	}

	public updateScorebarNames() {
		const names = this.gameManager.gameState.playerNames;
		const leftNameEl = document.getElementById('pong-left-name');
		const rightNameEl = document.getElementById('pong-right-name');

		if (leftNameEl) leftNameEl.textContent = names.left;
		if (rightNameEl) rightNameEl.textContent = names.right;
	}

	public updateScorebar(left: number, right: number) {
		const scoreEl = document.getElementById('pong-center-score');
		if (scoreEl) {
			scoreEl.textContent = `${left} - ${right}`;
		}
	}

	private setupPaddles(scene: BABYLON.Scene, shadowGenerator: BABYLON.ShadowGenerator) {
		const gameState = this.gameManager.getGameState();
		const worldHeight = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ;
		const paddleVisualDepth = gameState.paddles.left.height * worldHeight;

		const rightPaddleMat = new BABYLON.StandardMaterial("rightPaddleMat", scene);
		rightPaddleMat.diffuseColor = COLORS.rightPaddle;
		rightPaddleMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
		rightPaddleMat.specularPower = 8;

		this.rightPaddleMesh = BABYLON.MeshBuilder.CreateBox("rightPaddle", {
			height: GAME_CONFIG.paddleHeight,
			width: GAME_CONFIG.paddleWidth,
			depth: paddleVisualDepth
		}, scene);
		this.rightPaddleMesh.material = rightPaddleMat;
		this.rightPaddleMesh.position.set(WORLD_BOUNDS.maxX, GAME_CONFIG.paddleY, 0);

		const leftPaddleMat = new BABYLON.StandardMaterial("leftPaddleMat", scene);
		leftPaddleMat.diffuseColor = COLORS.leftPaddle;
		leftPaddleMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
		leftPaddleMat.specularPower = 8;

		this.leftPaddleMesh = BABYLON.MeshBuilder.CreateBox("leftPaddle", {
			height: GAME_CONFIG.paddleHeight,
			width: GAME_CONFIG.paddleWidth,
			depth: paddleVisualDepth
		}, scene);
		this.leftPaddleMesh.material = leftPaddleMat;
		this.leftPaddleMesh.position.set(WORLD_BOUNDS.minX, GAME_CONFIG.paddleY, 0);

		shadowGenerator.addShadowCaster(this.rightPaddleMesh);
		shadowGenerator.addShadowCaster(this.leftPaddleMesh);
	}

	private setupBall(scene: BABYLON.Scene, shadowGenerator: BABYLON.ShadowGenerator) {
		const gameState = this.gameManager.getGameState();
		const worldHeight = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ;
		const ballVisualDiameter = gameState.ball.radius * worldHeight * 2;

		const ballMaterial = new BABYLON.StandardMaterial("ballMat", scene);
		ballMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
		ballMaterial.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);

		this.ballMesh = BABYLON.MeshBuilder.CreateSphere("ball", {
			diameter: ballVisualDiameter,
			segments: GAME_CONFIG.ballSegments
		}, scene);
		this.ballMesh.material = ballMaterial;
		this.ballMesh.position.set(0, GAME_CONFIG.ballY, 0);

		shadowGenerator.addShadowCaster(this.ballMesh);
	}

	private setupGround(scene: BABYLON.Scene) {
		const fieldWidth = this._fieldWidth;
		const fieldDepth = this._fieldDepth;

		const ground = BABYLON.MeshBuilder.CreateGround("ground", {
			width: fieldWidth * GAME_CONFIG.groundScale,
			height: fieldDepth * GAME_CONFIG.groundScale
		}, scene);
		ground.position.y = GAME_CONFIG.groundY;
		ground.receiveShadows = true;

		this._groundPosition = ground.position.clone();
		this._targetOffset = new BABYLON.Vector3(0, 0, -this._fieldDepth * 0.23);

		const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
		groundMaterial.diffuseColor = COLORS.ground;
		groundMaterial.specularColor = BABYLON.Color3.Black();
		groundMaterial.alpha = 1;
		ground.material = groundMaterial;

		const camera = scene.activeCamera as BABYLON.ArcRotateCamera;
		camera.setTarget(this._groundPosition.add(this._targetOffset));
	}

	private setupFieldMarkings(scene: BABYLON.Scene) {
		const markMaterial = new BABYLON.StandardMaterial("markMat", scene);
		markMaterial.diffuseColor = COLORS.marking;
		markMaterial.specularColor = BABYLON.Color3.Black();

		const lineThickness = GAME_CONFIG.lineThickness;
		const markY = GAME_CONFIG.markerY;
		const fieldWidth = this._fieldWidth;
		const fieldDepth = this._fieldDepth;

		const createBoundary = (name: string, width: number, depth: number, x: number, z: number) => {
			const mesh = BABYLON.MeshBuilder.CreateBox(name, { width, height: 0.1, depth }, scene);
			mesh.position.set(x, markY, z);
			mesh.material = markMaterial;
		};

		createBoundary("topBoundary", fieldWidth + lineThickness, lineThickness, 0, WORLD_BOUNDS.maxZ);
		createBoundary("bottomBoundary", fieldWidth + lineThickness, lineThickness, 0, WORLD_BOUNDS.minZ);
		createBoundary("leftBoundary", lineThickness, fieldDepth + lineThickness, WORLD_BOUNDS.minX, 0);
		createBoundary("rightBoundary", lineThickness, fieldDepth + lineThickness, WORLD_BOUNDS.maxX, 0);
		createBoundary("centerLine", lineThickness, fieldDepth, 0, 0);
	}

	setupRenderLoop() {
		this.engine?.runRenderLoop(() => {
			this.gameManager.update();

			const worldCoords = this.gameManager.getWorldCoordinates(
				WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX,
				WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ
			);

			this.ballMesh?.position.set(worldCoords.ball.x, GAME_CONFIG.ballY, worldCoords.ball.z);
			this.leftPaddleMesh?.position.set(WORLD_BOUNDS.minX, GAME_CONFIG.paddleY, worldCoords.paddles.left.z);
			this.rightPaddleMesh?.position.set(WORLD_BOUNDS.maxX, GAME_CONFIG.paddleY, worldCoords.paddles.right.z);

			this.scene?.render();
		});
	}

	setupResize() {
		window.addEventListener("resize", () => {
			this.engine?.resize();
			if (this._fitCamera && this.scene && this.scene.activeCamera) {
				const fit = this._fitCamera(this._fieldWidth, this._fieldDepth);
				const cam = this.scene.activeCamera as BABYLON.ArcRotateCamera;
				if (cam.radius !== undefined) {
					cam.alpha = fit.alpha;
					cam.beta = fit.beta;
					cam.radius = fit.radius;
					if (this._groundPosition) {
						cam.setTarget(this._groundPosition.add(this._targetOffset || BABYLON.Vector3.Zero()));
					}
				}
			}
		});
	}

	updateOnlineState(serverState: any) {
		if (this.gameManager.mode !== GAME_MODES.ONLINE) return;
		if (this.gameManager.networkController) {
			this.gameManager.networkController.setServerGameState(serverState);
		}
	}

	changeMode(mode: string, config: any = {}) {
		this.gameManager.changeMode(mode, config);
	}

	destroy() {
		this.gameManager.destroy();
		this.engine?.dispose();
	}
}

export { GAME_MODES };
