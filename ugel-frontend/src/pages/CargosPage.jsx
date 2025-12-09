import React, { useEffect, useState, useRef } from 'react';
import CatalogoPage from '../components/CatalogoPage';
import Input from '../components/Input';
import SelectCustom from '../components/SelectCustom';
import { cargosService } from '../services/api';
import { cargosFormFields, getTableColumns, transformCargos, transformCargosToBackend } from '../config/formFields.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const CargosPage = () => {
  useDocumentTitle('Cargos - COAC-UGEL');
  const [formFields, setFormFields] = useState(cargosFormFields);
  const tableColumns = getTableColumns('cargos');



  return (
    <CatalogoPage
      title="Gestión de Cargos"
      description="Administre los cargos disponibles en la institución"
      service={cargosService}
      formFields={formFields.map(field => {
        if (field.name === 'nombre_cargo') {
          return {
            ...field,
            render: ({ value, onChange, error }) => (
              <div>
                <Input
                  label="Nombre del Cargo"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="Ingrese el nombre del cargo"
                  maxLength={150}
                />
                {error && (
                  <p className="mt-1 text-sm text-red-600">{error}</p>
                )}
              </div>
            )
          };
        }

        if (field.name === 'descripcion') {
          return {
            ...field,
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
                  <label className="block text-sm font-medium text-gray-700 mb-3">Descripción</label>
                  <textarea
                    ref={textAreaRef}
                    value={value || ''}
                    onChange={handleChange}
                    placeholder="Ingrese una descripción del cargo (opcional)"
                    maxLength={250}
                    rows={3}
                    className={`
                      w-full px-3 py-2 border rounded-lg shadow-sm text-sm resize-none overflow-hidden
                      ${error ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'}
                    `}
                    style={{ height: 'auto' }}
                  />
                  <div className="mt-1 text-xs text-gray-500 text-right">{(value?.length || 0)}/250</div>
                  {error && (
                    <p className="mt-1 text-sm text-red-600">{error}</p>
                  )}
                </div>
              );
            }
          };
        }



        return field;
      })}
      tableColumns={tableColumns}
      moduleName="Cargos"
      transformData={transformCargos}
      transformDataToBackend={transformCargosToBackend}
      onSuccess={(operation, data) => {
        console.log(`${operation} successful:`, data);
      }}
      onError={(operation, error) => {
        console.error(`${operation} failed:`, error);
      }}
      showSoftDelete={true} // Mostrar pestañas de activos y eliminados
    />
  );
};

export default CargosPage;
