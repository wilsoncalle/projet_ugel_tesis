import { useState, useCallback, useRef } from 'react';

const useApiState = (initialData = null) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Usar una referencia para prevenir solicitudes simultáneas
  const pendingRequest = useRef(false);

  const execute = useCallback(async (apiCall, options = {}) => {
    const {
      onSuccess,
      onError,
      resetError = true,
      transformData = null,
      errorMessage = 'Ha ocurrido un error',
      skipIfPending = true, // Nueva opción para evitar peticiones duplicadas
    } = options;

    // Evitar peticiones simultáneas del mismo tipo
    if (skipIfPending && pendingRequest.current) {
      console.log('useApiState: Ignorando solicitud duplicada mientras hay una en progreso');
      return { skipped: true };
    }

    try {
      pendingRequest.current = true;
      setLoading(true);
      if (resetError) setError(null);
      
      const response = await apiCall();
      
      // Transform data if transform function is provided
      const finalData = transformData ? transformData(response.data) : response.data;
      
      setData(finalData);
      setLoading(false);
      pendingRequest.current = false;
      
      if (onSuccess) {
        onSuccess(finalData, response);
      }
      
      return { success: true, data: finalData, response };
    } catch (err) {
      console.log('useApiState - Error completo:', err);
      console.log('useApiState - err.response:', err.response);
      console.log('useApiState - err.response.data:', err.response?.data);
      console.log('useApiState - err.response.data.message:', err.response?.data?.message);
      
      const errorData = {
        message: err.response?.data?.error || err.response?.data?.message || err.message || errorMessage,
        status: err.response?.status,
        originalError: err,
        response: err.response,
        data: err.response?.data,
      };
      
      console.log('useApiState - errorData creado:', errorData);
      
      setError(errorData);
      setLoading(false);
      pendingRequest.current = false;
      
      if (onError) {
        onError(errorData);
      }
      
      // Propagar el error para que el componente padre lo maneje
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setData(initialData);
    setLoading(false);
    setError(null);
    pendingRequest.current = false;
  }, [initialData]);

  const setDataManually = useCallback((newData) => {
    setData(newData);
  }, []);

  const setErrorManually = useCallback((errorMessage) => {
    setError({ message: errorMessage });
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    setData: setDataManually,
    setError: setErrorManually,
  };
};

export default useApiState;
