import { useState, useEffect } from 'react';
import { CommandLineIcon, XMarkIcon } from '@heroicons/react/24/outline';

const KeyboardShortcutsHelp = ({ activeTab = 'activos' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Mostrar ayuda automáticamente al cargar la página
  useEffect(() => {
    const hasSeenHelp = localStorage.getItem('keyboard-shortcuts-seen');
    if (!hasSeenHelp) {
      setShowHelp(true);
      localStorage.setItem('keyboard-shortcuts-seen', 'true');
    }
  }, []);

  // Atajos específicos por pestaña
  const shortcuts = {
    activos: [
      {
        key: 'Enter + Enter',
        description: 'Registrar visita completa (requiere doble confirmación)',
        category: 'Acción'
      },
      {
        key: '0-9',
        description: 'Escribir número de documento directamente',
        category: 'Enfoque rápido'
      }
    ],
    historial: [
      {
        key: 'Enter',
        description: 'Ejecutar búsqueda de historial',
        category: 'Acción'
      },
      {
        key: 'A-Z, 0-9',
        description: 'Escribir en campo de búsqueda directamente',
        category: 'Enfoque rápido'
      }
    ]
  };

  const currentShortcuts = shortcuts[activeTab] || [];

  if (!showHelp && !isVisible) return null;

  return (
    <>
      {/* Botón flotante para mostrar ayuda */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-40 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
        title="Ver atajos de teclado"
      >
        <CommandLineIcon className="h-5 w-5" />
      </button>

      {/* Modal de ayuda */}
      {(showHelp || isVisible) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CommandLineIcon className="h-5 w-5 mr-2" />
                  Atajos de Teclado
                </h3>
                <button
                  onClick={() => {
                    setIsVisible(false);
                    setShowHelp(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Pestaña actual:</strong> {activeTab === 'activos' ? 'Visitantes Activos' : 'Historial de Visitas'}
                  </p>
                </div>

                <div className="space-y-3">
                  {currentShortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono text-gray-700">
                            {shortcut.key}
                          </kbd>
                          <span className="text-sm text-gray-600">{shortcut.description}</span>
                        </div>
                        <span className="text-xs text-gray-500">{shortcut.category}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>💡 Tip:</strong> Los atajos solo funcionan cuando no hay ningún campo de formulario enfocado.
                  </p>
                  {activeTab === 'activos' && (
                    <p className="text-sm text-yellow-800 mt-2">
                      <strong>⚠️ Importante:</strong> Para registrar visitas se requiere presionar Enter dos veces consecutivas para evitar registros accidentales.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setIsVisible(false);
                    setShowHelp(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default KeyboardShortcutsHelp;
