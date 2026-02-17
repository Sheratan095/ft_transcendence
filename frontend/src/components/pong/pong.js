
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

        

      },
      onGameOver: (winner) => {

        

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
    this.engine.dispose();
  }
}

// Map between HTML modes and GameManager modes
export { GAME_MODES };
