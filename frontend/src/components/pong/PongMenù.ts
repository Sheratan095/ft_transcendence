import { getUserId } from '../../lib/auth';
import { openPongModal } from './modal';
import { showErrorToast, showSuccessToast } from '../shared/Toast';
import { openGameInviteModal } from '../../lib/game-invite';
import { showTournamentListModal } from '../tournaments/TournamentsList';

export async function renderPongPage(container: HTMLElement)
{
	const template = document.getElementById('pong-template') as HTMLTemplateElement | null;
	if (!template)
	{
		container.innerHTML = '<div class="text-red-600">Pong template not found</div>';
		return;
	}

	container.innerHTML = '';
	const clone = template.content.cloneNode(true) as DocumentFragment;
	container.appendChild(clone);

	// Populate user info if available
	const userId = getUserId();
	const usernameEl = container.querySelector('#pong-username') as HTMLElement | null;
	if (usernameEl)
		usernameEl.textContent = userId ? `User: ${userId}` : 'Guest';

	// Render small donut stats chart (if present in template)
	const chartInner = container.querySelector('#pong-user-chart-inner') as HTMLElement | null;
	if (chartInner)
		renderPongStats(chartInner);

	// Attach button handlers
	attachBtnHandlers(container);
}

async function renderPongStats(container: HTMLElement)
{
	const userId = getUserId();
	if (!userId)
	{
		container.innerHTML = '<div class="text-red-600">You must be logged in to view stats</div>';
		return;
	}

	try {
		const res = await fetch(`/api/pong/stats?id=${userId}`, { method: 'GET', credentials: 'include' });
		const stats = res.ok ? await res.json() : null;

		const gameStats = {
			pongWins: stats?.gamesWon || 0,
			pongLosses: stats?.gamesLost || 0,
		};

		const chartId = container.id || 'pong-user-chart-inner';
		container.innerHTML = '';
		try {
			const { createGameStatsChart } = await import('../profile/UserCardCharts');
			await createGameStatsChart(chartId, 'pong', gameStats, userId);
		}
		catch (err) {
			console.warn('Failed to render pong donut chart, falling back to text:', err);
		}
		finally {
			const winsEl = document.getElementById('pong-user-wins');
			if (winsEl)
				winsEl.textContent = `Wins: ${gameStats.pongWins || 0}`;

			const lossesEl = document.getElementById('pong-user-losses');
			if (lossesEl)
				lossesEl.textContent = `Losses: ${gameStats.pongLosses || 0}`;
		}
	}
	catch (err) {
		console.error('Error fetching pong stats:', err);
		container.innerHTML = '<div class="text-red-600">Failed to load stats</div>';
	}
}

async function attachBtnHandlers(container: HTMLElement)
{
	const btnOnline = container.querySelector('#pong-play-online') as HTMLButtonElement | null;
	if (btnOnline) btnOnline.addEventListener('click', async () =>
	{
		try {
			await openPongModal('online');
		}
		catch (err) {
			console.error(err);
			showErrorToast('Failed to start online pong');
		}
	});

	const btnOffline1v1 = container.querySelector('#pong-play-offline-1v1') as HTMLButtonElement | null;
	if (btnOffline1v1) btnOffline1v1.addEventListener('click', async () =>
	{
		try {
			await openPongModal('offline-1v1');
		}
		catch (err) {
			console.error(err);
			showErrorToast('Failed to start offline 1v1 pong');
		}
	});

	const btnOfflineAI = container.querySelector('#pong-play-offline-ai') as HTMLButtonElement | null;

	if (btnOfflineAI) btnOfflineAI.addEventListener('click', async () =>
	{
		try {
			await openPongModal('offline-ai');
		}
		catch (err) {
			console.error(err);
			showErrorToast('Failed to start pong AI mode');
		}
	});

	const btnInviteFriend = container.querySelector('#pong-invite-friend') as HTMLButtonElement | null;
	if (btnInviteFriend) btnInviteFriend.addEventListener('click', async () =>
	{
		await openGameInviteModal('pong', async (friendId: string) =>
		{
			try {
				await openPongModal('online');
				showSuccessToast('Game invite sent!');
			}
			catch (err) {
				console.error('Failed to send game invite:', err);
				showErrorToast('Failed to send game invite');
			}
		});
	});

	const btnTournaments = container.querySelector('#pong-tournaments-btn') as HTMLButtonElement | null;
	if (btnTournaments) btnTournaments.addEventListener('click', () =>
	{
		showTournamentListModal();
	});
}

export default { renderPongPage };
