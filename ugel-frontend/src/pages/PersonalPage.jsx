import React, { useEffect, useState } from 'react';
import CatalogoPage from '../components/CatalogoPage';
import Input from '../components/Input';
import SelectCustom from '../components/SelectCustom';
import { personalService, areasService, tiposContratoService, tiposDocumentoService, cargosService } from '../services/api';
import { personalFormFields, getTableColumns, transformPersonal, transformPersonalToBackend } from '../config/formFields.jsx';

const PersonalPage = () => {
  const [formFields, setFormFields] = useState(personalFormFields);
  const tableColumns = getTableColumns('personal');

  // Cargar áreas, tipos de contrato, tipos de documento y cargos para llenar los campos select
  useEffect(() => {
    const loadOptions = async () => {
      try {
        // Cargar tipos de documento (solo activos por defecto)
        const tiposDocumentoResp = await tiposDocumentoService.getAll();
        const tiposDocumentoData = tiposDocumentoResp?.data?.data || tiposDocumentoResp?.data || [];
        const tiposDocumentoOptions = Array.isArray(tiposDocumentoData) ? tiposDocumentoData.map(tipo => ({
          value: tipo.codigo,
          label: tipo.nombre_completo
        })) : [];

        // Cargar áreas (solo activas por defecto)
        const areasResp = await areasService.getAll();
        const areasData = areasResp?.data?.data || areasResp?.data || [];
        const areasOptions = Array.isArray(areasData) ? areasData.map(area => ({
          value: area.id,
          label: area.nombre_area || area.nombre
        })) : [];

        // Cargar tipos de contrato (solo activos por defecto)
        const tiposContratoResp = await tiposContratoService.getAll();
        const tiposContratoData = tiposContratoResp?.data?.data || tiposContratoResp?.data || [];
        const tiposContratoOptions = Array.isArray(tiposContratoData) ? tiposContratoData.map(tipo => ({
          value: tipo.id,
          label: tipo.nombre_tipo || tipo.nombre
        })) : [];

        // Cargar cargos (solo activos por defecto)
        const cargosResp = await cargosService.getAll();
        const cargosData = cargosResp?.data?.data || cargosResp?.data || [];
        const cargosOptions = Array.isArray(cargosData) ? cargosData.map(cargo => ({
          value: cargo.id,
          label: cargo.nombre_cargo
        })) : [];

        // Actualizar los campos del formulario con las opciones cargadas
        const updatedFields = formFields.map(field => {
          if (field.name === 'tipoDocumento') {
            return { 
              ...field, 
              options: tiposDocumentoOptions
            };
          }
          if (field.name === 'areaDestinoId') {
            return { ...field, options: areasOptions };
          }
          if (field.name === 'tipoContratoId') {
            return { ...field, options: tiposContratoOptions };
          }
          if (field.name === 'cargoId') {
            return { ...field, options: cargosOptions };
          }
          return field;
        });

        setFormFields(updatedFields);
      } catch (error) {
        console.error('Error cargando opciones para el formulario:', error);
      }
    };

    loadOptions();
  }, []);

  return (
    <CatalogoPage
      title="Gestión de Personal"
      description="Administre la información del personal de la institución"
      service={personalService}
      formFields={formFields.map(field => {
        // Campos de texto
        if (['numeroDocumento', 'nombres', 'apellidos'].includes(field.name)) {
          const labels = {
            numeroDocumento: 'Número de Documento',
            nombres: 'Nombres',
            apellidos: 'Apellidos'
          };
          const maxLengths = {
            numeroDocumento: 20,
            nombres: 150,
            apellidos: 150
          };
          return {
            ...field,
            render: ({ value, onChange, error }) => (
              <Input
                label={labels[field.name]}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                maxLength={maxLengths[field.name]}
              />
            )
          };
        }

        // Selects con SelectCustom
        if (['tipoDocumento', 'cargoId', 'areaDestinoId', 'tipoContratoId'].includes(field.name)) {
          return {
            ...field,
            render: ({ value, onChange, error, field: fullField }) => (
              <div>
                <SelectCustom
                  label={field.label}
                  value={(fullField.options || []).find(opt => opt.value?.toString() === (value ?? '').toString()) || null}
                  onChange={(selected) => onChange(selected?.value || '')}
                  options={fullField.options || []}
                  placeholder={field.placeholder || 'Seleccione...'}
                  isSearchable={true}
                  noOptionsMessage={`No se encontraron ${field.label?.toLowerCase?.() || 'opciones'}`}
                />
                {error && (
                  <p className="mt-1 text-sm text-red-600">{error}</p>
                )}
              </div>
            )
          };
        }

        // Select de estado (activo) con opciones booleanas
        if (field.name === 'activo') {
          return {
            ...field,
            render: ({ value, onChange, error, field: fullField }) => (
              <div>
                <SelectCustom
                  label={field.label}
                  value={(fullField.options || []).find(opt => String(opt.value) === String(value)) || null}
                  onChange={(selected) => onChange(selected ? selected.value : '')}
                  options={(fullField.options || []).map(opt => ({ value: String(opt.value), label: opt.label }))}
                  placeholder={field.placeholder || 'Seleccione estado'}
                  isSearchable={false}
                />
                {error && (
                  <p className="mt-1 text-sm text-red-600">{error}</p>
                )}
              </div>
            )
          };
        }

        return field;
      })}
      tableColumns={tableColumns}
      moduleName="Personal"
      transformData={transformPersonal}
      transformDataToBackend={transformPersonalToBackend}
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

export default PersonalPage;