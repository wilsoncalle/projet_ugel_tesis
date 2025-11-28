import React from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const MiAsistenciaPersonalPage = () => {
  useDocumentTitle('Mi Asistencia - COAC-UGEL');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Asistencia</h1>
          <p className="mt-1 text-sm text-gray-500">
            Historial y detalles de mi asistencia.
          </p>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-500">Próximamente: Visualización de asistencias personales.</p>
      </div>
    </div>
  );
};

export default MiAsistenciaPersonalPage;
