import React, { forwardRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend as RechartsLegend } from 'recharts';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import { Bar as BarChart } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ChartDataLabels
);

// Colores para gráficos
const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
  '#06B6D4', '#F97316', '#6366F1', '#14B8A6', '#EF4444',
];

const GRADIENTES = [
  { start: '#6366F1', end: '#8B5CF6' },
  { start: '#EC4899', end: '#F43F5E' },
  { start: '#06B6D4', end: '#0EA5E9' },
  { start: '#10B981', end: '#14B8A6' },
  { start: '#F59E0B', end: '#F97316' },
  { start: '#8B5CF6', end: '#A855F7' },
  { start: '#14B8A6', end: '#06B6D4' },
  { start: '#F97316', end: '#FB923C' },
  { start: '#3B82F6', end: '#60A5FA' },
  { start: '#84CC16', end: '#A3E635' },
  { start: '#EF4444', end: '#F87171' },
  { start: '#A855F7', end: '#C084FC' },
  { start: '#22C55E', end: '#4ADE80' },
  { start: '#0EA5E9', end: '#38BDF8' },
  { start: '#F43F5E', end: '#FB7185' },
];

// ---------- PIE ----------

const CustomTooltipPie = ({ active, payload, total, config }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;

    return (
      <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg border border-gray-800">
        <p className="font-semibold text-sm mb-1">{data.name}</p>
        <p className="text-xs">
          <span className="font-bold">{data.value.toLocaleString()}</span>{' '}
          {config.tooltipSuffix || 'visitas'}
        </p>
        <p className="text-xs text-gray-300">{percentage}% del total</p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ data }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-6">
      {data.map((entry, index) => {
        return (
          <div
            key={`legend-${index}`}
            className="flex items-center justify-between py-1 group"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm font-medium text-gray-700 truncate">
                {entry.name}
              </span>
            </div>
            <div className="flex items-center gap-3 ml-2">
              <span className="text-sm font-bold text-gray-900">
                {entry.value.toLocaleString()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PieChartComponent = ({ data, loading, size = 300, totalVisitas = 0, config }) => {
  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width: '100%', height: `${size}px` }}
      >
        <div className="relative">
          <div
            className="rounded-full bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 animate-pulse"
            style={{ width: `${size}px`, height: `${size}px` }}
          />
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full"
            style={{ width: `${size * 0.6}px`, height: `${size * 0.6}px` }}
          />
        </div>
      </div>
    );
  }

  if (!data || !data.labels || data.labels.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-2xl w-full"
        style={{ height: `${size}px` }}
      >
        <div className="text-center px-6">
          <svg
            className="w-12 h-12 text-gray-300 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
            />
          </svg>
          <p className="text-base font-semibold text-gray-700 mb-1">
            {config.emptyMessage || 'Sin datos disponibles'}
          </p>
          <p className="text-sm text-gray-500">
            {config.emptySubtitle || 'No hay datos registrados'}
          </p>
        </div>
      </div>
    );
  }

  const chartData = data.labels.map((label, index) => ({
    name: label,
    value: data.datasets[0].data[index],
    color: COLORS[index % COLORS.length],
  }));

  const totalCalculado = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="w-full flex flex-col items-center">
      <div
        className="relative"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="65%"
              outerRadius="85%"
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry) => (
                <Cell
                  key={`cell-${entry.name}`}
                  fill={entry.color}
                  stroke={entry.color}
                  className="focus:outline-none hover:opacity-80 transition-opacity cursor-pointer"
                />
              ))}
            </Pie>
            <Tooltip
              content={
                <CustomTooltipPie
                  total={totalCalculado}
                  config={config}
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Total
          </p>
          <p className="text-3xl font-bold text-gray-900">
            {totalVisitas.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {config.centerLabel || 'visitas'}
          </p>
        </div>
      </div>

      <div className="w-full max-w-lg">
        <CustomLegend
          data={chartData}
          total={totalCalculado}
          config={config}
        />
      </div>
    </div>
  );
};

// ---------- BAR ----------

const BarChartComponent = forwardRef(({ data, loading, height = 400, config }, ref) => {
  if (loading) {
    return (
      <div
        className="w-full rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-6"
        style={{ height: `${height}px` }}
      >
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 animate-pulse"
            >
              <div className="w-28 h-3.5 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-full bg-[length:200%_100%] animate-[shimmer_2s_infinite]" />
              <div
                className="flex-1 h-8 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-xl bg-[length:200%_100%] animate-[shimmer_2s_infinite]"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
              <div className="w-12 h-3.5 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-full bg-[length:200%_100%] animate-[shimmer_2s_infinite]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100"
        style={{ height: `${height}px` }}
      >
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <p className="text-lg font-semibold text-slate-700 mb-1">
            {config.emptyTitle || 'No hay datos registrados'}
          </p>
          <p className="text-sm text-slate-500">
            {config.emptySubtitle || 'en este período'}
          </p>
        </div>
      </div>
    );
  }

  const dataLimitada = data.slice(0, 15);

  const createGradient = (ctx, chartArea, colorStart, colorEnd) => {
    const gradient = ctx.createLinearGradient(
      chartArea.left,
      0,
      chartArea.right,
      0
    );
    gradient.addColorStop(0, colorStart);
    gradient.addColorStop(1, colorEnd);
    return gradient;
  };

  const chartData = {
    labels: dataLimitada.map((item) => item[config.labelKey]),
    datasets: [
      {
        label: config.datasetLabel || 'Visitas',
        data: dataLimitada.map((item) =>
          parseInt(item[config.valueKey])
        ),
        backgroundColor: function (context) {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          const index = context.dataIndex;
          const gradiente =
            GRADIENTES[index % GRADIENTES.length];
          return createGradient(
            ctx,
            chartArea,
            gradiente.start,
            gradiente.end
          );
        },
        borderWidth: 0,
        borderRadius: {
          topRight: 12,
          bottomRight: 12,
          topLeft: 4,
          bottomLeft: 4,
        },
        borderSkipped: false,
        barThickness: 32,
      },
    ],
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        right: 60,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      datalabels: {
        display: true,
        color: '#1F2937',
        font: {
          weight: '700',
          size: 13,
          family:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        anchor: 'end',
        align: 'end',
        offset: 8,
        formatter: (value) => value.toLocaleString(),
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(236, 235, 235, 0.9)',
        padding: 12,
        cornerRadius: 10,
        titleFont: {
          size: 14,
          weight: '600',
        },
        bodyFont: {
          size: 13,
        },
        displayColors: false,
        callbacks: {
          title: (context) => context[0].label,
          label: (context) =>
            `${context.parsed.x.toLocaleString()} ${
              config.tooltipSuffix || 'visitas'
            }`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        border: {
          display: false,
        },
        grid: {
          color: '#F1F5F9',
          lineWidth: 1,
          drawTicks: false,
        },
        ticks: {
          color: '#94A3B8',
          font: {
            size: 12,
            weight: '500',
          },
          padding: 8,
        },
      },
      y: {
        border: {
          display: false,
        },
        grid: {
          display: false,
        },
        ticks: {
          color: '#475569',
          font: {
            size: 13,
            weight: '600',
          },
          padding: 12,
          crossAlign: 'near',
        },
      },
    },
    animation: {
      duration: 1200,
      easing: 'easeInOutCubic',
      delay: (context) => context.dataIndex * 50,
    },
  };

  return (
    <div
      className="w-full h-full"
      style={{ height: `${height}px` }}
    >
      <BarChart ref={ref} data={chartData} options={options} />
    </div>
  );
});

// ---------- AREA (tipo olas suaves con degradado hermoso) ----------
const LineChartComponent = ({ data, loading, height = 400, config }) => {
  if (loading) {
    return (
      <div
        className="w-full rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center"
        style={{ height: `${height}px` }}
      >
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          <p className="mt-4 text-sm text-slate-600">
            Cargando datos...
          </p>
        </div>
      </div>
    );
  }

  if (!data || !data.labels || data.labels.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100"
        style={{ height: `${height}px` }}
      >
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
          </div>
          <p className="text-lg font-semibold text-slate-700 mb-1">
            {config.emptyTitle || 'No hay datos registrados'}
          </p>
          <p className="text-sm text-slate-500">
            {config.emptySubtitle || 'en este período'}
          </p>
        </div>
      </div>
    );
  }

  const hasMultipleSeries = data.datasets && data.datasets.length > 1;

  // Transformar datos para Recharts
  const chartData = data.labels.map((label, index) => {
    const point = { name: label };
    data.datasets.forEach((dataset, dsIndex) => {
      const key = dataset.label || `serie${dsIndex}`;
      point[key] = dataset.data[index];
    });
    return point;
  });

  const seriesColors = [
    { line: '#0EA5E9', gradientId: 'colorBlue' },
    { line: '#8B5CF6', gradientId: 'colorPurple' },
    { line: '#10B981', gradientId: 'colorGreen' },
    { line: '#F59E0B', gradientId: 'colorOrange' },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700">
          <p className="font-semibold text-sm mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              <span className="font-bold">{entry.name}:</span>{' '}
              {entry.value.toLocaleString()} {config.tooltipSuffix || 'visitas'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            {seriesColors.map((color, idx) => (
              <linearGradient
                key={color.gradientId}
                id={color.gradientId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={color.line} stopOpacity={0.45} />
                <stop offset="50%" stopColor={color.line} stopOpacity={0.15} />
                <stop offset="100%" stopColor={color.line} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="name"
            stroke="#64748B"
            style={{ fontSize: '12px' }}
            tickLine={false}
          />
          <YAxis
            stroke="#64748B"
            style={{ fontSize: '12px' }}
            tickLine={false}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Tooltip content={<CustomTooltip />} />
          {hasMultipleSeries && (
            <RechartsLegend
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '13px',
                fontWeight: '500',
              }}
            />
          )}
          {data.datasets.map((dataset, index) => {
            const key = dataset.label || `serie${index}`;
            const color = seriesColors[index % seriesColors.length];
            return (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color.line}
                strokeWidth={3}
                fillOpacity={1}
                fill={`url(#${color.gradientId})`}
                animationDuration={1200}
                animationEasing="ease-in-out"
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ---------- WRAPPER GENÉRICO ----------

/**
 * @param {Object} props
 * @param {'pie'|'doughnut'|'bar'|'line'} props.type
 */
const EstadisticasChart = forwardRef(({
  type = 'pie',
  data,
  loading,
  size,
  height,
  totalVisitas,
  config = {},
}, ref) => {
  const defaultConfig = {
    labelKey: 'nombre',
    valueKey: 'valor',
    datasetLabel: 'Visitas',
    tooltipSuffix: 'visitas',
    centerLabel: 'visitas',
    emptyMessage: 'No hay datos registrados',
    emptyTitle: 'No hay datos registrados',
    emptySubtitle: 'en este período',
    ...config,
  };

  if (type === 'pie' || type === 'doughnut') {
    return (
      <PieChartComponent
        data={data}
        loading={loading}
        size={size}
        totalVisitas={totalVisitas}
        config={defaultConfig}
      />
    );
  }

  if (type === 'bar') {
    return (
      <BarChartComponent
        ref={ref}
        data={data}
        loading={loading}
        height={height}
        config={defaultConfig}
      />
    );
  }

  if (type === 'line') {
    return (
      <LineChartComponent
        data={data}
        loading={loading}
        height={height}
        config={defaultConfig}
      />
    );
  }

  return null;
});

export default EstadisticasChart;