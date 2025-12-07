import React, { useState, useRef } from 'react';
import CatalogoPage from '../components/CatalogoPage';
import Input from '../components/Input';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { reniecProvidersService } from '../services/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const ReniecProvidersPage = () => {
  useDocumentTitle('Proveedores RENIEC - COAC-UGEL');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleActivate = async (id) => {
    try {
      await reniecProvidersService.activate(id);
      // Force refresh of the CatalogoPage to show the new active state
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error activating provider:', error);
    }
  };

  const formFields = [
    {
      name: 'nombre',
      label: 'Nombre del proveedor',
      type: 'text',
      required: true,
      placeholder: 'Ej. Proveedor RENIEC',
      render: ({ value, onChange, error }) => (
        <Input
          label="Nombre del proveedor"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          error={error}
          required
          autoComplete="off"
        />
      )
    },
    {
      name: 'baseUrl',
      label: 'URL de consulta',
      type: 'text',
      required: true,
      placeholder: 'https://tu-proveedor.com/reniec?numero={dni}',
      render: ({ value, onChange, error }) => (
        <Input
          label="URL de consulta (usa {dni})"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          error={error}
          placeholder="https://tu-proveedor.com/reniec?numero={dni}"
          required
          helpText="Usa {dni} como comodín en la URL."
          autoComplete="off"
        />
      )
    },
    {
      name: 'token',
      label: 'Token / Authorization',
      type: 'password', // Logical type for config
      render: ({ value, onChange, error }) => (
        <Input
          label="Token / Authorization (Bearer)"
          type="password"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          error={error}
          placeholder="Token del proveedor (opcional)"
          autoComplete="new-password"
        />
      )
    },
    {
      name: 'notas',
      label: 'Notas',
      type: 'textarea',
      required: false,
      render: ({ value, onChange, error }) => {
        const textAreaRef = useRef(null);
        const handleChange = (e) => {
          onChange(e.target.value);
          const el = textAreaRef.current;
          if (el) {
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
          }
        };
        return (
          <div className="w-full space-y-1">
            <label className="block text-sm font-medium text-gray-700 mb-3">Notas</label>
            <textarea
              ref={textAreaRef}
              value={value || ''}
              onChange={handleChange}
              placeholder="Observaciones internas (límites, soporte, etc.)"
              maxLength={500}
              rows={3}
              className={`
                w-full px-3 py-2 border rounded-lg shadow-sm text-sm resize-none overflow-hidden
                ${error ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'}
              `}
              style={{ height: 'auto' }}
            />
            <div className="mt-1 text-xs text-gray-500 text-right">{(value?.length || 0)}/500</div>
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>
        );
      }
    },
    {
      name: 'activar',
      label: 'Activar inmediatamente',
      type: 'checkbox',
      showOnEdit: false // Only show on create or handle specifically if API supports "activar" on update
    }
  ];

  const tableColumns = [
    {
      key: 'nombre',
      title: 'Proveedor',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.nombre}</p>
          <p className="text-xs text-gray-500">
            Creado: {row.fecha_creacion ? new Date(row.fecha_creacion).toLocaleDateString('es-PE') : '—'}
          </p>
        </div>
      )
    },
    {
      key: 'baseUrl',
      title: 'URL Base',
      render: (row) => (
        <div className="max-w-xs truncate" title={row.base_url}>
          {row.base_url}
        </div>
      )
    },
    {
      key: 'notas',
      title: 'Notas',
      render: (row) => (
        <div className="max-w-xs truncate text-gray-900" title={row.notas}>
          {row.notas || '—'}
        </div>
      )
    },
    {
      key: 'status',
      title: 'Estado',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.activo ? (
            <Badge variant="success">Activo</Badge>
          ) : (
            <>
              <Badge variant="default">Inactivo</Badge>
              <Button
                variant="outline"
                className="h-6 px-3 text-xs py-0 min-h-[24px]" 
                onClick={() => handleActivate(row.id)}
                title="Activar este proveedor"
              >
                Activar
              </Button>
            </>
          )}
        </div>
      )
    }
  ];

  // Helper to transform data coming from API to frontend structure if fields differ
  const transformData = (data) => {
    return data.map(item => ({
      ...item,
      // Ensure specific mappings if needed, e.g. base_url to baseUrl for table?
      // Actually table uses 'baseUrl' key but data has 'base_url'. 
      // I can map it here or index with row.base_url in render.
      // let's normalize to camelCase for consistency if form uses camelCase
      baseUrl: item.base_url 
    }));
  };

  // Helper to transform form data to backend structure
  const transformDataToBackend = (data) => {
    return {
      ...data,
      // Map form fields to backend expected fields
      nombre: data.nombre,
      baseUrl: data.baseUrl,
      token: data.token,
      notas: data.notas,
      activar: data.activar
    };
  };

  return (
    <CatalogoPage
      key={refreshKey} // Force remount to refresh list when external action happens
      title="Gestión de Proveedores RENIEC"
      description="Administra el proveedor activo para las consultas de DNI"
      moduleName="Proveedor"
      service={reniecProvidersService}
      formFields={formFields}
      tableColumns={tableColumns}
      transformData={transformData}
      transformDataToBackend={transformDataToBackend}
      searchable={true}
      showSoftDelete={false} // Backend doesn't support soft delete in the standard way for this module yet
      formLayout="vertical"
    />
  );
};

export default ReniecProvidersPage;
