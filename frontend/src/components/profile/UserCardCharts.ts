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

  // Determine current theme from document <html> class
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const winsColor = isDark ? '#0dff66' : '#0ea5ff'; // green in dark, blue in light
  const lossesColor = '#ef4444';
  const chartBg = isDark ? '#0b1220' : '#ffffff';

  const options: any = {
    series: [wins, losses],
    colors: [winsColor, lossesColor],
    chart: {
      height: '100%',
      width: '100%',
      type: 'donut',
      sparkline: { enabled: true },
      toolbar: { show: false },
    },
    stroke: {
      colors: ['transparent'],
      width: 0,
    },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
    labels: ['Wins', 'Losses'],
    tooltip: {
      enabled: true,
      // Use a custom tooltip so we can specifically style the loss hover text in dark mode
      custom: function(opts: any) {
        try {
          const series = opts.series;
          const idx = opts.seriesIndex;
          const val = Array.isArray(series) ? series[idx] : series;
          const label = (opts.w && opts.w.config && opts.w.config.labels && opts.w.config.labels[idx]) || (idx === 0 ? 'Wins' : 'Losses');
          const bg = chartBg;
          const baseText = isDark ? '#ffffff' : '#000000';
          // If dark mode and this is the Losses entry, force the value text to black per request
          const valueColor = baseText;
          const labelColor = idx === 0 ? winsColor : lossesColor;
          return `
            <div style="padding:8px;border-radius:6px;background:${bg};color:${baseText};font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;">
              <div style="font-size:12px;color:${labelColor};margin-bottom:4px;">${label}</div>
              <div style="font-weight:700;font-size:14px;color:${valueColor};">${val}</div>
            </div>
          `;
        } catch (e) {
          return '';
        }
      }
    }
  };

  try {
    // Clear existing chart if present (destroy stored chart object)
    if ((window as any).chartInstances && (window as any).chartInstances[containerId]) {
      try {
        const existing = (window as any).chartInstances[containerId];
        if (existing && existing.chart && typeof existing.chart.destroy === 'function') {
          existing.chart.destroy();
        }
      } catch (e) {
        // ignore
      }
    }

    // Initialize ApexCharts
    const chart = new window.ApexCharts(container, options);
    await chart.render();

    // Store instance and metadata for later cleanup / re-rendering
    if (!(window as any).chartInstances)
      (window as any).chartInstances = {};

    (window as any).chartInstances[containerId] = { chart, gameType, stats, userId, chartKind: 'donut' };
  }catch (error) {
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
      height: '100%',
      width: '100%',
      type: 'area',
      fontFamily: 'Inter, sans-serif',
      sparkline: { enabled: true },
      toolbar: { show: false },
    },
    tooltip: { enabled: true, theme: 'dark' },
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.4, opacityTo: 0 },
    },
    dataLabels: { enabled: false },
    stroke: { width: 2, curve: 'smooth' },
    grid: { show: false },
    series: [
      { name: 'Wins', data: winsData, color: gameType === 'tris' ? '#0dff66' : '#00bcd4' },
      { name: 'Losses', data: lossesData, color: '#ef4444' },
    ],
    legend: { show: false },
    xaxis: {
      categories,
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { show: false },
  };

  try {
    if ((window as any).chartInstances && (window as any).chartInstances[containerId]) {
      try {
        const existing = (window as any).chartInstances[containerId];
        if (existing && existing.chart && typeof existing.chart.destroy === 'function') {
          existing.chart.destroy();
        }
      } catch (e) {}
    }

    const chart = new window.ApexCharts(container, options);
    await chart.render();

    if (!(window as any).chartInstances) {
      (window as any).chartInstances = {};
    }
    (window as any).chartInstances[containerId] = { chart, gameType, stats, userId, chartKind: 'history' };
  } catch (error) {
    console.error(`Failed to create ${gameType} history chart:`, error);
  }
}

/**
 * Clean up all chart instances
 */
export function cleanupCharts(): void {
  if ((window as any).chartInstances) {
    Object.values((window as any).chartInstances).forEach((entry: any) => {
      try {
        if (entry && entry.chart && typeof entry.chart.destroy === 'function') {
          entry.chart.destroy();
        }
      } catch (err) {
        console.error('Failed to destroy chart:', err);
      }
    });
    (window as any).chartInstances = {};
  }
}

// Re-render charts automatically when theme (dark class) changes on <html>
if (typeof document !== 'undefined') {
  let lastIsDark = document.documentElement.classList.contains('dark');
  const rerenderAll = async () => {
    const instances = (window as any).chartInstances;
    if (!instances) return;
    const keys = Object.keys(instances);
    for (const id of keys) {
      try {
        const meta = instances[id];
        if (!meta) continue;
        // Recreate the proper chart type with same params
        if (meta.chartKind === 'history') {
          await createMatchHistoryChart(id, meta.gameType, meta.stats, meta.userId);
        } else {
          await createGameStatsChart(id, meta.gameType, meta.stats, meta.userId);
        }
      } catch (e) {
        // ignore
      }
    }
  };

  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.attributeName === 'class') {
        const now = document.documentElement.classList.contains('dark');
        if (now !== lastIsDark) {
          lastIsDark = now;
          // schedule rerender
          void rerenderAll();
        }
      }
    }
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}
