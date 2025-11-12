import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import FormularioGenerico from '../components/FormularioGenerico';
import Notification from '../components/Notification';
import { personalService, areasService, tiposContratoService } from '../services/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const CrearPersonalPage = () => {
  useDocumentTitle('Crear Personal - COAC-UGEL');
  const navigate = useNavigate();
  const { id } = useParams(); // Si estamos en modo edición, tendremos un ID
  const isEditMode = !!id;

  // Estados
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditMode);
  const [formError, setFormError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [personalData, setPersonalData] = useState({});
  
  // Estados para los catálogos
  const [areas, setAreas] = useState([]);
  const [tiposContrato, setTiposContrato] = useState([]);

  // Cargar datos de los catálogos y del personal si estamos en modo edición
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar áreas y tipos de contrato
        const [areasResponse, tiposContratoResponse] = await Promise.all([
          areasService.getAll(),
          tiposContratoService.getAll()
        ]);

        // Transformar los datos para los dropdowns
        setAreas(areasResponse.data.map(area => ({
          value: area.id,
          label: area.nombre_area || area.nombre
        })));

        setTiposContrato(tiposContratoResponse.data.map(tipo => ({
          value: tipo.id,
          label: tipo.nombre_tipo || tipo.nombre
        })));

        // Si estamos en modo edición, cargar los datos del personal
        if (isEditMode) {
          const personalResponse = await personalService.getById(id);
          const personalData = personalResponse.data;
          
          setPersonalData({
            ...personalData,
            area_id: personalData.area_id || personalData.areaId,
            tipo_contrato_id: personalData.tipo_contrato_id || personalData.tipoContratoId
          });
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
        setFormError('Error cargando los datos. Por favor, intente nuevamente.');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [id, isEditMode]);

  // Definir campos del formulario
  const formFields = [
    {
      name: 'nombres',
      label: 'Nombres',
      type: 'text',
      placeholder: 'Ingrese los nombres',
      required: true,
    },
    {
      name: 'apellidos',
      label: 'Apellidos',
      type: 'text',
      placeholder: 'Ingrese los apellidos',
      required: true,
    },
    {
      name: 'dni',
      label: 'DNI',
      type: 'text',
      placeholder: 'Ingrese el número de DNI',
      required: true,
      validation: (value) => {
        if (value && (!/^\d+$/.test(value) || value.length !== 8)) {
          return 'DNI debe contener 8 dígitos numéricos';
        }
        return null;
      },
    },
    {
      name: 'correo',
      label: 'Correo Electrónico',
      type: 'email',
      placeholder: 'Ingrese el correo electrónico',
      required: true,
      validation: (value) => {
        if (value && !/\S+@\S+\.\S+/.test(value)) {
          return 'Ingrese un correo electrónico válido';
        }
        return null;
      },
    },
    {
      name: 'telefono',
      label: 'Teléfono',
      type: 'text',
      placeholder: 'Ingrese el número de teléfono',
      required: false,
      validation: (value) => {
        if (value && !/^\d{9}$/.test(value)) {
          return 'El teléfono debe tener 9 dígitos numéricos';
        }
        return null;
      },
    },
    {
      name: 'area_id',
      label: 'Área de Destino',
      type: 'select',
      placeholder: 'Seleccione un área',
      required: true,
      options: areas,
    },
    {
      name: 'tipo_contrato_id',
      label: 'Tipo de Contrato',
      type: 'select',
      placeholder: 'Seleccione un tipo de contrato',
      required: true,
      options: tiposContrato,
    },
    {
      name: 'activo',
      label: 'Estado Activo',
      type: 'checkbox',
      defaultValue: true,
    },
  ];

  // Manejar envío del formulario
  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      setFormError(null);

      // Transformar datos si es necesario
      const dataToSend = {
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        dni: formData.dni,
        correo: formData.correo,
        telefono: formData.telefono,
        area_id: formData.area_id,
        tipo_contrato_id: formData.tipo_contrato_id,
        activo: formData.activo !== false, // Por defecto true si no se especifica
      };

      // Crear o actualizar según el modo
      let response;
      if (isEditMode) {
        response = await personalService.update(id, dataToSend);
      } else {
        response = await personalService.create(dataToSend);
      }

      // Mostrar notificación de éxito
      setNotification({
        message: `Personal ${isEditMode ? 'actualizado' : 'creado'} exitosamente`,
        type: 'success',
        duration: 3000
      });

      // Redirigir después de un breve delay
      setTimeout(() => {
        navigate('/personal');
      }, 2000);

    } catch (error) {
      console.error('Error en el envío del formulario:', error);
      
      // Extraer mensaje de error
      let errorMessage = 'Error al procesar la solicitud';
      
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.status === 409) {
        errorMessage = 'Ya existe un personal con este DNI';
      }
      
      setFormError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cancelación del formulario
  const handleCancel = () => {
    navigate('/personal');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Editar Personal' : 'Crear Nuevo Personal'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isEditMode 
              ? 'Actualice la información del personal' 
              : 'Complete el formulario para registrar un nuevo personal'}
          </p>
        </div>
        <Button variant="outline" onClick={handleCancel}>
          Volver
        </Button>
      </div>

      <Card>
        {loadingData ? (
          <div className="flex justify-center items-center h-40">
            <svg className="animate-spin h-10 w-10 text-primary-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <FormularioGenerico
            fields={formFields}
            initialData={personalData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitText={isEditMode ? 'Actualizar' : 'Guardar'}
            isLoading={loading}
            externalError={formError}
            layout="grid"
          />
        )}
      </Card>

      {/* Notification */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default CrearPersonalPage;
