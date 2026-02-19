
import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";
import { GameManager, GAME_MODES } from "./game/GameManager.ts";

/**
 * World coordinate bounds for converting normalized to 3D
 */
const fieldWidthEnv = parseInt(import.meta.env.VITE_FIELD_WIDTH) || 130;
const fieldHeightEnv = parseInt(import.meta.env.VITE_FIELD_HEIGHT) || 70;

export const WORLD_BOUNDS = {
  minX: -fieldWidthEnv / 2,
  maxX: fieldWidthEnv / 2,
  minZ: -fieldHeightEnv / 2,
  maxZ: fieldHeightEnv / 2
};

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
    if (!this.canvas) {
      throw new Error(`Canvas with id ${canvasId} not found`);
    }

    this.engine = new BABYLON.Engine(this.canvas, true, { preserveDrawingBuffer: true, stencil: true, premultipliedAlpha: false, alpha: true });
    // allow placing the human player on the right side for the current top-down camera
    const gmConfig = { ...config };
    if (mode === GAME_MODES.LOCAL_VS_AI && gmConfig.playerSide === undefined) gmConfig.playerSide = "right";
    this.gameManager = new GameManager(mode, gmConfig);
    this.scene = this.createScene();
    
    this.setupRenderLoop();
    this.setupResize();
  }

  createScene() {
    const scene = new BABYLON.Scene(this.engine!);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // transparent background

    // compute field dimensions early so we can fit the camera to the field
    this._fieldWidth = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX;
    this._fieldDepth = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ;

    this._fitCamera = (width, depth) => {
      const maxDim = Math.max(width, depth); // use the larger dimension to set camera distance, ensuring the whole field fits in view
      const radius = 110; // distance from camera to target (field center), set based on field size but with a reasonable minimum
      const beta = 0.6; // near top-down (smaller = more overhead)
      const alpha = -(Math.PI / 2); // face the long axis
      return { alpha, beta, radius };
    };

    /* =======================
       CAMERA
    ======================= */
    // use ArcRotateCamera so we can position it near-top and allow smooth wheel-zoom
    const fit = this._fitCamera(this._fieldWidth, this._fieldDepth);
    const camera = new BABYLON.ArcRotateCamera(
      "camera",
      fit.alpha,
      fit.beta,
      fit.radius,
      new BABYLON.Vector3(0, 0, 0),
      scene
    );
    // Do NOT attach any controls to the camera: fully disable user interaction
    camera.inputs.clear();
    camera.detachControl();
    camera.lowerRadiusLimit = Math.max(10, Math.max(this._fieldWidth, this._fieldDepth) * 0.3);
    camera.upperRadiusLimit = Math.max(200, Math.max(this._fieldWidth, this._fieldDepth) * 4);
    scene.activeCamera = camera;

    /* =======================
       LIGHT
    ======================= */
    const light = new BABYLON.HemisphericLight(
      "light",
      new BABYLON.Vector3(60, 100, 20),
      scene
    );
    light.intensity = 0.5; // reduced significantly so shadows are visible and colors don't wash out

    /* =======================
       SHADOW LIGHT
    ======================= */
    const shadowLight = new BABYLON.DirectionalLight(
      "shadowLight",
      new BABYLON.Vector3(-1, -2, -1),
      scene
    );
    shadowLight.position = new BABYLON.Vector3(80, 60, 0);

    const shadowGenerator = new BABYLON.ShadowGenerator(1024, shadowLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 32;

    /* =======================
       PADDLES (Babylon meshes)
    ======================= */
    const gameState = this.gameManager.getGameState();
    const worldHeight = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ;
    const paddleVisualDepth = gameState.paddles.left.height * worldHeight;
    const ballVisualDiameter = gameState.ball.radius * worldHeight * 2;

    // Create materials for paddles with controlled diffuse and low specular to preserve color
    const rightPaddleMat = new BABYLON.StandardMaterial("rightPaddleMat", scene);
    rightPaddleMat.diffuseColor = new BABYLON.Color3(1, 0, 0); // red
    rightPaddleMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // low specular to avoid washout
    rightPaddleMat.specularPower = 8;

    const leftPaddleMat = new BABYLON.StandardMaterial("leftPaddleMat", scene);
    leftPaddleMat.diffuseColor = new BABYLON.Color3(0, 0, 1); // blue
    leftPaddleMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // low specular
    leftPaddleMat.specularPower = 8;

    this.rightPaddleMesh = BABYLON.MeshBuilder.CreateBox("rightPaddle", {
      height: 1, width: 1.5, depth: paddleVisualDepth
    }, scene);
    this.rightPaddleMesh.material = rightPaddleMat;
    this.rightPaddleMesh.position.set(WORLD_BOUNDS.maxX, 3, 0);

    this.leftPaddleMesh = BABYLON.MeshBuilder.CreateBox("leftPaddle", {
      height: 1, width: 1.5, depth: paddleVisualDepth
    }, scene);
    this.leftPaddleMesh.material = leftPaddleMat;
    this.leftPaddleMesh.position.set(WORLD_BOUNDS.minX, 3, 0);

    /* =======================
       BALL
    ======================= */
    this.ballMesh = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: ballVisualDiameter, segments: 32 }, scene);
    this.ballMesh.position.set(0, 3, 0);

    shadowGenerator.addShadowCaster(this.ballMesh);
    shadowGenerator.addShadowCaster(this.rightPaddleMesh);
    shadowGenerator.addShadowCaster(this.leftPaddleMesh);

    /* =======================
       GROUND
    ======================= */
    const fieldWidth = this._fieldWidth;
    const fieldDepth = this._fieldDepth;
    
    // Create ground slightly larger than the field
    const ground = BABYLON.MeshBuilder.CreateGround("ground", { 
      width: fieldWidth * 1.25, 
      height: fieldDepth * 1.25
    }, scene);
    ground.position.y = -1;
    ground.receiveShadows = true;
    // save ground center for camera targeting and resize re-fit
    this._groundPosition = ground.position.clone();
    // offset target so the field center appears higher in the canvas
    // negative Z moves the target away from the camera, lifting the field up on screen
    this._targetOffset = new BABYLON.Vector3(0, 0, -this._fieldDepth * 0.1);

    const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.2);
    groundMaterial.specularColor = BABYLON.Color3.Black();
    // keep the ground visible (green) while scene background remains transparent
    groundMaterial.alpha = 1;
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

    camera.setTarget(this._groundPosition.add(this._targetOffset));

    /* =======================
       GAME MANAGER CALLBACKS
    ======================= */
    this.gameManager.setCallbacks({
      onGoal: (scorer, scores) => {

        

      },
      onGameOver: (winner) => {

        

      }
    });

    return scene;
  }

  setupRenderLoop() {
    this.engine?.runRenderLoop(() => {
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
      this.ballMesh?.position.set(worldCoords.ball.x, 3, worldCoords.ball.z);
      this.leftPaddleMesh?.position.set(WORLD_BOUNDS.minX, 3, worldCoords.paddles.left.z);
      this.rightPaddleMesh?.position.set(WORLD_BOUNDS.maxX, 3, worldCoords.paddles.right.z);

      this.scene?.render();
    });
  }

  setupResize() {
    window.addEventListener("resize", () => {
      this.engine?.resize();
      // re-fit ArcRotateCamera to field when the canvas size changes
      if (this._fitCamera && this.scene && this.scene.activeCamera) {
        const fit = this._fitCamera(this._fieldWidth, this._fieldDepth);
        const cam = this.scene.activeCamera as BABYLON.ArcRotateCamera;
        if (cam.radius !== undefined) {
          cam.alpha = fit.alpha;
          cam.beta = fit.beta;
          cam.radius = fit.radius;
          if (this._groundPosition) cam.setTarget(this._groundPosition.add(this._targetOffset || BABYLON.Vector3.Zero()));
        }
      }
    });
  }

  // --- External API ---

  updateOnlineState(serverState) {
    if (this.gameManager.mode !== GAME_MODES.ONLINE) return;
    
    // Pass server state to network controller if it exists
    if (this.gameManager.networkController) {
      this.gameManager.networkController.setServerGameState(serverState);
    }
  }

  changeMode(mode, config = {}) {
    this.gameManager.changeMode(mode, config);



  }

  destroy() {
    this.gameManager.destroy();
    this.engine?.dispose();
  }
}

// Map between HTML modes and GameManager modes
export { GAME_MODES };
