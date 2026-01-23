// Get the CSS variable --color-brand and convert it to hex for ApexCharts
const getBrandColor = (variableName, fallback) => {
  const computedStyle = getComputedStyle(document.documentElement);
  return computedStyle.getPropertyValue(variableName).trim() || fallback;
};

/**
 * Transforms Tris match history into series data for wins and losses.
 */

// Group matches by local calendar day and return daily counts
function groupMatchesByDay(history = [], userId) {
  const map = new Map();

  for (const match of history) {
    if (!match.endedAt) continue;
    const d = new Date(match.endedAt);
    // use local date YYYY-MM-DD to group by calendar day
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;

    if (!map.has(dayKey)) map.set(dayKey, { wins: 0, losses: 0, date: d });

    const entry = map.get(dayKey);
    if (match.winnerId === userId) entry.wins += 1;
    else if (match.winnerId !== null && match.winnerId !== '') entry.losses += 1;
    // draws are ignored (neither win nor loss)
  }

  // Convert Map to sorted arrays
  const days = Array.from(map.entries()).sort((a, b) => new Date(a[0]) - new Date(b[0]));

  const categories = [];
  const winsData = [];
  const lossesData = [];

  for (const [dayKey, counts] of days) {
    const d = counts.date;
    categories.push(`${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`);
    winsData.push(counts.wins);
    lossesData.push(counts.losses);
  }

  return { categories, winsData, lossesData };

}

export const getChartOptions = (history = [], userId) => {
  const { categories, winsData, lossesData } = groupMatchesByDay(history, userId);

  return {
    chart: {
      height: '100%',
      maxWidth: '100%',
      type: 'area',
      fontFamily: 'Inter, sans-serif',
      dropShadow: { enabled: false },
      toolbar: { show: false },
    },
    tooltip: { enabled: true, x: { show: false } },
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.55, opacityTo: 0, shade: '#1C64F2', gradientToColors: ['#1C64F2'] },
    },
    dataLabels: { enabled: false },
    stroke: { width: 6, curve: 'smooth' },
    grid: { show: true, strokeDashArray: 4, padding: { left: 2, right: 2, top: -26 } },
    series: [
      { name: 'Wins', data: winsData, color: '#008000' },
      { name: 'Losses', data: lossesData, color: '#EF5350' },
    ],
    legend: { show: true, position: 'top' },
    xaxis: {
      categories,
      labels: { show: true, style: { fontFamily: 'Inter, sans-serif', cssClass: 'text-xs font-normal fill-body' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { show: false },
  };
};