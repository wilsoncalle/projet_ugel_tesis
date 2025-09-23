import React, { useEffect, useState } from 'react';
import CatalogoPage from '../components/CatalogoPage';
import { cargosService, areasService } from '../services/api';
import { cargosFormFields, getTableColumns, transformCargos, transformCargosToBackend } from '../config/formFields.jsx';

const CargosPage = () => {
  const [formFields, setFormFields] = useState(cargosFormFields);
  const tableColumns = getTableColumns('cargos');

  // Cargar áreas para llenar el campo select
  useEffect(() => {
    const loadOptions = async () => {
      try {
        // Cargar áreas (solo activas por defecto)
        const areasResp = await areasService.getAll();
        const areasData = areasResp?.data?.data || areasResp?.data || [];
        const areasOptions = Array.isArray(areasData) ? areasData.map(area => ({
          value: area.id,
          label: area.nombre_area || area.nombre
        })) : [];

        // Actualizar los campos del formulario con las opciones cargadas
        const updatedFields = formFields.map(field => {
          if (field.name === 'area_destino_id') {
            return { ...field, options: areasOptions };
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
      title="Gestión de Cargos"
      description="Administre los cargos disponibles en la institución"
      service={cargosService}
      formFields={formFields}
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
