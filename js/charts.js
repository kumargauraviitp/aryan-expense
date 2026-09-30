/**
 * Technical Charting Engine (Chart.js styled with precision metrics)
 * Theme-aware (seamlessly adapts between Dark and Light mode)
 */

let categoryChartInstance = null;
let cashflowChartInstance = null;

const FONT_MONO = "'Geist Mono', monospace";
const FONT_SANS = "'Geist', -apple-system, sans-serif";

function isLightMode() {
  return document.documentElement.getAttribute('data-theme') === 'light';
}

export const ChartEngine = {
  renderCategoryBreakdown(canvasId, categoryData, currencySymbol = '₹') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (categoryChartInstance) {
      categoryChartInstance.destroy();
      categoryChartInstance = null;
    }

    if (!window.Chart) return;

    const light = isLightMode();
    const labels = Object.keys(categoryData);
    const dataValues = Object.values(categoryData).map(c => c.total);
    const backgroundColors = Object.values(categoryData).map(c => c.color || (light ? '#94a3b8' : '#52525b'));

    const ctx = canvas.getContext('2d');

    if (labels.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = light ? '#94a3b8' : '#52525b';
      ctx.textAlign = 'center';
      ctx.font = `12px ${FONT_MONO}`;
      ctx.fillText('NO OUTFLOW DATA LOGGED FOR THIS CYCLE', canvas.width / 2, canvas.height / 2);
      return;
    }

    categoryChartInstance = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: dataValues,
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: light ? '#ffffff' : '#101014',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '76%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: light ? '#475569' : '#a1a1aa',
              font: {
                family: FONT_SANS,
                size: 11
              },
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              pointStyle: 'rectRounded',
              padding: 12
            }
          },
          tooltip: {
            backgroundColor: light ? '#0f172a' : '#18181b',
            titleColor: '#ffffff',
            bodyColor: '#cbd5e1',
            borderColor: light ? '#334155' : '#27272a',
            borderWidth: 1,
            padding: 10,
            boxPadding: 4,
            usePointStyle: true,
            titleFont: { family: FONT_SANS, size: 12, weight: '600' },
            bodyFont: { family: FONT_MONO, size: 12 },
            callbacks: {
              label: function(context) {
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return ` ${currencySymbol}${value.toLocaleString()} [${percentage}%]`;
              }
            }
          }
        },
        animation: { duration: 400, easing: 'easeOutQuart' }
      }
    });
  },

  renderCashflowComparison(canvasId, monthlyData, currencySymbol = '₹') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (cashflowChartInstance) {
      cashflowChartInstance.destroy();
      cashflowChartInstance = null;
    }

    if (!window.Chart) return;

    const light = isLightMode();
    const labels = monthlyData.map(m => m.monthLabel);
    const incomeData = monthlyData.map(m => m.income);
    const expenseData = monthlyData.map(m => m.expense);

    const ctx = canvas.getContext('2d');

    cashflowChartInstance = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Inflows',
            data: incomeData,
            backgroundColor: light ? '#16a34a' : '#22c55e',
            borderRadius: 3,
            borderSkipped: false,
            barPercentage: 0.5,
            categoryPercentage: 0.65
          },
          {
            label: 'Outflows',
            data: expenseData,
            backgroundColor: light ? '#e11d48' : '#f43f5e',
            borderRadius: 3,
            borderSkipped: false,
            barPercentage: 0.5,
            categoryPercentage: 0.65
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: light ? '#64748b' : '#71717a',
              font: { family: FONT_MONO, size: 11 },
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 12
            }
          },
          tooltip: {
            backgroundColor: light ? '#0f172a' : '#18181b',
            titleColor: '#ffffff',
            bodyColor: '#cbd5e1',
            borderColor: light ? '#334155' : '#27272a',
            borderWidth: 1,
            padding: 10,
            usePointStyle: true,
            titleFont: { family: FONT_SANS, size: 12 },
            bodyFont: { family: FONT_MONO, size: 12 },
            callbacks: {
              label: function(context) {
                return ` ${context.dataset.label}: ${currencySymbol}${context.parsed.y.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: {
              color: light ? '#64748b' : '#71717a',
              font: { family: FONT_MONO, size: 11 }
            }
          },
          y: {
            grid: {
              color: light ? '#e2e8f0' : '#1a1a1f',
              drawBorder: false
            },
            ticks: {
              color: light ? '#94a3b8' : '#52525b',
              font: { family: FONT_MONO, size: 10 },
              callback: function(value) {
                if (value >= 1000000) return `${currencySymbol}${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `${currencySymbol}${(value / 1000).toFixed(0)}k`;
                return `${currencySymbol}${value}`;
              }
            }
          }
        },
        animation: { duration: 400, easing: 'easeOutQuart' }
      }
    });
  }
};
