/**
 * Tic-Tac-Toe Game Manager
 * Orchestrates game state, input controllers, and UI updates
 */

import * as Physics from './game/physics';
import { LocalInputController, AIController, NetworkInputController } from './game/InputController';
import type { InputController } from './game/InputController';
import { BoardRenderer } from './game/ui';
import { getUserId } from '../../lib/auth';
import { makeTrisMove } from './ws';
import type { GameState } from './game/physics';
import { t } from '../../lib/intlayer';

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
  private onlineBoardClickHandler: ((e: MouseEvent) => void) | null = null;

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
        this.renderer.updateStatus(t('game.status-online'));
        this.renderer.toggleInteraction(false);
        // Attach click handler for sending moves to the server
        this.onlineBoardClickHandler = (e: MouseEvent) => {
          if (!this.isUserTurn) return;
          const target = e.target as HTMLElement;
          const cell = target.closest('[data-index]') as HTMLElement | null;
          const cellIndex = cell?.dataset?.index;
          if (cellIndex === undefined || cellIndex === null) return;
          const pos = parseInt(cellIndex);
          this.isUserTurn = false;
          this.renderer.toggleInteraction(false);
          makeTrisMove(pos);
        };
        document.getElementById('tris-board')?.addEventListener('click', this.onlineBoardClickHandler);
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
      return;
    }

    this.gameState = Physics.applyMove(this.gameState, position);
    this.renderer.updateBoard(this.gameState.board);

    // Update AI's gameState reference if in AI mode
    if (this.mode === TRIS_MODES.OFFLINE_AI && this.playerOController instanceof AIController) {
      (this.playerOController as AIController).updateGameState(this.gameState);
    }

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
		break;

	  case 'tris.moveMade':
    // Apply server move to local game state so client stays in sync
    const pos: number = data.position;
    const sym: string = data.symbol;
    const removed: number | null = data.removedPosition !== undefined ? data.removedPosition : null;

    // Update board array
    this.gameState.board[pos] = sym;
    if (removed !== null) {
      this.gameState.board[removed] = null;
    }

    // Update move history conservatively
    this.gameState.moveHistory = [...this.gameState.moveHistory, pos];
    if (removed !== null) {
      const idx = this.gameState.moveHistory.indexOf(removed);
      if (idx !== -1) this.gameState.moveHistory.splice(idx, 1);
    }

    // Recompute winner / game over state locally
    this.gameState.winner = Physics.checkWinner(this.gameState.board);
    this.gameState.isGameOver = !!this.gameState.winner || this.gameState.board.every(cell => cell !== null);

    // Update UI from authoritative gameState
    this.renderer.updateBoard(this.gameState.board);

    this.isUserTurn = (data.moveMakerId !== this.userId);
    this.renderer.toggleInteraction(this.isUserTurn);
    this.updateNetworkStatus();

    if (this.gameState.isGameOver) {
      this.handleGameOver();
    }
		break;

	  case 'tris.gameEnded':
		this.handleOnlineGameOver(data);
		break;
	}
  }

  private handleGameOver() {
    this.renderer.toggleInteraction(false);
    let msg = t('game.draw');
    if (this.gameState.winner) {
      msg = t('game.winner', { winner: this.gameState.winner });
      if (this.mode === TRIS_MODES.OFFLINE_AI) {
        msg = this.gameState.winner === 'X' ? t('game.player-victory') : t('game.opponent-victory');
      }
    }
    this.renderer.updateStatus(msg);


    if (this.onGameEndedCallback) {
      this.onGameEndedCallback(msg);
    }
  }

  private handleOnlineGameOver(data: any) {
	this.renderer.toggleInteraction(false);
	let message = '';
	if (data.quit) message = t('game.quit');
	else if (data.timedOut) message = t('game.timeout');
	else if (data.winner === this.userId) message = t('game.player-victory');
	else message =t('game.player-defeat');

	this.renderer.updateStatus(message);

    if (this.onGameEndedCallback) {
      this.onGameEndedCallback(message);
    }
  }

  public updateStatusText() {
    if (this.gameState.isGameOver) return;

    const turn = this.gameState.currentPlayer;
    let text = "";

    if (this.mode === TRIS_MODES.OFFLINE_AI) {
      text = turn === "X" ? t('game.player-turn') : t('game.opponent-turn');
    } else {
      text = turn === "X" ? t('game.player-turn') : t('game.opponent-turn');
    }
    this.renderer.updateStatus(text);
  }

  private updateNetworkStatus() {
	const status = this.isUserTurn ? t('game.player-turn') : t('game.opponent-turn');
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
    if (this.onlineBoardClickHandler) {
      document.getElementById('tris-board')?.removeEventListener('click', this.onlineBoardClickHandler);
      this.onlineBoardClickHandler = null;
    }
  }
}
