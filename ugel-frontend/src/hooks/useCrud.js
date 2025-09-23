import { useState, useCallback } from 'react';
import useApiState from './useApiState';

const useCrud = (service, options = {}) => {
  const {
    initialData = [],
    transformData = null,
    transformDataToBackend = null, // Nueva opción para transformar datos al backend
    onSuccess = null,
    onError = null,
  } = options;

  const [items, setItems] = useState(initialData);
  const [currentItem, setCurrentItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const {
    data: apiData,
    loading,
    error,
    execute,
    reset: resetApiState,
  } = useApiState(initialData);

  // Estado local para errores de operaciones CRUD
  const [crudError, setCrudError] = useState(null);

  // Fetch all items
  const fetchItems = useCallback(async () => {
    // Limitar la cantidad de logs para evitar sobrecargar la consola
    const shouldLog = Math.random() < 0.1; // Solo mostramos logs cada ~10 llamadas
    
    const result = await execute(
      () => service.getAll(),
      {
        transformData: (response) => {
          if (shouldLog) {
            console.log('useCrud - Response completa:', response);
          }
          
          // Extraer el array de datos de la respuesta, manejando diferentes estructuras
          let dataArray = [];
          
          // Si la respuesta tiene una estructura anidada con data.data como array
          if (response?.data?.data && Array.isArray(response.data.data)) {
            dataArray = response.data.data;
            if (shouldLog) console.log('useCrud - Array extraído de response.data.data');
          } 
          // Si la respuesta tiene data como array directo
          else if (response?.data && Array.isArray(response.data)) {
            dataArray = response.data;
            if (shouldLog) console.log('useCrud - Array extraído de response.data');
          } 
          // Si no es ninguno de los casos anteriores pero hay datos en la respuesta
          else if (response?.data) {
            console.warn('useCrud - Formato de respuesta no reconocido:', response);
            // Intentar buscar un array en la respuesta
            for (const key in response.data) {
              if (Array.isArray(response.data[key])) {
                dataArray = response.data[key];
                console.log(`useCrud - Array encontrado en response.data.${key}`);
                break;
              }
            }
            
            if (dataArray.length === 0) {
              console.error('useCrud - No se encontró un array válido en la respuesta:', response);
            }
          } else {
            console.error('useCrud - Respuesta no contiene datos:', response);
          }
          
          if (shouldLog) {
            console.log('useCrud - Array de datos extraído:', dataArray);
          }
          
          const transformed = transformData ? transformData(dataArray) : dataArray;
          
          if (shouldLog) {
            console.log('useCrud - Datos transformados:', transformed);
          }
          
          setItems(Array.isArray(transformed) ? transformed : []);
          return transformed;
        },
        onSuccess: (data) => {
          if (onSuccess) onSuccess('fetch', data);
        },
        onError: (error) => {
          if (onError) onError('fetch', error);
        },
      }
    );
    return result;
  }, [execute, service, transformData]);

  // Create new item
  const createItem = useCallback(async (itemData) => {
    try {
      setCrudError(null); // Limpiar error anterior
      
      // Transformar datos para el backend si se proporciona la función
      const dataToSend = transformDataToBackend ? transformDataToBackend(itemData) : itemData;
      console.log('useCrud - Datos a enviar al backend:', dataToSend);
      
      // Llamar directamente al servicio sin usar execute para no afectar el estado de error principal
      const response = await service.create(dataToSend);
      
      // Si es exitoso, actualizar la lista y cerrar el modal
      await fetchItems(); // Refresh the list
      setIsModalOpen(false);
      setCurrentItem(null);
      setCrudError(null);
      if (onSuccess) onSuccess('create', response.data);
      
      return response;
    } catch (error) {
      // Procesar el error para extraer el mensaje correcto
      let processedError = error;
      
      // Si es un error de Axios, extraer el mensaje del backend
      if (error?.response?.data?.error) {
        processedError = {
          ...error,
          message: error.response.data.error
        };
      } else if (error?.response?.data?.message) {
        processedError = {
          ...error,
          message: error.response.data.message
        };
      }
      
      // Establecer solo el error de CRUD, no el error principal
      setCrudError(processedError);
      if (onError) onError('create', processedError);
      throw processedError;
    }
  }, [service, fetchItems, transformDataToBackend, onSuccess, onError]);

  // Update existing item
  const updateItem = useCallback(async (id, itemData) => {
    try {
      setCrudError(null); // Limpiar error anterior
      
      // Transformar datos para el backend si se proporciona la función
      const dataToSend = transformDataToBackend ? transformDataToBackend(itemData) : itemData;
      console.log('useCrud - Datos a enviar al backend para actualizar:', dataToSend);
      
      // Llamar directamente al servicio sin usar execute para no afectar el estado de error principal
      const response = await service.update(id, dataToSend);
      
      // Si es exitoso, actualizar la lista y cerrar el modal
      await fetchItems(); // Refresh the list
      setIsModalOpen(false);
      setCurrentItem(null);
      setCrudError(null);
      if (onSuccess) onSuccess('update', response.data);
      
      return response;
    } catch (error) {
      // Procesar el error para extraer el mensaje correcto
      let processedError = error;
      
      // Si es un error de Axios, extraer el mensaje del backend
      if (error?.response?.data?.error) {
        processedError = {
          ...error,
          message: error.response.data.error
        };
      } else if (error?.response?.data?.message) {
        processedError = {
          ...error,
          message: error.response.data.message
        };
      }
      
      // Establecer solo el error de CRUD, no el error principal
      setCrudError(processedError);
      if (onError) onError('update', processedError);
      throw processedError;
    }
  }, [service, fetchItems, transformDataToBackend, onSuccess, onError]);

  // Delete item
  const deleteItem = useCallback(async (id) => {
    try {
      // Llamar directamente al servicio sin usar execute para no afectar el estado de error principal
      const response = await service.delete(id);
      
      // Si es exitoso, actualizar la lista y cerrar el modal
      await fetchItems(); // Refresh the list
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      if (onSuccess) onSuccess('delete', response.data);
      
      return response;
    } catch (error) {
      // Procesar el error para extraer el mensaje correcto
      let processedError = error;
      
      // Si es un error de Axios, extraer el mensaje del backend
      if (error?.response?.data?.error) {
        processedError = {
          ...error,
          message: error.response.data.error
        };
      } else if (error?.response?.data?.message) {
        processedError = {
          ...error,
          message: error.response.data.message
        };
      }
      
      if (onError) onError('delete', processedError);
      throw processedError;
    }
  }, [service, fetchItems, onSuccess, onError]);

  // Modal handlers
  const openCreateModal = useCallback(() => {
    setCurrentItem(null);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback(async (item) => {
    console.log('useCrud - openEditModal - Item recibido:', item);
    try {
      // Hacer una consulta individual para obtener los datos completos
      const response = await service.getById(item.id);
      console.log('useCrud - openEditModal - Respuesta completa:', response);
      
      // Extraer los datos reales de la respuesta
      let fullItem;
      if (response?.data?.data) {
        // Si la respuesta tiene estructura {success, message, data: {datos}}
        fullItem = response.data.data;
      } else if (response?.data) {
        // Si la respuesta tiene estructura {datos}
        fullItem = response.data;
      } else {
        // Si la respuesta es directamente los datos
        fullItem = response;
      }
      
      console.log('useCrud - openEditModal - Datos extraídos:', fullItem);
      
      // Aplicar transformación si está disponible
      const transformedItem = transformData ? transformData(fullItem) : fullItem;
      console.log('useCrud - openEditModal - Datos transformados:', transformedItem);
      
      setCurrentItem(transformedItem);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error obteniendo datos del elemento:', error);
      // Si falla la consulta individual, usar el item de la tabla como fallback
      setCurrentItem(item);
      setIsModalOpen(true);
    }
  }, [service, transformData]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setCurrentItem(null);
    setCrudError(null); // Limpiar error de CRUD
    // Notify parent component to clear form errors
    if (onSuccess) onSuccess('closeModal', null);
  }, [onSuccess]);

  const openDeleteModal = useCallback((item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  }, []);

  // Reset all state
  const reset = useCallback(() => {
    setItems(initialData);
    setCurrentItem(null);
    setIsModalOpen(false);
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
    resetApiState();
  }, [initialData, resetApiState]);

  return {
    // Data and state
    items,
    currentItem,
    loading,
    error,
    crudError, // Error específico de operaciones CRUD
    
    // Modal states
    isModalOpen,
    isDeleteModalOpen,
    itemToDelete,
    
    // CRUD operations
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    
    // Modal handlers
    openCreateModal,
    openEditModal,
    closeModal,
    openDeleteModal,
    closeDeleteModal,
    
    // Utility
    reset,
    setItems,
  };
};

export default useCrud;
