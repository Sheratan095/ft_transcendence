/**
 * Tic-Tac-Toe Game Manager
 * Orchestrates game state, input controllers, and UI updates
 */

import * as Physics from './game/physics';
import { LocalInputController, AIController, NetworkInputController } from './game/InputController';
import type { InputController } from './game/InputController';
import { BoardRenderer } from './game/ui';
import { showSuccessToast, showErrorToast } from '../shared/Toast';
import { getUserId } from '../../lib/auth';
import type { GameState } from './game/physics';

export const TRIS_MODES = {
  ONLINE: 'online',
  OFFLINE_1V1: 'offline-1v1',
  OFFLINE_AI: 'offline-ai'
};

export class GameManager {
  private mode: string;
  private gameState: GameState;
  private renderer: BoardRenderer;
  private playerXController: InputController | null = null;
  private playerOController: InputController | null = null;
  private networkConnector: NetworkInputController | null = null;
  
  private userId: string | null;
  private userSymbol: string | null = null;
  private isUserTurn: boolean = false;
  private userReady: boolean = false;
  private isPaused: boolean = true;

  private onGameEndedCallback?: (result: string) => void;

  constructor(mode: string) {
    this.mode = mode;
    this.userId = getUserId();
    this.gameState = Physics.initGameState();
    this.renderer = new BoardRenderer();
    
    this.initializeMode();
  }

  public onGameEnded(callback: (result: string) => void) {
    this.onGameEndedCallback = callback;
  }

  private initializeMode(): void {
    this.renderer.updateStatus('Initializing mode...');
    
    switch (this.mode) {
      case TRIS_MODES.OFFLINE_1V1:
        this.playerXController = new LocalInputController();
        this.playerOController = new LocalInputController();
        this.playerXController.onMove(m => this.handleLocalMove('X', m));
        this.playerOController.onMove(m => this.handleLocalMove('O', m));
        this.renderer.updateStatus('Press Start to play');
        this.renderer.toggleInteraction(false);
        break;

      case TRIS_MODES.OFFLINE_AI:
        this.playerXController = new LocalInputController();
        this.playerOController = new AIController(this.gameState, 'O');
        this.playerXController.onMove(m => this.handleLocalMove('X', m));
        this.playerOController.onMove(m => this.handleLocalMove('O', m));
        this.renderer.updateStatus('Press Start to play');
		
        this.renderer.toggleInteraction(false);
        break;

      case TRIS_MODES.ONLINE:
        this.networkConnector = new NetworkInputController();
        this.networkConnector.onMove(m => this.handleLocalMove(this.userSymbol === 'X' ? 'O' : 'X', m));
        this.renderer.updateStatus('Ready to play online');
        this.renderer.toggleInteraction(false);
        break;
    }
  }

  /**
   * Main incoming move handler for local/offline modes
   */
  private async handleLocalMove(player: string, position: number) {
    if (this.mode === TRIS_MODES.ONLINE) {
      // Logic handled via WebSocket in handleNetworkEvent
      return;
    }

    if (this.isPaused || this.gameState.currentPlayer !== player || this.gameState.isGameOver) {
      return;
    }

    if (!Physics.isValidMove(this.gameState, position)) {
      showErrorToast('Invalid move');
      return;
    }

    this.gameState = Physics.applyMove(this.gameState, position);
    this.renderer.updateBoard(this.gameState.board);

    if (this.gameState.isGameOver) {
      this.handleGameOver();
    } else {
      this.updateStatusText();
      
      // If next player is AI, trigger it
      if (this.mode === TRIS_MODES.OFFLINE_AI && this.gameState.currentPlayer === 'O') {
        const ai = this.playerOController as AIController;
        if (ai && ai.generateMove) {
          await ai.generateMove();
        }
      }
    }
  }

  /**
   * External event router for Online mode (connected from modal/ws)
   */
  public handleNetworkEvent(event: string, data: any) {
	if (this.mode !== TRIS_MODES.ONLINE) return;

	switch (event) {
	  case 'tris.gameStarted':
		this.userSymbol = data.yourSymbol;
		this.isUserTurn = data.yourTurn;
		this.renderer.renderBoard(); // Fresh board
		this.renderer.toggleInteraction(this.isUserTurn);
		this.updateNetworkStatus();
		showSuccessToast(`Game started! You are ${this.userSymbol}`);
		break;

	  case 'tris.moveMade':
		this.renderer.updateCell(data.position, data.symbol);
		if (data.removedPosition !== null && data.removedPosition !== undefined) {
		  this.renderer.updateCell(data.removedPosition, '');
		}
		this.isUserTurn = (data.moveMakerId !== this.userId);
		this.renderer.toggleInteraction(this.isUserTurn);
		this.updateNetworkStatus();
		break;

	  case 'tris.gameEnded':
		this.handleOnlineGameOver(data);
		break;
	}
  }

  private handleGameOver() {
    this.renderer.toggleInteraction(false);
    let msg = 'Game Over! Draw';
    if (this.gameState.winner) {
      msg = `Game Over! Winner: ${this.gameState.winner}`;
      if (this.mode === TRIS_MODES.OFFLINE_AI) {
        msg = this.gameState.winner === 'X' ? 'You won!' : 'Bot won!';
      }
    }
    this.renderer.updateStatus(msg);
    if (this.gameState.winner === 'X') showSuccessToast(msg);
    else showErrorToast(msg);

    if (this.onGameEndedCallback) {
      this.onGameEndedCallback(msg);
    }
  }

  private handleOnlineGameOver(data: any) {
	this.renderer.toggleInteraction(false);
	let message = '';
	if (data.quit) message = 'Opponent quit';
	else if (data.timedOut) message = 'Move timeout';
	else if (data.winner === this.userId) message = 'You won!';
	else message = 'You lost!';

	this.renderer.updateStatus(message);
	if (data.winner === this.userId) showSuccessToast(message);
	else showErrorToast(message);

    if (this.onGameEndedCallback) {
      this.onGameEndedCallback(message);
    }
  }

  public updateStatusText() {
    if (this.gameState.isGameOver) return;

    const turn = this.gameState.currentPlayer;
    let text = "";

    if (this.mode === TRIS_MODES.OFFLINE_AI) {
      text = turn === "X" ? "You (X)'s turn" : "Ai (O) is thinking...";
    } else {
      text = turn === "X" ? "Player Left (X)" : "Player Right (O)";
    }
    this.renderer.updateStatus(text);
  }

  private updateNetworkStatus() {
	const status = this.isUserTurn ? 'Your turn!' : 'Opponent\'s turn';
	this.renderer.updateStatus(status);
  }

  public reset() {
    this.gameState = Physics.initGameState();
    this.renderer.renderBoard();
    this.isPaused = true;
    this.initializeMode();
  }

  public pauseGame() {
    this.isPaused = true;
    this.renderer.toggleInteraction(false);
  }

  public resumeGame() {
    this.isPaused = false;
    this.renderer.toggleInteraction(true);
  }

  public destroy() {
    this.playerXController?.destroy();
    this.playerOController?.destroy();
    this.networkConnector?.destroy();
  }
}
