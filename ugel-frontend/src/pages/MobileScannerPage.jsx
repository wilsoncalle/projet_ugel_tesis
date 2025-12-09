import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { io } from 'socket.io-client';
import { CheckCircleIcon, SignalSlashIcon, WifiIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

const MobileScannerPage = () => {
  const { user } = useAuth();
  const scannerRef = useRef(null);
  const socketRef = useRef(null);
  const [scanStatus, setScanStatus] = useState('idle'); // idle | success
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [cameraError, setCameraError] = useState('');
  const [scannedData, setScannedData] = useState(''); // Para mostrar qué se escaneó

  // ... (Toda la lógica del useEffect de Socket y Scanner se mantiene igual) ...
  useEffect(() => {
    if (!user?.id) return;
    const token = localStorage.getItem('token');
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token, clientType: 'mobile-scanner' },
    });
    socketRef.current = socket;
    socket.on('connect', () => {
      setSocketStatus('connected');
      socket.emit('join-room', { userId: user.id, clientType: 'mobile-scanner' });
    });
    socket.on('disconnect', () => setSocketStatus('disconnected'));
    return () => {
      socket.disconnect();
      setSocketStatus('disconnected');
      socketRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;

    const startScanner = async () => {
      try {
        setCameraError('');
        const html5QrCode = new Html5Qrcode('reader');
        scannerRef.current = html5QrCode;

        const config = {
          fps: 25,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false,
          formatsToSupport: [
             Html5QrcodeSupportedFormats.CODE_128,
             Html5QrcodeSupportedFormats.CODE_39,
             Html5QrcodeSupportedFormats.EAN_13,
             Html5QrcodeSupportedFormats.UPC_A
          ],
        };

        let cameraId = null;
        try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
                const backCameras = devices.filter(d => 
                    d.label.toLowerCase().includes('back') || 
                    d.label.toLowerCase().includes('trasera') ||
                    d.label.toLowerCase().includes('environment')
                );
                if (backCameras.length > 0) {
                    cameraId = backCameras.length >= 2 ? backCameras[1].id : backCameras[0].id;
                }
            }
        } catch (e) {
            console.warn("Error listando cámaras, usando auto", e);
        }

        const cameraConfig = cameraId ? { deviceId: { exact: cameraId } } : { facingMode: "environment" };

        await html5QrCode.start(
          cameraConfig, 
          config,
          (decodedText) => { if (isMounted) handleScan(decodedText); },
          () => {}
        );
      } catch (err) {
        if (isMounted) setCameraError('Error de cámara. Verifica permisos.');
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current?.isScanning) {
         scannerRef.current.stop().catch(console.warn);
         scannerRef.current.clear();
      }
    };
  }, [user]);

  const handleScan = (text) => {
    if (scanStatus === 'success') return;

    const cleanText = String(text || '').replace(/[^0-9]/g, '');
    if (cleanText.length < 8) return;

    setScannedData(cleanText); // Guardamos el texto para mostrarlo abajo

    socketRef.current?.emit('scan-data', {
      userId: user.id,
      dni: cleanText,
    });

    setScanStatus('success');
    setTimeout(() => {
        setScanStatus('idle');
        setScannedData('');
    }, 1500);
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden font-sans">
      
      {/* --- SECCIÓN SUPERIOR: CÁMARA (60% Altura) --- */}
      <div className="h-[50%] relative bg-gray-900 overflow-hidden rounded-b-[2rem] z-10 shadow-2xl border-b border-white/10">
        
        {/* Header Flotante Minimalista */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
            <div>
                <p className="text-[10px] text-gray-400 font-mono uppercase">{user?.nombre_usuario || 'GUEST'}</p>
            </div>
            {/* Indicador de Estado Wifi Pequeño */}
            <div className={`p-2 rounded-full backdrop-blur-md border ${
                socketStatus === 'connected' ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'
            }`}>
                {socketStatus === 'connected' ? <WifiIcon className="w-4 h-4 text-green-400" /> : <SignalSlashIcon className="w-4 h-4 text-red-400" />}
            </div>
        </div>

        {/* Contenedor del Video */}
        <div className="absolute inset-0 flex items-center justify-center">
            {cameraError ? (
                <div className="text-center px-6">
                    <SignalSlashIcon className="w-12 h-12 text-red-500 mx-auto mb-2 opacity-50" />
                    <p className="text-red-400 text-sm">{cameraError}</p>
                </div>
            ) : (
                <div id="reader" className="w-full h-full object-cover [&>video]:object-cover [&>video]:w-full [&>video]:h-full"></div>
            )}
        </div>

        {/* Guía Visual de Escaneo (Cuadro) */}
        {!cameraError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-40 border-2 border-white/30 rounded-lg relative overflow-hidden">
                    {/* Esquinas brillantes */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-400 -mt-0.5 -ml-0.5"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-400 -mt-0.5 -mr-0.5"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-400 -mb-0.5 -ml-0.5"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-400 -mb-0.5 -mr-0.5"></div>
                    
                    {/* Línea de escaneo animada */}
                    <div className="absolute w-full h-[2px] bg-blue-500/80 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_2s_infinite]"></div>
                </div>
                <p className="absolute mt-52 text-[10px] tracking-[0.2em] text-blue-200/60 font-mono uppercase">
                    Alinear código de barras
                </p>
            </div>
        )}
      </div>

      {/* --- SECCIÓN INFERIOR: FEEDBACK (40% Altura) --- */}
      <div className="flex-1 bg-black relative flex flex-col items-center justify-center p-6 space-y-4">
        
        {/* Fondo decorativo sutil */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800/20 via-black to-black pointer-events-none" />

        <div className="z-10 w-full max-w-xs text-center transition-all duration-300">
            {scanStatus === 'success' ? (
                // --- ESTADO: ÉXITO ---
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mb-4 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                        <CheckCircleIcon className="w-14 h-14 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">¡Escaneado!</h2>
                    <p className="text-lg font-mono text-green-400 tracking-widest">{scannedData}</p>
                    <p className="text-xs text-gray-500 mt-2">Enviado a PC</p>
                </div>
            ) : (
                // --- ESTADO: ESPERANDO ---
                <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center opacity-60">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                        <QrCodeIcon className="w-10 h-10 text-white/40 animate-pulse" />
                    </div>
                    <p className="text-sm font-medium text-gray-300">Esperando código...</p>
                    <p className="text-xs text-gray-600 mt-2 max-w-[200px]">
                        {socketStatus === 'connected' 
                            ? 'Sistema sincronizado y listo.' 
                            : 'Conectando con el servidor...'}
                    </p>
                </div>
            )}
        </div>
      </div>

      {/* Estilos globales para la animación de escaneo */}
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default MobileScannerPage;