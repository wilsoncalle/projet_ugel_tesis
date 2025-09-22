import React, { useState } from 'react';
import Card from '../components/Card';
import TabView from '../components/TabView';
import AreasPage from './AreasPage';
import TiposContratoPage from './TiposContratoPage';
import MotivosVisitaPage from './MotivosVisitaPage';
import TiposDocumentoPage from './TiposDocumentoPage';
import MotivosSalidaPage from './MotivosSalidaPage';
import PersonalPage from './PersonalPage';

const AdminCatalogosPage = () => {
  const [activeTab, setActiveTab] = useState('personal');
  
  // Función para renderizar el catálogo activo
  const renderCatalogo = () => {
    switch (activeTab) {
      case 'personal':
        return <PersonalPage />;
      case 'areas':
        return <AreasPage />;
      case 'tiposContrato':
        return <TiposContratoPage />;
      case 'motivosVisita':
        return <MotivosVisitaPage />;
      case 'tiposDocumento':
        return <TiposDocumentoPage />;
      case 'motivosSalida':
        return <MotivosSalidaPage />;
      case 'usuarios':
        // Página de usuarios - pendiente de implementación
        return (
          <Card>
            <div className="p-6 text-center">
              <h3 className="text-lg font-medium text-gray-900">Gestión de Usuarios</h3>
              <p className="mt-2 text-sm text-gray-500">
                Este módulo está en desarrollo. Pronto podrá gestionar los usuarios del sistema desde aquí.
              </p>
            </div>
          </Card>
        );
      default:
        return <PersonalPage />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administración de Catálogos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestione los catálogos del sistema desde esta página centralizada
        </p>
      </div>

      {/* Tabs para los diferentes catálogos */}
      <TabView
        tabs={[
          {
            key: 'personal',
            label: 'Gestión de Personal',
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )
          },
          {
            key: 'areas',
            label: 'Áreas',
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            )
          },
          {
            key: 'tiposContrato',
            label: 'Tipos de Contrato',
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )
          },
          {
            key: 'motivosVisita',
            label: 'Motivos de Visita',
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            )
          },
          {
            key: 'tiposDocumento',
            label: 'Tipos de Documento',
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
            )
          },
          {
            key: 'motivosSalida',
            label: 'Motivos de Salida',
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            )
          },
          {
            key: 'usuarios',
            label: 'Usuarios',
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )
          }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="underline"
        size="lg"
      />

      {/* Contenido del catálogo seleccionado */}
      <div className="mt-4">
        {renderCatalogo()}
      </div>
    </div>
  );
};

export default AdminCatalogosPage;
