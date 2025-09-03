import React, { useEffect, useState } from 'react';
import CatalogoPage from '../components/CatalogoPage';
import { personalService, areasService, tiposContratoService, tiposDocumentoService } from '../services/api';
import { personalFormFields, getTableColumns, transformPersonal, transformPersonalToBackend } from '../config/formFields.jsx';

const PersonalPage = () => {
  const [formFields, setFormFields] = useState(personalFormFields);
  const tableColumns = getTableColumns('personal');

  // Cargar áreas, tipos de contrato y tipos de documento para llenar los campos select
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
      formFields={formFields}
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