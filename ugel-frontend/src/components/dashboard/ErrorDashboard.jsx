import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Componente de error para el dashboard
 */
const ErrorDashboard = ({ error, onRetry }) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Ícono de error */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>

        {/* Mensaje de error */}
        <h2 className="text-2xl font-bold text-slate-800 mb-3">
          Error al cargar el dashboard
        </h2>
        <p className="text-slate-600 mb-6">
          {error || 'Ocurrió un error al cargar los datos. Por favor, intenta nuevamente.'}
        </p>

        {/* Botón de reintentar */}
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
        >
          <RefreshCw className="w-5 h-5" />
          Reintentar
        </button>

        {/* Información adicional */}
        <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-600">
            Si el problema persiste, contacta al administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrorDashboard;
