// Get the CSS variable --color-brand and convert it to hex for ApexCharts
const getBrandColor = (variableName, fallback) => {
  const computedStyle = getComputedStyle(document.documentElement);
  return computedStyle.getPropertyValue(variableName).trim() || fallback;
};

/**
 * Transforms Tris match history into series data for wins and losses.
 */



// Group matches by local calendar day and return daily counts
function groupMatchesByDay(history = [], userId, rangeStart, rangeEnd) {
  const map = new Map();
  
  let start, end;
  
  if (rangeStart && rangeEnd) {
    start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
    end = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());
  } else if (history.length > 0) {
    const sortedHistory = [...history].sort((a, b) => new Date(a.endedAt) - new Date(b.endedAt));
    const firstDate = new Date(sortedHistory[0].endedAt);
    const lastDate = new Date(sortedHistory[sortedHistory.length - 1].endedAt);
    start = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());
    end = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
  } else {
    return { categories: [], winsData: [], lossesData: [] };
  }

  // Fill all days in range with 0s
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    map.set(dayKey, { wins: 0, losses: 0, date: new Date(d) });
  }

  for (const match of history) {
    if (!match.endedAt) continue;
    const d = new Date(match.endedAt);
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const entry = map.get(dayKey);
    // Only increment if within the requested range (in case history filter was loose)
    if (entry) {
      if (match.winnerId === userId) entry.wins += 1;
      else if (match.winnerId !== null && match.winnerId !== '') entry.losses += 1;
    }
  }

  // Convert Map to sorted arrays
  const days = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  const categories = [];
  const winsData = [];
  const lossesData = [];

  for (const [dayKey, counts] of days) {
    const d = counts.date;
    const label = `${d.toLocaleString('default', { weekday: 'short' })} ${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
    categories.push(label);
    winsData.push(counts.wins);
    lossesData.push(counts.losses);
  }

  return { categories, winsData, lossesData };
}

export const getChartOptions = (history = [], userId, rangeStart, rangeEnd) => {
  const { categories, winsData, lossesData } = groupMatchesByDay(history, userId, rangeStart, rangeEnd);

  return {
    chart: {
      height: 350,
      maxWidth: '100%',
      type: 'area',
      fontFamily: 'Inter, sans-serif',
      dropShadow: { enabled: false },
      toolbar: { show: false },
    },
    tooltip: { enabled: true, x: { show: false } },
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.55, opacityTo: 0, shade: '#3b82f6', gradientToColors: ['#3b82f6'] },
    },
    dataLabels: { enabled: false },
    stroke: { width: 6, curve: 'smooth' },
    grid: { show: true, strokeDashArray: 4, padding: { left: 20, right: 20, top: 0, bottom: 0 } },
    series: [
      { name: 'Wins', data: winsData, color: '#10b981' },
      { name: 'Losses', data: lossesData, color: '#ef4444' },
    ],
    legend: { show: true, position: 'top' },
    xaxis: {
      categories,
      labels: {
        show: true,
        rotate: -45,
        rotateAlways: true,
        style: { fontFamily: 'Inter, sans-serif', cssClass: 'text-xs font-normal fill-body' },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { show: false },
  };
};