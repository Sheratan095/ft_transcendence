import type { User } from '../../lib/auth';
import type { FriendsManager } from './FriendsManager';
import type { GameStats } from './UserCardCharts';

export interface UserCardOptions {
  showActions?: boolean;
  onAddFriend?: (userId: string) => void;
  onRemoveFriend?: (userId: string) => void;
  onBlock?: (userId: string) => void;
  onMessage?: (userId: string) => void;
  relationshipStatus?: 'friend' | 'pending' | 'blocked' | 'none';
  friendsManager?: FriendsManager;
  showCharts?: boolean;
  gameStats?: GameStats;
}

export interface UserCardCallbacks extends Omit<UserCardOptions, 'relationshipStatus'> {
  relationshipStatus?: 'friend' | 'pending' | 'blocked' | 'none';
}

export function createUserCard(user: User, options: UserCardOptions = {}): HTMLDivElement {
  const {
    showActions = true,
    onAddFriend,
    onRemoveFriend,
    onBlock,
    onMessage,
    relationshipStatus = 'none',
    friendsManager,
    showCharts = true,
    gameStats = {}
  } = options;

  const card = document.createElement('div');
  card.className = 'p-4 border border-neutral-700 bg-neutral-800/50 rounded-lg hover:bg-neutral-800 transition-all duration-200 cursor-pointer flex flex-col gap-4';
  card.dataset.userId = user.id;

  // Avatar and content wrapper
  const headerContainer = document.createElement('div');
  headerContainer.className = 'flex items-start gap-4';

  // Avatar
  const avatarContainer = document.createElement('div');
  avatarContainer.className = 'flex-shrink-0';
  
  const avatar = document.createElement('img');
  avatar.src = user.avatarUrl
    ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : `/api${user.avatarUrl}`)
    : '/assets/placeholder-avatar.jpg';
  avatar.alt = user.username || 'User avatar';
  avatar.className = 'w-12 h-12 rounded-full object-cover border border-neutral-600';
  avatarContainer.appendChild(avatar);

  // Content
  const contentDiv = document.createElement('div');
  contentDiv.className = 'flex-1 min-w-0';

  // Username and status
  const headerDiv = document.createElement('div');
  headerDiv.className = 'flex items-center gap-2 mb-1';
  
  const username = document.createElement('h3');
  username.className = 'text-sm font-semibold text-white truncate';
  username.textContent = user.username || 'Unknown User';
  headerDiv.appendChild(username);

  // Relationship status badge
  if (relationshipStatus !== 'none') {
    const badge = document.createElement('span');
    badge.className = 'inline-block px-2 py-0.5 text-xs font-medium rounded-full';
    
    switch (relationshipStatus) {
      case 'friend':
        badge.className += ' bg-green-900/30 text-green-400';
        badge.textContent = 'Friend';
        break;
      case 'pending':
        badge.className += ' bg-yellow-900/30 text-yellow-400';
        badge.textContent = 'Pending';
        break;
      case 'blocked':
        badge.className += ' bg-red-900/30 text-red-400';
        badge.textContent = 'Blocked';
        break;
    }
    headerDiv.appendChild(badge);
  }

  contentDiv.appendChild(headerDiv);

  // Email
  const email = document.createElement('p');
  email.className = 'text-xs text-neutral-400 truncate mb-2';
  email.textContent = user.email || 'No email';
  contentDiv.appendChild(email);

  // User ID
  const idText = document.createElement('p');
  idText.className = 'text-xs text-neutral-500';
  idText.textContent = `ID: ${user.id}`;
  contentDiv.appendChild(idText);

  // Actions
  if (showActions) {
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'flex gap-2 mt-3';

    // Message button
    const messageBtn = document.createElement('button');
    messageBtn.className = 'flex-1 px-3 py-1 text-xs font-medium bg-blue-600/80 hover:bg-blue-600 text-white rounded transition-colors';
    messageBtn.textContent = 'Message';
    messageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onMessage) onMessage(user.id);
    });
    actionsDiv.appendChild(messageBtn);

    // Friend/Add action button
    let actionBtn = document.createElement('button');
    
    if (relationshipStatus === 'friend') {
      actionBtn.className = 'flex-1 px-3 py-1 text-xs font-medium bg-red-600/80 hover:bg-red-600 text-white rounded transition-colors';
      actionBtn.textContent = 'Remove';
      actionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (friendsManager) {
          friendsManager.removeFriend(user.id);
        } else if (onRemoveFriend) {
          onRemoveFriend(user.id);
        }
      });
    } else if (relationshipStatus === 'pending') {
      actionBtn.className = 'flex-1 px-3 py-1 text-xs font-medium bg-yellow-600/80 hover:bg-yellow-600 text-white rounded transition-colors cursor-not-allowed';
      actionBtn.textContent = 'Pending';
      actionBtn.disabled = true;
    } else if (relationshipStatus === 'blocked') {
      actionBtn.className = 'flex-1 px-3 py-1 text-xs font-medium bg-neutral-600/80 hover:bg-neutral-600 text-white rounded transition-colors';
      actionBtn.textContent = 'Unblock';
      actionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (friendsManager) {
          friendsManager.unblockUser(user.id);
        } else if (onRemoveFriend) {
          onRemoveFriend(user.id);
        }
      });
    } else {
      actionBtn.className = 'flex-1 px-3 py-1 text-xs font-medium bg-green-600/80 hover:bg-green-600 text-white rounded transition-colors';
      actionBtn.textContent = 'Add Friend';
      actionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (friendsManager) {
          friendsManager.addFriend(user.id);
        } else if (onAddFriend) {
          onAddFriend(user.id);
        }
      });
    }
    
    actionsDiv.appendChild(actionBtn);

    // Block button
    const blockBtn = document.createElement('button');
    blockBtn.className = 'px-3 py-1 text-xs font-medium bg-neutral-600/80 hover:bg-neutral-600 text-white rounded transition-colors';
    blockBtn.textContent = '⛔';
    blockBtn.title = relationshipStatus === 'blocked' ? 'Unblock user' : 'Block user';
    blockBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (friendsManager) {
        if (relationshipStatus === 'blocked') {
          friendsManager.unblockUser(user.id);
        } else {
          friendsManager.blockUser(user.id);
        }
      } else if (onBlock) {
        onBlock(user.id);
      }
    });
    actionsDiv.appendChild(blockBtn);

    contentDiv.appendChild(actionsDiv);
  }

  headerContainer.appendChild(avatarContainer);
  headerContainer.appendChild(contentDiv);
  card.appendChild(headerContainer);

  // Add charts if enabled
  if (showCharts && Object.keys(gameStats).length > 0) {
    const chartsContainer = document.createElement('div');
    chartsContainer.className = 'mt-4 pt-4 border-t border-neutral-600';

    // Chart grid
    const chartGrid = document.createElement('div');
    chartGrid.className = 'grid grid-cols-2 gap-3';

    // Pong chart
    if (gameStats.pongWins !== undefined || gameStats.pongHistory) {
      const pongChartContainer = document.createElement('div');
      pongChartContainer.className = 'bg-neutral-900/50 rounded p-2';
      
      const pongTitle = document.createElement('h4');
      pongTitle.className = 'text-xs font-semibold text-neutral-300 mb-2';
      pongTitle.textContent = 'Pong';
      pongChartContainer.appendChild(pongTitle);

      const pongStats = document.createElement('div');
      pongStats.className = 'text-xs text-neutral-400 space-y-1';
      const pongWins = gameStats.pongWins || 0;
      const pongLosses = gameStats.pongLosses || 0;
      pongStats.innerHTML = `
        <div>Wins: <span class="text-green-400 font-semibold">${pongWins}</span></div>
        <div>Losses: <span class="text-red-400 font-semibold">${pongLosses}</span></div>
      `;
      pongChartContainer.appendChild(pongStats);
      chartGrid.appendChild(pongChartContainer);
    }

    // Tris chart
    if (gameStats.trisWins !== undefined || gameStats.trisHistory) {
      const trisChartContainer = document.createElement('div');
      trisChartContainer.className = 'bg-neutral-900/50 rounded p-2';
      
      const trisTitle = document.createElement('h4');
      trisTitle.className = 'text-xs font-semibold text-neutral-300 mb-2';
      trisTitle.textContent = 'Tris';
      trisChartContainer.appendChild(trisTitle);

      const trisStats = document.createElement('div');
      trisStats.className = 'text-xs text-neutral-400 space-y-1';
      const trisWins = gameStats.trisWins || 0;
      const trisLosses = gameStats.trisLosses || 0;
      trisStats.innerHTML = `
        <div>Wins: <span class="text-green-400 font-semibold">${trisWins}</span></div>
        <div>Losses: <span class="text-red-400 font-semibold">${trisLosses}</span></div>
      `;
      trisChartContainer.appendChild(trisStats);
      chartGrid.appendChild(trisChartContainer);
    }

    chartsContainer.appendChild(chartGrid);
    card.appendChild(chartsContainer);

    // Render detailed charts asynchronously
    setTimeout(async () => {
      const { createGameStatsChart } = await import('./UserCardCharts');
      if (gameStats.pongWins !== undefined) {
        const pongChartId = `pong-donut-${user.id}`;
        const pongChart = document.createElement('div');
        pongChart.id = pongChartId;
        pongChart.className = 'mt-3 hidden';
        card.appendChild(pongChart);
        try {
          await createGameStatsChart(pongChartId, 'pong', gameStats, user.id);
        } catch (e) {
          console.warn('Failed to render pong chart:', e);
        }
      }
      
      if (gameStats.trisWins !== undefined) {
        const trisChartId = `tris-donut-${user.id}`;
        const trisChart = document.createElement('div');
        trisChart.id = trisChartId;
        trisChart.className = 'mt-3 hidden';
        card.appendChild(trisChart);
        try {
          await createGameStatsChart(trisChartId, 'tris', gameStats, user.id);
        } catch (e) {
          console.warn('Failed to render tris chart:', e);
        }
      }
    }, 100);
  }

  return card;
}

export function createUserCardList(users: User[], options: UserCardOptions = {}): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'space-y-2';

  users.forEach(user => {
    const card = createUserCard(user, options);
    container.appendChild(card);
  });

  return container;
}
