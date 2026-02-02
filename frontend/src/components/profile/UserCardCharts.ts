/**
 * UserCardCharts - Chart utilities for user profile cards
 * Displays win/loss statistics with ApexCharts
 */

declare global {
  interface Window {
    ApexCharts: any;
  }
}

export interface GameStats {
  pongWins?: number;
  pongLosses?: number;
  trisWins?: number;
  trisLosses?: number;
  pongHistory?: Array<{ endedAt: string; winnerId: string | null }>;
  trisHistory?: Array<{ endedAt: string; winnerId: string | null }>;
}

/**
 * Create a donut chart for win/loss ratio
 */
export async function createGameStatsChart(
  containerId: string,
  gameType: 'pong' | 'tris',
  stats: GameStats,
  userId: string
): Promise<void> {
  // Ensure ApexCharts is loaded
  if (typeof window.ApexCharts === 'undefined') {
    console.warn('ApexCharts not loaded, skipping chart creation');
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) return;

  let wins = 0;
  let losses = 0;

  // Use history data if available, otherwise use summary stats
  if (gameType === 'pong' && stats.pongHistory) {
    stats.pongHistory.forEach(match => {
      if (match.winnerId === userId) wins++;
      else if (match.winnerId !== null && match.winnerId !== '') losses++;
    });
  } else if (gameType === 'tris' && stats.trisHistory) {
    stats.trisHistory.forEach(match => {
      if (match.winnerId === userId) wins++;
      else if (match.winnerId !== null && match.winnerId !== '') losses++;
    });
  } else {
    // Fallback to summary stats
    if (gameType === 'pong') {
      wins = stats.pongWins || 0;
      losses = stats.pongLosses || 0;
    } else {
      wins = stats.trisWins || 0;
      losses = stats.trisLosses || 0;
    }
  }

  const total = wins + losses;

  const options = {
    series: [wins, losses],
    colors: ['#10b981', '#ef4444'],
    chart: {
      height: 250,
      width: '100%',
      type: 'donut',
      sparkline: { enabled: false },
      toolbar: { show: false },
    },
    stroke: {
      colors: ['transparent'],
      lineCap: '',
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            name: {
              show: false,
            },
            total: {
              showAlways: true,
              show: true,
              label: 'Total',
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              formatter: () => String(total),
            },
            value: {
              show: true,
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              formatter: (value: any) => value,
            },
          },
          size: '70%',
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      position: 'bottom',
      fontFamily: 'Inter, sans-serif',
      fontSize: '12px',
    },
    labels: ['Wins', 'Losses'],
  };

  try {
    // Clear existing chart if present
    if ((window as any).chartInstances && (window as any).chartInstances[containerId]) {
      (window as any).chartInstances[containerId].destroy();
    }

    // Initialize ApexCharts
    const chart = new window.ApexCharts(container, options);
    await chart.render();

    // Store instance for later cleanup
    if (!(window as any).chartInstances) {
      (window as any).chartInstances = {};
    }
    (window as any).chartInstances[containerId] = chart;
  } catch (error) {
    console.error(`Failed to create ${gameType} chart:`, error);
  }
}

/**
 * Create a line chart for match history
 */
export async function createMatchHistoryChart(
  containerId: string,
  gameType: 'pong' | 'tris',
  stats: GameStats,
  userId: string
): Promise<void> {
  if (typeof window.ApexCharts === 'undefined') {
    console.warn('ApexCharts not loaded, skipping chart creation');
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) return;

  const history = gameType === 'pong' ? stats.pongHistory : stats.trisHistory;
  if (!history || history.length === 0) return;

  // Group matches by day
  const dayMap = new Map<string, { wins: number; losses: number }>();
  
  history.forEach(match => {
    if (!match.endedAt) return;
    const d = new Date(match.endedAt);
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, { wins: 0, losses: 0 });
    }
    
    const entry = dayMap.get(dayKey)!;
    if (match.winnerId === userId) entry.wins++;
    else if (match.winnerId !== null && match.winnerId !== '') entry.losses++;
  });

  // Convert to arrays
  const days = Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const categories = days.map(([dayKey]) => {
    const [year, month, day] = dayKey.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const winsData = days.map(([, counts]) => counts.wins);
  const lossesData = days.map(([, counts]) => counts.losses);

  const options = {
    chart: {
      height: 250,
      width: '100%',
      type: 'area',
      fontFamily: 'Inter, sans-serif',
      dropShadow: { enabled: false },
      toolbar: { show: false },
    },
    tooltip: { enabled: true, x: { show: false } },
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.55, opacityTo: 0, shade: '#3b82f6' },
    },
    dataLabels: { enabled: false },
    stroke: { width: 2, curve: 'smooth' },
    grid: { show: true, strokeDashArray: 4 },
    series: [
      { name: 'Wins', data: winsData, color: '#10b981' },
      { name: 'Losses', data: lossesData, color: '#ef4444' },
    ],
    legend: { show: true, position: 'top' },
    xaxis: {
      categories,
      labels: {
        show: true,
        style: { fontFamily: 'Inter, sans-serif', fontSize: '12px' },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { show: false },
  };

  try {
    if ((window as any).chartInstances && (window as any).chartInstances[containerId]) {
      (window as any).chartInstances[containerId].destroy();
    }

    const chart = new window.ApexCharts(container, options);
    await chart.render();

    if (!(window as any).chartInstances) {
      (window as any).chartInstances = {};
    }
    (window as any).chartInstances[containerId] = chart;
  } catch (error) {
    console.error(`Failed to create ${gameType} history chart:`, error);
  }
}

/**
 * Clean up all chart instances
 */
export function cleanupCharts(): void {
  if ((window as any).chartInstances) {
    Object.values((window as any).chartInstances).forEach((chart: any) => {
      try {
        if (chart && typeof chart.destroy === 'function') {
          chart.destroy();
        }
      } catch (err) {
        console.error('Failed to destroy chart:', err);
      }
    });
    (window as any).chartInstances = {};
  }
}
