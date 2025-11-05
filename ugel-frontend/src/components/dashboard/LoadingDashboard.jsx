import React from 'react';

/**
 * Componente de carga para el dashboard
 */
const LoadingDashboard = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Filtros skeleton */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200"></div>
            <div>
              <div className="h-5 bg-slate-200 rounded w-40 mb-2"></div>
              <div className="h-3 bg-slate-200 rounded w-56"></div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-56 h-10 bg-slate-200 rounded-xl"></div>
            <div className="w-24 h-10 bg-slate-200 rounded-xl"></div>
            <div className="w-24 h-10 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>

      {/* KPIs skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-24 mb-3"></div>
                <div className="h-8 bg-slate-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-20"></div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-slate-200"></div>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full"></div>
          </div>
        ))}
      </div>

      {/* Toggle skeleton */}
      <div className="bg-white rounded-2xl shadow-lg p-2 border border-slate-100">
        <div className="grid grid-cols-2 gap-2">
          <div className="h-20 bg-slate-200 rounded-xl"></div>
          <div className="h-20 bg-slate-200 rounded-xl"></div>
        </div>
      </div>

      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="h-6 bg-slate-200 rounded w-48 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-64"></div>
              </div>
              <div className="flex gap-2">
                <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                <div className="w-48 h-10 bg-slate-200 rounded-xl"></div>
              </div>
            </div>
            <div className="h-80 bg-slate-200 rounded-xl"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoadingDashboard;
