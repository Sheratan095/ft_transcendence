/**
 * Match History utilities for fetching game histories
 */

export interface MatchRecord {
  id: string;
  endedAt: string;
  winnerId: string | null;
  [key: string]: any;
}

/**
 * Fetch user's Tris match history
 */
export async function getTrisMatchHistory(userId: string): Promise<MatchRecord[]> {
  try {
    const response = await fetch(`/api/tris/history?id=${userId}`, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch tris history: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching tris match history:', error);
    return [];
  }
}

/**
 * Fetch user's Pong match history
 */
export async function getPongMatchHistory(userId: string): Promise<MatchRecord[]> {
  try {
    const response = await fetch(`/api/pong/history?id=${userId}`, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch pong history: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching pong match history:', error);
    return [];
  }
}

/**
 * Fetch both Tris and Pong match histories in parallel
 */
export async function getAllMatchHistories(userId: string): Promise<{
  trisHistory: MatchRecord[];
  pongHistory: MatchRecord[];
}> {
  const [trisHistory, pongHistory] = await Promise.all([
    getTrisMatchHistory(userId),
    getPongMatchHistory(userId),
  ]);
  
  return { trisHistory, pongHistory };
}

/**
 * Calculate match statistics from history
 */
export function calculateStats(history: MatchRecord[], userId: string) {
  let wins = 0;
  let losses = 0;

  history.forEach(match => {
    if (match.winnerId === userId) {
      wins++;
    } else if (match.winnerId !== null && match.winnerId !== '') {
      losses++;
    }
  });

  const total = wins + losses;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0';

  return { wins, losses, total, winRate };
}

/**
 * Filter match history by date range
 */
export function filterHistoryByDateRange(
  history: MatchRecord[],
  startDate?: Date,
  endDate?: Date
): MatchRecord[] {
  if (!startDate || !endDate) {
    return history;
  }

  return history.filter(match => {
    if (!match.endedAt) return false;
    const matchDate = new Date(match.endedAt);
    return matchDate >= startDate && matchDate <= endDate;
  });
}

/**
 * Group matches by day for chart visualization
 */
export function groupMatchesByDay(
  history: MatchRecord[],
  userId: string
): {
  categories: string[];
  winsData: number[];
  lossesData: number[];
} {
  if (history.length === 0) {
    return { categories: [], winsData: [], lossesData: [] };
  }

  const dayMap = new Map<string, { wins: number; losses: number }>();

  history.forEach(match => {
    if (!match.endedAt) return;
    const d = new Date(match.endedAt);
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, { wins: 0, losses: 0 });
    }

    const entry = dayMap.get(dayKey)!;
    if (match.winnerId === userId) {
      entry.wins++;
    } else if (match.winnerId !== null && match.winnerId !== '') {
      entry.losses++;
    }
  });

  const days = Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const categories = days.map(([dayKey]) => {
    const [year, month, day] = dayKey.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const winsData = days.map(([, counts]) => counts.wins);
  const lossesData = days.map(([, counts]) => counts.losses);

  return { categories, winsData, lossesData };
}
