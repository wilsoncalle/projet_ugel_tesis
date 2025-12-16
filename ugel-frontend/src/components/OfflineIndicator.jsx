import { useState, useEffect } from 'react';
import { WifiIcon, CloudArrowUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useConnectivity } from '../hooks/useConnectivity';

const OfflineIndicator = () => {
  // Usar el nuevo hook de conectividad con verificación real
  const { online: browserOnline, verified: serverReachable, isOffline } = useConnectivity('/api/health', 15000);
  
  // Para compatibilidad, consideramos "online" como browserOnline && serverReachable
  const online = !isOffline;

  const [pendingCount, setPendingCount] = useState({ total: 0, visitas: 0, salidas: 0 });
  const [syncing, setSyncing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Cargar datos pendientes
  const loadPendingData = async () => {
    try {
      const { getPendingVisitas, getPendingSalidas } = await import('../utils/offlineDB');
      const visitas = await getPendingVisitas();
      const salidas = await getPendingSalidas();
      
      setPendingCount({
        total: visitas.length + salidas.length,
        visitas: visitas.length,
        salidas: salidas.length
      });
    } catch (error) {
      console.error('Error loading pending data:', error);
    }
  };

  // Actualizar estado de conexión y datos
  useEffect(() => {
    const handleSyncComplete = (event) => {
      loadPendingData();
      setSyncing(false);
    };

    // Listeners para eventos personalizados
    window.addEventListener('offline-sync-complete', handleSyncComplete);
    
    // Cargar datos iniciales
    loadPendingData();
    
    // Intervalo para verificar datos pendientes periódicamente
    const intervalId = setInterval(loadPendingData, 5000);

    return () => {
      window.removeEventListener('offline-sync-complete', handleSyncComplete);
      clearInterval(intervalId);
    };
  }, []);

  // Función para forzar sincronización manual
  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const { syncPendingData } = await import('../utils/offlineSync');
      await syncPendingData();
      await loadPendingData();
    } catch (error) {
      console.error('Error en sincronización manual:', error);
    } finally {
      setSyncing(false);
    }
  };

  // No mostrar nada si estamos online y no hay datos pendientes
  if (online && pendingCount.total === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Indicador principal */}
      <div 
        className={`
          rounded-lg shadow-lg p-3 cursor-pointer transition-all duration-300
          ${online 
            ? pendingCount.total > 0 
              ? 'bg-yellow-500 hover:bg-yellow-600' 
              : 'bg-green-500 hover:bg-green-600'
            : 'bg-red-500 hover:bg-red-600'
          }
        `}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center space-x-2 text-white">
          {online ? (
            <>
              <WifiIcon className="h-5 w-5" />
              {pendingCount.total > 0 && (
                <>
                  <CloudArrowUpIcon className={`h-5 w-5 ${syncing ? 'animate-bounce' : ''}`} />
                  <span className="font-semibold">{pendingCount.total}</span>
                </>
              )}
            </>
          ) : (
            <>
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span className="font-medium">Sin conexión</span>
            </>
          )}
        </div>
      </div>

      {/* Panel de detalles */}
      {showDetails && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl p-4 w-80 border border-gray-200">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-semibold text-gray-800">
                Estado de Sincronización
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Estado de conexión */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium text-gray-700">
                {online ? 'Conectado' : 'Sin conexión'}
              </span>
            </div>

            {/* Datos pendientes */}
            {pendingCount.total > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <CloudArrowUpIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">
                      Datos pendientes de sincronización
                    </p>
                    <ul className="mt-2 text-xs text-yellow-700 space-y-1">
                      {pendingCount.visitas > 0 && (
                        <li>• {pendingCount.visitas} visita(s) pendiente(s)</li>
                      )}
                      {pendingCount.salidas > 0 && (
                        <li>• {pendingCount.salidas} salida(s) pendiente(s)</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="space-y-2">
              {online && pendingCount.total > 0 && (
                <button
                  onClick={handleManualSync}
                  disabled={syncing}
                  className={`
                    w-full px-4 py-2 rounded-lg text-white font-medium text-sm
                    ${syncing 
                      ? 'bg-blue-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                    }
                    transition-colors duration-200
                  `}
                >
                  {syncing ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sincronizando...
                    </span>
                  ) : (
                    'Sincronizar ahora'
                  )}
                </button>
              )}
            </div>

            {/* Información adicional */}
            {!online && (
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                <p className="font-medium mb-1">Modo Offline Activo</p>
                <p>Los cambios se guardarán localmente y se sincronizarán automáticamente cuando vuelva la conexión.</p>
              </div>
            )}

            {online && pendingCount.total > 0 && (
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                <p className="font-medium mb-1">Sincronización Automática</p>
                <p>Los datos se sincronizarán automáticamente en segundo plano. También puedes forzar la sincronización ahora.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;

