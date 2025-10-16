import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

const VisitasAreaChart = ({ data, loading, height = 400 }) => {
  // ... (toda la lógica anterior, gradientes, skeleton, etc., se mantiene igual)
  const gradientes = [
    { start: '#6366F1', end: '#8B5CF6' },  // Indigo a Púrpura
    { start: '#EC4899', end: '#F43F5E' },  // Rosa a Rose
    { start: '#06B6D4', end: '#0EA5E9' },  // Cyan a Sky
    { start: '#10B981', end: '#14B8A6' },  // Esmeralda a Teal
    { start: '#F59E0B', end: '#F97316' },  // Ámbar a Naranja
    { start: '#8B5CF6', end: '#A855F7' },  // Violeta a Púrpura
    { start: '#14B8A6', end: '#06B6D4' },  // Teal a Cyan
    { start: '#F97316', end: '#FB923C' },  // Naranja claro
    { start: '#3B82F6', end: '#60A5FA' },  // Azul
    { start: '#84CC16', end: '#A3E635' },  // Lima
    { start: '#EF4444', end: '#F87171' },  // Rojo
    { start: '#A855F7', end: '#C084FC' },  // Púrpura claro
    { start: '#22C55E', end: '#4ADE80' },  // Verde
    { start: '#0EA5E9', end: '#38BDF8' },  // Sky claro
    { start: '#F43F5E', end: '#FB7185' },  // Rose claro
  ];

  if (loading) {
    return (
      <div className="w-full rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-6" style={{ height: `${height}px` }}>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-28 h-3.5 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-full bg-[length:200%_100%] animate-[shimmer_2s_infinite]"></div>
              <div className="flex-1 h-8 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-xl bg-[length:200%_100%] animate-[shimmer_2s_infinite]" style={{ animationDelay: `${i * 0.1}s` }}></div>
              <div className="w-12 h-3.5 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-full bg-[length:200%_100%] animate-[shimmer_2s_infinite]"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100" style={{ height: `${height}px` }}>
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
            <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-slate-700 mb-1">No hay visitas registradas</p>
          <p className="text-sm text-slate-500">en este período</p>
        </div>
      </div>
    );
  }

  const dataLimitada = data.slice(0, 15);
  
  const createGradient = (ctx, chartArea, colorStart, colorEnd) => {
    const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
    gradient.addColorStop(0, colorStart);
    gradient.addColorStop(1, colorEnd);
    return gradient;
  };

  const chartData = {
    labels: dataLimitada.map(item => item.nombre_area),
    datasets: [
      {
        label: 'Visitas',
        data: dataLimitada.map(item => parseInt(item.visitas)),
        backgroundColor: function(context) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return null;
          const index = context.dataIndex;
          const gradiente = gradientes[index % gradientes.length];
          return createGradient(ctx, chartArea, gradiente.start, gradiente.end);
        },
        borderWidth: 0,
        borderRadius: {
          topRight: 12,
          bottomRight: 12,
          topLeft: 4,
          bottomLeft: 4
        },
        borderSkipped: false,
        barThickness: 32,
      }
    ]
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        right: 60
      }
    },
    plugins: {
      legend: {
        display: false
      },
      datalabels: {
        display: true,
        color: '#1F2937',
        font: {
          weight: '700',
          size: 13,
          family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        anchor: 'end',
        align: 'end',
        offset: 8,
        formatter: (value) => value.toLocaleString()
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        padding: 12,
        cornerRadius: 10,
        titleFont: {
          size: 14,
          weight: '600'
        },
        bodyFont: {
          size: 13
        },
        displayColors: false,
        callbacks: {
          title: (context) => context[0].label,
          label: (context) => `${context.parsed.x.toLocaleString()} visitas`
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        border: {
          display: false
        },
        grid: {
          color: '#F1F5F9',
          lineWidth: 1,
          drawTicks: false
        },
        ticks: {
          color: '#94A3B8',
          font: {
            size: 12,
            weight: '500'
          },
          padding: 8
        }
      },
      y: {
        border: {
          display: false
        },
        grid: {
          display: false
        },
        ticks: {
          color: '#475569',
          font: {
            size: 13,
            weight: '600'
          },
          padding: 12,
          crossAlign: 'near' // <-- Alineación corregida
        }
      }
    },
    animation: {
      duration: 1200,
      easing: 'easeInOutCubic',
      delay: (context) => context.dataIndex * 50
    }
  };

  // --- CAMBIO AQUÍ ---
  // Se eliminó el div exterior que actuaba como tarjeta.
  return (
    <div className="w-full h-full" style={{ height: `${height}px` }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default VisitasAreaChart;
