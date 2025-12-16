import { useEffect, useState } from "react";

/**
 * Hook para detectar el estado de conectividad de manera precisa
 * 
 * @param {string} pingUrl - Endpoint para verificar conectividad real (default: /api/health)
 * @param {number} intervalMs - Intervalo de verificación en ms (default: 15000)
 * @returns {Object} Estado de conectividad
 * 
 * @example
 * const { online, verified, isOffline } = useConnectivity("/api/health");
 * if (isOffline) showBanner("Sin conexión: trabajando en modo offline");
 */
export function useConnectivity(pingUrl = "/api/health", intervalMs = 15000) {
  // Estado básico del navegador (navigator.onLine)
  const [online, setOnline] = useState(navigator.onLine);
  
  // Estado verificado (con ping real al servidor)
  const [verified, setVerified] = useState(navigator.onLine);

  // Escuchar eventos online/offline del navegador
  useEffect(() => {
    const handleOnline = () => {
      console.log('[useConnectivity] Navegador reporta: ONLINE');
      setOnline(true);
    };
    
    const handleOffline = () => {
      console.log('[useConnectivity] Navegador reporta: OFFLINE');
      setOnline(false);
      setVerified(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Verificación real con ping al servidor
  useEffect(() => {
    // Si el navegador reporta offline, no hacer ping
    if (!online) return;

    const checkServerConnection = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      try {
        const response = await fetch(pingUrl, { 
          cache: "no-store", 
          signal: controller.signal,
          method: 'HEAD' // Usar HEAD para no transferir datos innecesarios
        });
        
        const isServerReachable = response.ok;
        setVerified(isServerReachable);
        
        console.log(`[useConnectivity] Ping a ${pingUrl}: ${isServerReachable ? 'OK' : 'FAIL'}`);
      } catch (error) {
        console.warn('[useConnectivity] Servidor no disponible:', error.message);
        setVerified(false);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // Verificar inmediatamente
    checkServerConnection();
    
    // Luego verificar periódicamente
    const intervalId = setInterval(checkServerConnection, intervalMs);
    
    return () => clearInterval(intervalId);
  }, [online, pingUrl, intervalMs]);

  return { 
    online,     // true si navigator.onLine es true
    verified,   // true si el servidor respondió exitosamente
    isOffline: !online || !verified  // true si no hay conexión o el servidor no responde
  };
}
