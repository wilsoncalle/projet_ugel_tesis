import { useEffect, useState, useRef, useMemo } from 'react';
import Card from './Card';
import AdaptiveTable from './AdaptiveTable';
import ModalGenerico from './ModalGenerico';
import FormularioGenerico from './FormularioGenerico';
import Button from './Button';
import Notification from './Notification';
import TabView from './TabView';
import useCrud from '../hooks/useCrud';

const CatalogoPage = ({
  title,
  description,
  service,
  formFields,
  tableColumns,
  moduleName,
  transformData,
  transformDataToBackend,
  onSuccess,
  onError,
  searchable = true,
  pagination = true,
  itemsPerPage = 10,
  showSoftDelete = true, // Nueva prop para habilitar soft delete
  onCreateClick = null, // Para manejar la creación de manera personalizada
  onEditClick = null,   // Para manejar la edición de manera personalizada
  showModalForm = true, // Para controlar si se muestra el modal de formulario
  formLayout = 'vertical', // Layout del formulario: 'vertical' | 'horizontal' | 'grid'
}) => {
  const [formError, setFormError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' o 'deleted'
  const [deletedItems, setDeletedItems] = useState([]);
  const [deletedItemsLoading, setDeletedItemsLoading] = useState(false);
  const hasInitialized = useRef(false);
  const [formData, setFormData] = useState({}); // Estado para los datos del formulario
  
  const {
    items,
    currentItem,
    loading,
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
  } = useCrud(service, {
    transformData,
    transformDataToBackend,
    onSuccess: (operation, data) => {
      console.log(`${operation} successful:`, data);
      if (operation === 'closeModal') {
        setFormError(null);
      }
      
      // Mostrar notificación de éxito
      if (operation === 'create') {
        setNotification({
          message: `${moduleName} creado exitosamente`,
          type: 'success',
          duration: 3000
        });
      } else if (operation === 'update') {
        setNotification({
          message: `${moduleName} actualizado exitosamente`,
          type: 'success',
          duration: 3000
        });
      } else if (operation === 'delete') {
        setNotification({
          message: `${moduleName} eliminado exitosamente`,
          type: 'success',
          duration: 3000
        });
      }
    },
    onError: (operation, error) => {
      console.error(`${operation} failed:`, error);
      console.log('onError callback - Error structure:', {
        operation,
        error,
        response: error?.response,
        data: error?.response?.data,
        message: error?.response?.data?.message
      });
      
      // Solo mostrar error en el modal, no en la página principal
      if (operation === 'fetch') {
        // Error de carga de datos - mostrar en la página principal
        return;
      }
      
      // Error de operación CRUD - NO mostrar en la página principal
      // Solo establecer el error del formulario
      let errorMessage = 'Error al procesar la solicitud';
      
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.status === 409) {
        // Para errores de conflicto, mostrar mensaje específico según el módulo
        if (moduleName.toLowerCase().includes('motivo de salida')) {
          errorMessage = 'Ya existe un motivo de salida con este nombre';
        } else if (moduleName.toLowerCase().includes('motivo de visita')) {
          errorMessage = 'Ya existe un motivo de visita con este nombre';
        } else if (moduleName.toLowerCase().includes('tipo de contrato')) {
          errorMessage = 'Ya existe un tipo de contrato con este nombre';
        } else if (moduleName.toLowerCase().includes('tipo de documento')) {
          errorMessage = 'Ya existe un tipo de documento con este nombre';
        } else if (moduleName.toLowerCase().includes('área')) {
          errorMessage = 'Ya existe un área con este nombre';
        } else {
          errorMessage = 'Ya existe un registro con estos datos';
        }
      } else if (error?.response?.status === 500) {
        errorMessage = 'Error interno del servidor';
      }
      
      setFormError(errorMessage);
    },
  });

  // Memoizar los campos filtrados para evitar re-renders innecesarios
  const filteredFormFields = useMemo(() => {
    return formFields.filter(field => {
      // Si es creación (currentItem es null/undefined)
      if (!currentItem) {
        // Mostrar solo campos que no tienen showOnCreate: false
        return field.showOnCreate !== false;
      } else {
        // Si es edición, mostrar solo campos que no tienen showOnEdit: false
        return field.showOnEdit !== false;
      }
    });
  }, [formFields, currentItem]);

  // Memoizar initialData para evitar re-renders innecesarios
  const memoizedInitialData = useMemo(() => {
    return currentItem || {};
  }, [currentItem]);

  // Fetch items on component mount (only once)
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchItems();
      if (showSoftDelete) {
        fetchDeletedItems();
      }
    }
  }, [fetchItems, showSoftDelete]);

  // Sincronizar el estado del formulario cuando cambie currentItem (solo al abrir/cerrar modal)
  useEffect(() => {
    if (isModalOpen) {
      if (currentItem) {
        setFormData(currentItem);
      } else {
        setFormData({});
      }
      setFormError(null);
    }
  }, [currentItem, isModalOpen]);

  // Función para cargar elementos eliminados
  const fetchDeletedItems = async () => {
    if (!service.getDeleted) return;
    
    try {
      setDeletedItemsLoading(true);
      const response = await service.getDeleted();
      const data = response?.data?.data || [];
      const transformed = transformData ? transformData(data) : data;
      setDeletedItems(Array.isArray(transformed) ? transformed : []);
    } catch (error) {
      console.error('Error cargando elementos eliminados:', error);
    } finally {
      setDeletedItemsLoading(false);
    }
  };


  // Handle form submission
  const handleSubmit = async (formData) => {
    try {
      setFormError(null); // Clear previous errors
      
      if (currentItem) {
        // Update existing item
        await updateItem(currentItem.id, formData);
      } else {
        // Create new item
        await createItem(formData);
      }
    } catch (error) {
      console.error('Error in form submission:', error);
      // Extract error message from the error object
      let errorMessage = 'Error al procesar la solicitud';
      
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.status === 409) {
        // Para errores de conflicto, mostrar mensaje específico según el módulo
        if (moduleName.toLowerCase().includes('motivo de salida')) {
          errorMessage = 'Ya existe un motivo de salida con este nombre';
        } else if (moduleName.toLowerCase().includes('motivo de visita')) {
          errorMessage = 'Ya existe un motivo de visita con este nombre';
        } else if (moduleName.toLowerCase().includes('tipo de contrato')) {
          errorMessage = 'Ya existe un tipo de contrato con este nombre';
        } else if (moduleName.toLowerCase().includes('tipo de documento')) {
          errorMessage = 'Ya existe un tipo de documento con este nombre';
        } else if (moduleName.toLowerCase().includes('área')) {
          errorMessage = 'Ya existe un área con este nombre';
        } else {
          errorMessage = 'Ya existe un registro con estos datos';
        }
      } else if (error?.response?.status === 500) {
        errorMessage = 'Error interno del servidor';
      }
      
      setFormError(errorMessage);
    }
  };

  // Función para manejar el envío desde el botón del footer
  const handleSubmitFromFooter = async () => {
    // Validar campos requeridos
    const errors = {};
    formFields.forEach(field => {
      if (field.required && !formData[field.name]) {
        errors[field.name] = `${field.label} es requerido`;
      }
    });
    
    if (Object.keys(errors).length > 0) {
      setFormError('Por favor complete todos los campos requeridos');
      return;
    }
    
    // Enviar el formulario
    await handleSubmit(formData);
  };

  // Función para manejar cambios en el formulario
  const handleFormChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Limpiar error cuando el usuario escribe
    if (formError) {
      setFormError(null);
    }
  };

  // Handle delete confirmation
  const handleDelete = async () => {
    if (itemToDelete) {
      await deleteItem(itemToDelete.id);
      // Recargar elementos eliminados después de eliminar
      if (showSoftDelete) {
        fetchDeletedItems();
      }
    }
  };

  // Función para restaurar elemento eliminado
  const handleRestore = async (item) => {
    if (!service.restore) return;
    
    try {
      await service.restore(item.id);
      
      // Mostrar notificación de éxito
      setNotification({
        message: `${moduleName} restaurado exitosamente`,
        type: 'success',
        duration: 3000
      });
      
      // Recargar ambas listas
      await fetchItems();
      await fetchDeletedItems();
      
      // Cambiar a la pestaña activa
      setActiveTab('active');
    } catch (error) {
      console.error('Error restaurando elemento:', error);
      setNotification({
        message: 'Error al restaurar el elemento',
        type: 'error',
        duration: 5000
      });
    }
  };

  // Generate actions column for active items
  const actions = (row) => (
    <div className="flex space-x-2">
      <button
        type="button"
        className="w-8 h-8 rounded-full border border-blue-600 bg-blue-600 hover:bg-blue-700 hover:border-blue-700 flex items-center justify-center transition-colors duration-200"
        onClick={() => {
          if (onEditClick) {
            // Si hay una función personalizada, llamarla
            const shouldUseDefaultAction = onEditClick(row);
            if (shouldUseDefaultAction === false) return; // Si devuelve false, no abrir el modal
          }
          console.log('CatalogoPage - Abriendo modal de edición con row:', row);
          openEditModal(row);
        }}
        title="Editar"
      >
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button
        type="button"
        className="w-8 h-8 rounded-full border border-red-600 bg-red-600 hover:bg-red-700 hover:border-red-700 flex items-center justify-center transition-colors duration-200"
        onClick={() => openDeleteModal(row)}
        title="Eliminar"
      >
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );

  // Generate actions column for deleted items
  const deletedActions = (row) => (
    <div className="flex space-x-2">
      <button
        type="button"
        className="w-8 h-8 rounded-full border border-green-600 bg-green-600 hover:bg-green-700 hover:border-green-700 flex items-center justify-center transition-colors duration-200"
        onClick={() => handleRestore(row)}
        title="Restaurar"
      >
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );

  // Get final columns with actions
  const finalColumns = tableColumns ? [...tableColumns, { 
    key: 'acciones', 
    title: 'Acciones', 
    render: actions,
    minWidth: '100px',
    maxWidth: '120px',
    width: '100px',
    sticky: 'right',
    stickyOffset: '0px'
  }] : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
              <Button
        onClick={() => {
          if (onCreateClick) {
            // Si hay una función personalizada, llamarla
            const shouldUseDefaultAction = onCreateClick();
            if (shouldUseDefaultAction === false) return; // Si devuelve false, no abrir el modal
          }
          openCreateModal();
        }}
        leftIcon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        }
      >
        Nuevo {moduleName}
      </Button>
      </div>

      {/* Error Display - Solo para errores de carga de datos (fetch), NO para operaciones CRUD */}
      {error && error.message && error.message !== 'Ha ocurrido un error' && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error.message}
        </div>
      )}

      {/* Vista con pestañas si está habilitado el soft delete */}
      {showSoftDelete ? (
        <TabView
          tabs={[
            {
              key: 'active',
              label: 'Activos',
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              count: items.length
            },
            {
              key: 'deleted',
              label: 'Eliminados',
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              ),
              count: deletedItems.length
            }
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        >
          {{
            active: (
              <Card>
                <AdaptiveTable
                  columns={finalColumns}
                  data={items}
                  isLoading={loading}
                  emptyMessage={`No hay ${moduleName.toLowerCase()} registrados`}
                  searchable={searchable}
                  searchPlaceholder={`Buscar ${moduleName.toLowerCase()}...`}
                  pagination={pagination}
                  itemsPerPage={itemsPerPage}
                />
              </Card>
            ),
            deleted: (
              <Card>
                <AdaptiveTable
                  columns={[
                    ...tableColumns.map(col => {
                      if (col.key === 'activo' || col.key === 'activa' || col.key === 'estado') {
                        return {
                          ...col,
                          render: () => (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Inactivo
                            </span>
                          )
                        };
                      }
                      return col;
                    }),
                    { 
                      key: 'acciones', 
                      title: 'Acciones', 
                      render: deletedActions,
                      minWidth: '100px',
                      maxWidth: '120px',
                      width: '100px',
                      sticky: 'right',
                      stickyOffset: '0px'
                    }
                  ]}
                  data={deletedItems}
                  isLoading={deletedItemsLoading}
                  emptyMessage={`No hay ${moduleName.toLowerCase()} eliminados`}
                  searchable={searchable}
                  searchPlaceholder={`Buscar ${moduleName.toLowerCase()} eliminados...`}
                  pagination={pagination}
                  itemsPerPage={itemsPerPage}
                  rowClassName="opacity-50"
                />
              </Card>
            ),
          }}
        </TabView>
      ) : (
        <Card>
          <AdaptiveTable
            columns={finalColumns}
            data={items}
            isLoading={loading}
            emptyMessage={`No hay ${moduleName.toLowerCase()} registrados`}
            searchable={searchable}
            searchPlaceholder={`Buscar ${moduleName.toLowerCase()}...`}
            pagination={pagination}
            itemsPerPage={itemsPerPage}
          />
        </Card>
      )}

      {/* Create/Edit Modal */}
      {showModalForm && (
        <ModalGenerico
          isOpen={isModalOpen}
          onClose={closeModal}
          title={currentItem ? `Editar ${moduleName}` : `Nuevo ${moduleName}`}
          size="md"
          footer={
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitFromFooter}
                disabled={loading}
              >
                {loading ? 'Guardando...' : (currentItem ? 'Actualizar' : 'Guardar')}
              </Button>
            </div>
          }
        >
          <FormularioGenerico
            fields={filteredFormFields}
            initialData={memoizedInitialData}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            submitText={currentItem ? 'Actualizar' : 'Guardar'}
            showSubmitButton={false}
            showCancelButton={false}
            externalError={crudError?.message || formError}
            onChange={handleFormChange}
            layout={formLayout}
          />
        </ModalGenerico>
      )}

      {/* Delete Confirmation Modal */}
      <ModalGenerico
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        title="Confirmar Eliminación"
        size="sm"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={closeDeleteModal}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Eliminar
            </Button>
          </div>
        }
      >
        <p>
          ¿Está seguro que desea eliminar el {moduleName.toLowerCase()}{' '}
          <strong>{itemToDelete?.nombre}</strong>?
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

export default CatalogoPage;
