// ============================================================
// TournamentModal — sole owner of the tournament modal UI
// ============================================================

import { loadTournaments } from './TournamentsList';
import { getUserId } from '../../lib/auth';
import { t } from '../../lib/intlayer';

// -------------------- Types --------------------

export interface TournamentInfo {
	name?: string;
	status?: string;
	creatorId?: string;
	creatorUsername?: string;
	creatorAvatar?: string;
}

interface Match {
	id: string;
	playerLeftId: string;
	playerLeftUsername: string;
	playerRightId: string;
	playerRightUsername: string;
	playerLeftScore?: number;
	playerRightScore?: number;
	status?: string;
	winnerId?: string;
	isBye?: boolean;
}

interface Round {
	roundNumber: number;
	matches: Match[];
}

interface BracketInfo {
	rounds: Round[];
	name?: string;
	status?: string;
	totalRounds?: number;
	currentRound?: number;
	participantCount?: number;
	tournamentId?: string;
}

// -------------------- State --------------------

let currentTournamentId: string | null = null;
let currentCreatorId: string | undefined;
let currentUserId: string | null = null;
let currentTournamentStatus: string | null = null;
let cooldownInterval: number | null = null;
let lastBracketData: BracketInfo | null = null;

// -------------------- Init (wire up buttons) --------------------

document.addEventListener('DOMContentLoaded', () => {
	const startBtn   = document.getElementById('tm-btn-start');
	const cancelBtn  = document.getElementById('tm-btn-cancel');
	const quitBtn    = document.getElementById('tm-btn-quit');

	if (startBtn)  startBtn.addEventListener('click', _handleStart);
	if (cancelBtn) cancelBtn.addEventListener('click', _handleCancel);
	if (quitBtn)   quitBtn.addEventListener('click', _handleQuit);
});

// -------------------- Public API --------------------

export async function openTournamentModal(
	tournamentId: string,
	tournamentInfo: TournamentInfo,
	partecipants: any[],
) {
	currentTournamentId = tournamentId;
	currentCreatorId    = tournamentInfo.creatorId;
	currentUserId       = getUserId();

	const isCreator = currentUserId === currentCreatorId;

	console.log('[TournamentModal] Opening modal for tournament:', tournamentId);
	console.log('[TournamentModal] Tournament info:', tournamentInfo);
	console.log('[TournamentModal] Is creator?', isCreator, 'CurrentUserId:', currentUserId, 'CreatorId:', currentCreatorId);

	_setTournamentName(tournamentInfo.name ?? 'Tournament');
	currentTournamentStatus = tournamentInfo.status ?? 'WAITING';
	_setStatusBadge(currentTournamentStatus);
	_setCreator(tournamentInfo.creatorUsername, tournamentInfo.creatorId, tournamentInfo.creatorAvatar);
	_clearPlayerList();
	_clearBracket();
	_hideCooldown();
	_setActionButtons(isCreator, currentTournamentStatus);

	// Filter out creator from participant display list (but count includes creator)
	const nonCreatorParticipants = partecipants.filter(p => p.id !== tournamentInfo.creatorId && !p.isCreator);

	for (const p of nonCreatorParticipants) {
		_appendParticipantCard(p);
	}

	// Count includes the creator + other participants
	_setCount(partecipants.length);
	_showModal();
}

export async function closeTournamentModal() {
	_hideModal();
	currentTournamentId = null;
	currentCreatorId    = undefined;
	lastBracketData     = null;
	_stopCooldown();
	await loadTournaments(); // Refresh the tournament list when modal closes
}

export async function addPartecipantToModal(tournamentId: string, player: any) {
	if (String(tournamentId) !== String(currentTournamentId)) return;

	const isCreator = player.id === currentCreatorId || !!player.isCreator;
	if (!isCreator) {
		_appendParticipantCard(player);
	}

	// Always increment count (includes creator)
	_incrementCount(1);
}

export async function removePartecipantFromModal(tournamentId: string, player: any) {
	if (String(tournamentId) !== String(currentTournamentId)) return;

	const isCreator = player.id === currentCreatorId || !!player.isCreator;
	const element = document.getElementById(`tm-player-${player.id}`);
	if (element && !isCreator) {
		element.remove();
	}

	// Always decrement count (includes creator)
	_incrementCount(-1);
}

export async function updateBracketInModal(tournamentId: string, bracketInfo: BracketInfo) {
	if (String(tournamentId) !== String(currentTournamentId)) return;

	if (!bracketInfo) {
		console.error('[TournamentModal] bracketInfo is undefined');
		return;
	}
	// Persist rounds so they can be reused when tournament ends
	if (bracketInfo.rounds?.length) {
		lastBracketData = { ...bracketInfo };
	}
	if (bracketInfo.status) {
		currentTournamentStatus = bracketInfo.status;
		_setStatusBadge(bracketInfo.status);
		_setActionButtons(currentUserId === currentCreatorId, currentTournamentStatus);
	}

	try {
		_renderBracket(bracketInfo);
	} catch (error) {
		console.error('[TournamentModal] Failed to render bracket:', error);
		const container = document.getElementById('tm-bracket-container');
		if (container) {
			const errorEl = document.createElement('p');
			errorEl.className = 'text-red-500 font-bold italic uppercase text-sm m-auto select-none p-4';
			errorEl.textContent = t('tournament.bracketError');
			container.innerHTML = '';
			container.appendChild(errorEl);
		}
	}
}

/**
 * Called when pong.tournamentEnded fires. Re-renders the stored bracket with
 * FINISHED status so the winner row gets the highlighted background and crown.
 */
export async function markTournamentFinished(tournamentId: string, winnerId: string, winnerUsername: string) {
	if (String(tournamentId) !== String(currentTournamentId)) return;

	currentTournamentStatus = 'FINISHED';
	_setStatusBadge('FINISHED');
	_setActionButtons(currentUserId === currentCreatorId, 'FINISHED');

	if (!lastBracketData) return;

	const finishedBracket: BracketInfo = { ...lastBracketData, status: 'FINISHED' };
	try {
		_renderBracket(finishedBracket);
	} catch (error) {
		console.error('[TournamentModal] Failed to re-render bracket on tournament end:', error);
	}
}

export async function updateCooldownInModal(tournamentId: string, cooldownInfo: any) {
	if (String(tournamentId) !== String(currentTournamentId)) return;

	const overlay  = document.getElementById('tm-cooldown-overlay');
	const roundEl  = document.getElementById('tm-cooldown-round');
	const timerEl  = document.getElementById('tm-cooldown-timer');
	if (!overlay) return;

	_stopCooldown();

	if (!cooldownInfo || cooldownInfo.secondsLeft <= 0) {
		_hideCooldown();
		return;
	}

	const roundNum = cooldownInfo.round ?? '';
	if (roundEl) roundEl.textContent = roundNum ? t('tournament.roundIn', { n: roundNum }) : t('tournament.nextRoundIn');
	let seconds = Math.ceil(cooldownInfo.secondsLeft);
	if (timerEl) timerEl.textContent = String(seconds);
	overlay.classList.remove('hidden');

	cooldownInterval = window.setInterval(() => {
		seconds -= 1;
		if (timerEl) timerEl.textContent = String(seconds);
		if (seconds <= 0) {
			_stopCooldown();
			_hideCooldown();
		}
	}, 1000);
}

// -------------------- Private helpers --------------------

function _showModal() {
	document.getElementById('tournament-modal')?.classList.remove('hidden');
}

function _hideModal() {
	document.getElementById('tournament-modal')?.classList.add('hidden');
}

function _hideCooldown() {
	document.getElementById('tm-cooldown-overlay')?.classList.add('hidden');
}

function _stopCooldown() {
	if (cooldownInterval !== null) {
		clearInterval(cooldownInterval);
		cooldownInterval = null;
	}
}

function _setTournamentName(name: string) {
	const el = document.getElementById('tm-tournament-name');
	if (el) el.textContent = name;
}

function _setStatusBadge(status: string) {
	const el = document.getElementById('tm-tournament-status');
	if (!el) return;
	el.className   = 'text-[10px] font-black uppercase px-2 py-0.5 rounded';
	switch (status.toUpperCase()) {
		case 'OPEN':
		case 'WAITING':
			el.classList.add('bg-green-500', 'text-white');
			el.textContent = t('tournament.statusWaiting');
			break;
		case 'IN_PROGRESS':
		case 'STARTED':
			el.classList.add('bg-yellow-400', 'text-black');
			el.textContent = t('tournament.statusInProgress');
			break;
		case 'FINISHED':
			el.classList.add('bg-gray-400', 'text-white');
			el.textContent = t('tournament.statusFinished');
			break;
		default:
			el.classList.add('bg-black', 'text-white');
	}
}

function _setCount(n: number) {
	const el = document.getElementById('tm-participant-count');
	if (el) el.textContent = n !== 1 ? t('tournament.playerCountPlural', { count: n }) : t('tournament.playerCount', { count: n });
}

function _incrementCount(delta: number) {
	const el = document.getElementById('tm-participant-count');
	if (!el) return;
	const current = parseInt(el.textContent ?? '0') || 0;
	_setCount(current + delta);
}

function _setCreator(username?: string, id?: string, avatar?: string) {
	const nameEl   = document.getElementById('tm-creator-name');
	const avatarEl = document.getElementById('tm-creator-avatar');
	const display  = username ?? '—';
	if (nameEl)   nameEl.textContent   = display.toUpperCase();
	if (avatarEl) {
		avatarEl.innerHTML = '';
		if (avatar) {
			const img = document.createElement('img');
			img.src = avatar;
			img.alt = display;
			img.className = 'w-full h-full object-cover rounded-lg';
			img.onerror = () => {
				avatarEl.innerHTML = display.slice(0, 2).toUpperCase();
			};
			avatarEl.appendChild(img);
		} else {
			avatarEl.textContent = display.slice(0, 2).toUpperCase();
		}
		const color = _avatarColor(id ?? username ?? '?');
		avatarEl.className = `w-10 h-10 flex-shrink-0 rounded-lg ${color} border-2 border-gray-800 flex items-center justify-center font-black text-black text-sm overflow-hidden`;
	}
}

function _clearPlayerList() {
	const el = document.getElementById('tm-player-list');
	if (el) el.innerHTML = '';
}

function _clearBracket() {
	const el = document.getElementById('tm-bracket-container');
	if (el) {
		el.innerHTML = '';
		const placeholder = document.createElement('p');
		placeholder.className = 'text-gray-400 font-bold italic uppercase text-sm m-auto select-none';
		placeholder.textContent = t('tournament.waitingToStart');
		el.appendChild(placeholder);
	}
	const svg = document.getElementById('tm-connector-svg');
	if (svg) svg.innerHTML = '';
}

function _appendParticipantCard(player: any) {
	const list = document.getElementById('tm-player-list');
	if (!list) return;
	list.appendChild(_createParticipantCard(player));
}

// -------------------- Participant card --------------------

const AVATAR_COLORS = [
	'bg-blue-400', 'bg-purple-400', 'bg-pink-400',
	'bg-yellow-400', 'bg-green-400', 'bg-red-400', 'bg-indigo-400',
];

function _avatarColor(seed: string): string {
	let h = 0;
	for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % AVATAR_COLORS.length;
	return AVATAR_COLORS[h];
}

function _createParticipantCard(player: any): HTMLElement {
	const card     = document.createElement('div');
	card.id        = `tm-player-${player.id}`;
	card.className = 'flex items-center gap-3 p-3 bg-white dark:bg-gray-700 border-2 border-gray-800 dark:border-gray-300 shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#0dff66] rounded-xl';

	const initials = (player.username ?? '?').slice(0, 2).toUpperCase();
	const color    = _avatarColor(player.id ?? player.username ?? '?');

	card.innerHTML = `
		<div class="w-10 h-10 flex-shrink-0 rounded-lg ${color} border-2 border-gray-800 flex items-center justify-center font-black text-white text-sm">${initials}</div>
		<div class="flex-1 min-w-0">
			<div class="font-black text-black dark:text-white text-sm truncate uppercase">${player.username ?? 'Unknown'}</div>
		</div>
	`;
	return card;
}

// -------------------- Bracket rendering --------------------

/**
 * Normalize bracket data to ensure all required fields have defaults
 */
function _normalizeBracket(tournament: BracketInfo): BracketInfo {
	if (!tournament.rounds) return tournament;

	const normalizedRounds = tournament.rounds.map(round => ({
		...round,
		matches: (round.matches || []).map(match => ({
			id: match.id || `match-${Math.random()}`,
			playerLeftId: match.playerLeftId || '',
			playerLeftUsername: match.playerLeftUsername || 'Unknown',
			playerRightId: match.playerRightId || '',
			playerRightUsername: match.playerRightUsername || 'Unknown',
			playerLeftScore: match.playerLeftScore ?? 0,
			playerRightScore: match.playerRightScore ?? 0,
			status: match.status || 'PENDING',
			winnerId: match.winnerId || undefined,
			isBye: match.isBye || false,
		}))
	}));

	return {
		...tournament,
		rounds: normalizedRounds
	};
}

function _renderBracket(tournament: BracketInfo) {
	const container = document.getElementById('tm-bracket-container');
	if (!container) return;

	container.innerHTML = '';

	// Normalize bracket data
	const normalizedTournament = _normalizeBracket(tournament);

	if (!normalizedTournament.rounds?.length) {
		const p = document.createElement('p');
		p.className   = 'text-gray-400 font-bold italic uppercase text-sm m-auto select-none';
		p.textContent = t('tournament.noBracketData');
		container.appendChild(p);
		return;
	}

	const matchElements: Record<string, HTMLElement> = {};
	const isLastRound = (roundIndex: number) => roundIndex === normalizedTournament.rounds.length - 1;
	const tournamentFinished = normalizedTournament.status === 'FINISHED';

	normalizedTournament.rounds.forEach((round, roundIndex) => {
		const col       = document.createElement('div');
		col.className   = 'flex flex-col justify-around min-w-[220px] flex-shrink-0 relative z-10 gap-4';
		col.dataset.round = String(roundIndex);

		// Round label
		const label     = document.createElement('div');
		label.className = 'text-center font-black text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 absolute -top-6 left-0 right-0';
		label.textContent = t('tournament.round', { n: round.roundNumber });
		col.style.position = 'relative';
		col.style.marginTop = '1.5rem';
		col.appendChild(label);

		round.matches.forEach((match) => {
			const box              = _createMatchBox(match, isLastRound(roundIndex), tournamentFinished);
			box.dataset.matchId    = match.id;
			box.dataset.roundIndex = String(roundIndex);
			matchElements[match.id] = box;
			col.appendChild(box);
		});

		container.appendChild(col);
	});

	// Draw connector lines after layout settles
	setTimeout(() => _drawConnectorLines(normalizedTournament, matchElements), 50);
}

function _createMatchBox(match: Match, isLastRound: boolean, tournamentFinished: boolean): HTMLElement {
	const box       = document.createElement('div');
	const isFinished = match.status === 'FINISHED';
	const leftWon   = isFinished && match.winnerId === match.playerLeftId && !match.isBye;
	const rightWon  = isFinished && match.winnerId === match.playerRightId && !match.isBye;

	box.className   = 'rounded-xl border-2 border-gray-800 dark:border-gray-600 overflow-hidden shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#444]';

	if (match.isBye) {
		const normalBgL = 'bg-white dark:bg-gray-900';
		const byeBg = 'bg-gray-50 dark:bg-gray-800';
		box.innerHTML = `
			<div class="flex justify-between items-center px-3 py-2 text-sm border-b border-gray-200 dark:border-gray-700 ${normalBgL}">
				<span class="flex-1 truncate font-bold text-gray-800 dark:text-gray-100">${match.playerLeftUsername || '—'}</span>
				<span class="ml-3 font-black min-w-5 text-right text-gray-400 dark:text-gray-500"></span>
			</div>
			<div class="flex justify-between items-center px-3 py-2 text-sm ${byeBg}">
				<span class="flex-1 truncate font-bold text-gray-800 dark:text-gray-100"><span class="text-green-600 dark:text-green-400">${t('tournament.bye')}</span></span>
				<span class="ml-3 font-black min-w-5 text-right text-gray-400 dark:text-gray-500"></span>
			</div>
			<div class="text-[10px] font-black uppercase text-center px-2 py-1 bg-gray-100 dark:bg-gray-900 text-gray-400 tracking-widest">${t('tournament.matchFinished')}</div>
		`;
		return box;
	}

	// Determine winner styling based on tournament state
	let winnerBg = 'bg-accent-blue dark:bg-accent-green';
	const showFinalWinnerStyling = tournamentFinished && isLastRound && isFinished;

	const normalBgL = 'bg-white dark:bg-gray-900';
	const normalBgR = 'bg-gray-50 dark:bg-gray-800';

	const leftScore  = isFinished ? String(match.playerLeftScore  ?? 0) : '';
	const rightScore = isFinished ? String(match.playerRightScore ?? 0) : '';

	const leftWinnerBg = (showFinalWinnerStyling && leftWon) ? winnerBg : normalBgL;
	const rightWinnerBg = (showFinalWinnerStyling && rightWon) ? winnerBg : normalBgR;
	const leftWinnerText = (showFinalWinnerStyling && leftWon) ? 'text-black' : 'text-gray-800 dark:text-gray-100';
	const rightWinnerText = (showFinalWinnerStyling && rightWon) ? 'text-black' : 'text-gray-800 dark:text-gray-100';
	const leftWinnerScore = (showFinalWinnerStyling && leftWon) ? 'text-black' : 'text-gray-400 dark:text-gray-500';
	const rightWinnerScore = (showFinalWinnerStyling && rightWon) ? 'text-black' : 'text-gray-400 dark:text-gray-500';

	const leftCrown = (showFinalWinnerStyling && leftWon) ? '👑 ' : '';
	const rightCrown = (showFinalWinnerStyling && rightWon) ? '👑 ' : '';

	box.innerHTML = `
		<div class="flex justify-between items-center px-3 py-2 text-sm border-b border-gray-200 dark:border-gray-700 ${leftWinnerBg}">
			<span class="flex-1 truncate font-bold ${leftWinnerText}">${leftCrown}${match.playerLeftUsername  || '—'}</span>
			<span class="ml-3 font-black min-w-5 text-right ${leftWinnerScore}">${leftScore}</span>
		</div>
		<div class="flex justify-between items-center px-3 py-2 text-sm ${rightWinnerBg}">
			<span class="flex-1 truncate font-bold ${rightWinnerText}">${rightCrown}${match.playerRightUsername || '—'}</span>
			<span class="ml-3 font-black min-w-5 text-right ${rightWinnerScore}">${rightScore}</span>
		</div>
		${isFinished ? `<div class="text-[10px] font-black uppercase text-center px-2 py-1 bg-gray-100 dark:bg-gray-900 text-gray-400 tracking-widest">${t('tournament.matchFinished')}</div>` : ''}
	`;
	return box;
}

function _drawConnectorLines(tournament: BracketInfo, matchElements: Record<string, HTMLElement>) {
	const svgEl   = document.getElementById('tm-connector-svg') as SVGSVGElement | null;
	const wrapper = document.getElementById('tm-bracket-svg-wrapper');
	if (!svgEl || !wrapper) return;

	svgEl.innerHTML = '';
	const wRect = wrapper.getBoundingClientRect();

	for (let ri = 0; ri < tournament.rounds.length - 1; ri++) {
		const curr = tournament.rounds[ri];
		const next = tournament.rounds[ri + 1];

		curr.matches.forEach((cm) => {
			// Only draw lines from matches that have a winner
			const winnerId = cm.winnerId;
			if (!winnerId) return;

			next.matches.forEach((nm) => {
				// Check if winner goes to left or right position
				const goesLeft  = nm.playerLeftId === winnerId;
				const goesRight = nm.playerRightId === winnerId;
				if (!goesLeft && !goesRight) return;

				const fromEl = matchElements[cm.id];
				const toEl   = matchElements[nm.id];
				if (!fromEl || !toEl) return;

				const fRect  = fromEl.getBoundingClientRect();
				const tRect  = toEl.getBoundingClientRect();

				const fromX  = fRect.right  - wRect.left;
				const fromY  = fRect.top    - wRect.top  + fRect.height / 2;
				const toX    = tRect.left   - wRect.left;
				const toY    = tRect.top    - wRect.top  + tRect.height / 2;
				const midX   = fromX + (toX - fromX) / 2;

				const path   = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				path.setAttribute('d',              `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`);
				path.setAttribute('stroke',         'var(--tm-line-color, #cbd5e1)');
				path.setAttribute('stroke-width',   '2');
				path.setAttribute('fill',           'none');
				path.setAttribute('stroke-linecap', 'round');
				svgEl.appendChild(path);
			});
		});
	}

	// Size SVG to match wrapper content
	svgEl.setAttribute('width',  String(wrapper.scrollWidth));
	svgEl.setAttribute('height', String(wrapper.scrollHeight));
}

// -------------------- Action buttons --------------------

function _setActionButtons(isCreator: boolean, status?: string): void {
	const creatorBtns = document.getElementById('tm-creator-buttons');
	const userBtns    = document.getElementById('tm-participant-buttons');

	const isStarted = status && ['IN_PROGRESS', 'STARTED', 'FINISHED'].includes(status);

	if (isStarted) {
		// When tournament has started, show quit button for everyone
		creatorBtns?.classList.add('hidden');
		userBtns?.classList.remove('hidden');
	} else if (isCreator) {
		// Before tournament starts, creator sees start/cancel buttons
		creatorBtns?.classList.remove('hidden');
		userBtns?.classList.add('hidden');
	} else {
		// Before tournament starts, non-creator sees quit button
		creatorBtns?.classList.add('hidden');
		userBtns?.classList.remove('hidden');
	}
}

async function _handleStart(): Promise<void> {
	if (!currentTournamentId) return;
	const { startTournament } = await import('./Tournament');
	await startTournament(currentTournamentId);
}

async function _handleCancel(): Promise<void> {
	if (!currentTournamentId) return;
	const { cancelTournament } = await import('./Tournament');
	await cancelTournament(currentTournamentId);
}

async function _handleQuit(): Promise<void> {
	if (!currentTournamentId) return;
	// Import here to avoid circular dependency
	const { leaveTournament } = await import('./Tournament');
	await leaveTournament(currentTournamentId);
}
