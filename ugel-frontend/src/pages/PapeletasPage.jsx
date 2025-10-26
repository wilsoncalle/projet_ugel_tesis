import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import TableGenerica from '../components/TableGenerica';
import Button from '../components/Button';
import ModalGenerico from '../components/ModalGenerico';
import FormularioGenerico from '../components/FormularioGenerico';
import Notification from '../components/Notification';
import TabView from '../components/TabView';
import { papeletasSalidaService, motivosSalidaService, personalService } from '../services/api';
import useCrud from '../hooks/useCrud';

const PapeletasPage = () => {
  // Estados
  const [formError, setFormError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('pendientes');
  const [personal, setPersonal] = useState([]);
  const [motivosSalida, setMotivosSalida] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estadoFilter, setEstadoFilter] = useState('pendiente');
  
  // Configuración de CRUD
  const {
    items: papeletas,
    currentItem,
    error,
    crudError,
    isModalOpen,
    isDeleteModalOpen,
    itemToDelete,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    openCreateModal,
    openEditModal,
    closeModal,
    openDeleteModal,
    closeDeleteModal,
  } = useCrud(papeletasSalidaService, {
    transformData: (data) => {
      return data.map(item => ({
        ...item,
        // Manejar datos aplanados del backend
        personal_nombre: item.personal_nombres && item.personal_apellidos 
          ? `${item.personal_nombres} ${item.personal_apellidos}`.trim()
          : item.personal 
            ? `${item.personal.nombres} ${item.personal.apellidos}`.trim()
            : 'No asignado',
        motivo_nombre: item.nombre_motivo || 
          (item.motivoSalida ? item.motivoSalida.nombre_motivo || item.motivoSalida.nombre : null) || 
          'No especificado',
        // Extraer fecha y horas desde los timestamps
        fecha: item.fecha_hora_salida ? item.fecha_hora_salida.split('T')[0] : '',
        horaInicio: item.fecha_hora_salida,
        horaFin: item.fecha_hora_retorno_real || item.fecha_hora_retorno_estimada,
        // Determinar estado basado en retorno
        estado: item.fecha_hora_retorno_real ? 'aprobada' : 'pendiente'
      }));
    },
    onSuccess: (operation, data) => {
      console.log(`${operation} successful:`, data);
      
      if (operation === 'create') {
        setNotification({
          message: 'Papeleta de salida creada exitosamente',
          type: 'success',
          duration: 3000
        });
      } else if (operation === 'update') {
        setNotification({
          message: 'Papeleta de salida actualizada exitosamente',
          type: 'success',
          duration: 3000
        });
      } else if (operation === 'delete') {
        setNotification({
          message: 'Papeleta de salida anulada exitosamente',
          type: 'success',
          duration: 3000
        });
      }
      
      // Limpiar errores cuando se cierra el modal
      if (operation === 'closeModal') {
        setFormError(null);
      }
    },
    onError: (operation, error) => {
      console.error(`${operation} failed:`, error);
      
      let errorMessage = 'Error al procesar la solicitud';
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.status === 409) {
        errorMessage = 'Ya existe una papeleta activa para este personal en este horario';
      }
      
      setFormError(errorMessage);
    }
  });
  
  // Cargar datos al montar el componente una sola vez
  const isLoading = React.useRef(false);
  const fetchAttempted = React.useRef(false);

  useEffect(() => {
    const cargarDatos = async () => {
      // Solo cargar si no se ha intentado y no está cargando actualmente
      if (fetchAttempted.current || isLoading.current) return;
      
      isLoading.current = true;
      fetchAttempted.current = true;
      
      try {
        setLoading(true);
        
        // Cargar personal y motivos de salida para los formularios
        const [personalResp, motivosResp] = await Promise.all([
          personalService.getAll(),
          motivosSalidaService.getAll()
        ]);
        
        // Procesamos la respuesta del personal asegurando que sea un array
        if (personalResp?.data?.data && Array.isArray(personalResp.data.data)) {
          setPersonal(personalResp.data.data);
        } else if (personalResp?.data && Array.isArray(personalResp.data)) {
          setPersonal(personalResp.data);
        } else {
          console.error('Error: la respuesta de personal no es un array válido', personalResp);
          setPersonal([]);
        }
        
        // Procesamos la respuesta de motivos asegurando que sea un array
        if (motivosResp?.data?.data && Array.isArray(motivosResp.data.data)) {
          setMotivosSalida(motivosResp.data.data);
        } else if (motivosResp?.data && Array.isArray(motivosResp.data)) {
          setMotivosSalida(motivosResp.data);
        } else {
          console.error('Error: la respuesta de motivos no es un array válido', motivosResp);
          setMotivosSalida([]);
        }
        
        // Cargar papeletas
        await fetchItems();
        console.log('Datos de papeletas cargados exitosamente');
      } catch (error) {
        console.error('Error cargando datos:', error);
        // Aseguramos que aún en caso de error, siempre tendremos arrays vacíos
        setPersonal([]);
        setMotivosSalida([]);
      } finally {
        setLoading(false);
        isLoading.current = false;
      }
    };
    
    cargarDatos();
    
    // Cleanup function
    return () => {
      fetchAttempted.current = false;
    };
  }, []); // Eliminar fetchItems como dependencia para evitar múltiples cargas
  
  // Registrar retorno
  const handleRegistrarRetorno = async (id) => {
    try {
      await papeletasSalidaService.registrarRetorno(id);
      
      setNotification({
        message: 'Retorno registrado exitosamente',
        type: 'success',
        duration: 3000
      });
      
      // Recargar datos una sola vez sin causar bucles
      try {
        // Prevenir múltiples cargas simultáneas
        if (!isLoading.current) {
          isLoading.current = true;
          await fetchItems();
          isLoading.current = false;
        }
      } catch (error) {
        console.error('Error recargando datos después de registrar retorno:', error);
        isLoading.current = false;
      }
    } catch (error) {
      console.error('Error registrando retorno:', error);
      
      setNotification({
        message: 'Error al registrar el retorno',
        type: 'error',
        duration: 5000
      });
    }
  };
  
  // Filtrar papeletas por estado
  const papeletasFiltradas = papeletas.filter(p => {
    if (activeTab === 'pendientes') {
      return p.estado === 'pendiente';
    } else if (activeTab === 'aprobadas') {
      return p.estado === 'aprobada';
    } else if (activeTab === 'rechazadas') {
      return p.estado === 'rechazada';
    }
    return true;
  });
  
  // Configuración de campos del formulario
  const formFields = [
    {
      name: 'personalId',
      label: 'Personal',
      type: 'select',
      placeholder: 'Seleccione el personal',
      required: true,
      options: personal.map(p => ({ value: p.id, label: `${p.nombres} ${p.apellidos}` }))
    },
    {
      name: 'motivoSalidaId',
      label: 'Motivo de Salida',
      type: 'select',
      placeholder: 'Seleccione el motivo',
      required: true,
      options: motivosSalida.map(m => ({ value: m.id, label: m.nombre_motivo || m.nombre }))
    },
    {
      name: 'fecha',
      label: 'Fecha',
      type: 'date',
      required: true,
      defaultValue: new Date().toISOString().split('T')[0]
    },
    {
      name: 'horaInicio',
      label: 'Hora de Inicio',
      type: 'time',
      required: true,
      defaultValue: new Date().toTimeString().slice(0, 5)
    },
    {
      name: 'horaFin',
      label: 'Hora de Fin',
      type: 'time',
      required: true,
      defaultValue: new Date(Date.now() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5) // 2 horas después
    },
    {
      name: 'observaciones',
      label: 'Observaciones',
      type: 'textarea',
      placeholder: 'Ingrese observaciones o detalles adicionales',
      rows: 3,
      className: 'resize-none' // Evitar redimensionamiento
    }
  ];
  
  // Manejo de envío de formulario
  const handleSubmit = async (formData) => {
    try {
      setFormError(null);
      
      // Preparar datos para envío
      const data = {
        ...formData,
        estado: 'pendiente' // Estado inicial siempre pendiente
      };
      
      if (currentItem) {
        // Actualizar existente
        await updateItem(currentItem.id, data);
      } else {
        // Crear nuevo
        await createItem(data);
      }
      
      // No es necesario recargar datos manualmente aquí,
      // ya que createItem y updateItem ya llaman a fetchItems internamente
    } catch (error) {
      console.error('Error en envío de formulario:', error);
      
      let errorMessage = 'Error al procesar la solicitud';
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.status === 409) {
        errorMessage = 'Ya existe una papeleta activa para este personal en este horario';
      }
      
      setFormError(errorMessage);
    }
  };
  
  // Manejar anulación
  const handleAnular = async () => {
    if (itemToDelete) {
      try {
        await deleteItem(itemToDelete.id);
        // No es necesario recargar datos manualmente aquí,
        // ya que deleteItem ya llama a fetchItems internamente
      } catch (error) {
        console.error('Error al anular papeleta:', error);
      }
    }
  };
  
  // Formateo de fechas y horas
  const formatFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES');
  };
  
  const formatHora = (horaStr) => {
    // Validar que horaStr sea un string válido
    if (!horaStr || typeof horaStr !== 'string') {
      return '';
    }
    
    // Si la hora ya viene formateada como HH:MM, la retornamos
    if (horaStr.includes(':')) {
      return horaStr;
    }
    
    // Si es una fecha ISO, extraemos la hora
    if (horaStr.includes('T')) {
      return horaStr.split('T')[1].substring(0, 5);
    }
    
    return horaStr;
  };
  
  // Obtener estado de la papeleta con color
  const renderEstado = (estado) => {
    let bgColor, textColor, text;
    
    switch(estado) {
      case 'pendiente':
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        text = 'Pendiente';
        break;
      case 'aprobada':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        text = 'Aprobada';
        break;
      case 'rechazada':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        text = 'Rechazada';
        break;
      default:
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
        text = estado || 'Desconocido';
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {text}
      </span>
    );
  };
  
  // Configuración de columnas de la tabla
  const tableColumns = [
    { key: 'id', title: 'ID', className: 'w-16' },
    { key: 'personal_nombre', title: 'Personal' },
    { 
      key: 'fecha', 
      title: 'Fecha', 
      render: (row) => formatFecha(row.fecha)
    },
    { 
      key: 'horaInicio', 
      title: 'Hora Inicio', 
      render: (row) => formatHora(row.horaInicio) 
    },
    { 
      key: 'horaFin', 
      title: 'Hora Fin', 
      render: (row) => formatHora(row.horaFin) 
    },
    { key: 'motivo_nombre', title: 'Motivo' },
    { 
      key: 'estado', 
      title: 'Estado',
      render: (row) => renderEstado(row.estado)
    }
  ];
  
  // Acciones disponibles según el estado
  const renderAcciones = (_, papeleta) => {
    return (
      <div className="flex space-x-2">
        {papeleta.estado === 'pendiente' && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEditModal(papeleta)}
            >
              Editar
            </Button>
            <Button
              size="sm"
              variant="success"
              onClick={() => handleRegistrarRetorno(papeleta.id)}
            >
              Registrar Retorno
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => openDeleteModal(papeleta)}
            >
              Anular
            </Button>
          </>
        )}
        
        {papeleta.estado === 'aprobada' && !papeleta.horaRetorno && (
          <Button
            size="sm"
            variant="success"
            onClick={() => handleRegistrarRetorno(papeleta.id)}
          >
            Registrar Retorno
          </Button>
        )}
        
        {/* Para cualquier estado, siempre mostramos el botón Ver */}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => openEditModal({...papeleta, readOnly: true})}
        >
          Ver
        </Button>
      </div>
    );
  };
  
  // Columnas finales con acciones
  const finalColumns = [...tableColumns, { key: 'acciones', title: 'Acciones', render: renderAcciones }];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Papeletas de Salida</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestione las papeletas de salida del personal
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          leftIcon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          }
        >
          Nueva Papeleta
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error.message}
        </div>
      )}

      {/* Tabs para filtrar por estado */}
      <TabView
        tabs={[
          {
            key: 'pendientes',
            label: 'Pendientes',
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            count: papeletas.filter(p => p.estado === 'pendiente').length
          },
          {
            key: 'aprobadas',
            label: 'Aprobadas',
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            count: papeletas.filter(p => p.estado === 'aprobada').length
          },
          {
            key: 'rechazadas',
            label: 'Rechazadas',
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            count: papeletas.filter(p => p.estado === 'rechazada').length
          },
          {
            key: 'todas',
            label: 'Todas',
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            ),
            count: papeletas.length
          }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Table */}
      <Card>
        <TableGenerica
          columns={finalColumns}
          data={papeletasFiltradas}
          isLoading={loading}
          emptyMessage="No hay papeletas de salida para mostrar"
          searchable={true}
          searchPlaceholder="Buscar por nombre, motivo..."
          pagination={true}
          itemsPerPage={10}
        />
      </Card>

      {/* Create/Edit Modal */}
      <ModalGenerico
        isOpen={isModalOpen}
        onClose={closeModal}
        title={
          currentItem ? 
            currentItem.readOnly ? 
              "Ver Papeleta de Salida" : 
              "Editar Papeleta de Salida" : 
            "Nueva Papeleta de Salida"
        }
        size="lg"
        footer={
          currentItem?.readOnly ? (
            <div className="flex justify-end space-x-2">
              <Button variant="primary" onClick={closeModal}>
                Cerrar
              </Button>
            </div>
          ) : (
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  // Trigger form submission
                  const form = document.getElementById('papeleta-form');
                  if (form) {
                    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                  }
                }}
                disabled={loading}
              >
                {loading ? 'Guardando...' : (currentItem ? 'Actualizar' : 'Guardar')}
              </Button>
            </div>
          )
        }
      >
        <FormularioGenerico
          id="papeleta-form"
          fields={formFields}
          initialData={currentItem || {}}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          submitText={currentItem ? 'Actualizar' : 'Guardar'}
          showSubmitButton={false}
          showCancelButton={false}
          externalError={crudError?.message || formError}
          layout="grid"
          readOnly={currentItem?.readOnly}
        />
      </ModalGenerico>

      {/* Delete Confirmation Modal */}
      <ModalGenerico
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        title="Confirmar Anulación"
        size="sm"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={closeDeleteModal}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleAnular}>
              Anular
            </Button>
          </div>
        }
      >
        <p>
          ¿Está seguro que desea anular la papeleta de salida para{' '}
          <strong>{itemToDelete?.personal_nombre}</strong>?
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Esta acción no se puede deshacer.
        </p>
      </ModalGenerico>
      
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

export default PapeletasPage;
