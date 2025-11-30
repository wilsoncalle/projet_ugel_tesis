// Helper para actualizar el favicon con un badge
const updateFaviconWithBadge = (count) => {
  const favicon = document.querySelector('link[rel="icon"]');
  if (!favicon) return;

  // Si el contador es 0, restaurar el original
  if (count <= 0) {
    favicon.href = '/favicon.ico';
    return;
  }

  const img = new Image();
  img.src = '/favicon.ico';
  img.crossOrigin = 'anonymous'; // Evitar problemas de CORS si fuera necesario

  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    // Dibujar icono original
    ctx.drawImage(img, 0, 0, 32, 32);

    // Configuración del badge (Más grande)
    const badgeSize = 20; // Aumentado de 14 a 20
    const x = 32 - badgeSize;
    const y = 0;

    // Dibujar círculo rojo
    ctx.beginPath();
    ctx.arc(x + badgeSize/2, y + badgeSize/2, badgeSize/2, 0, 2 * Math.PI);
    ctx.fillStyle = '#ef4444'; // red-500
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2; // Borde un poco más grueso
    ctx.stroke();

    // Dibujar número
    ctx.font = 'bold 14px "Roboto", sans-serif'; // Fuente más grande y legible
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = count > 9 ? '9+' : count.toString();
    ctx.fillText(text, x + badgeSize/2, y + badgeSize/2 + 1);

    // Actualizar href del favicon
    favicon.href = canvas.toDataURL('image/png');
  };
};

// Gestión del Badge (Contador de notificaciones)
export const setAppBadge = async (count) => {
  // 1. Actualizar Badge del Sistema (PWA/Barra de tareas)
  if ('setAppBadge' in navigator) {
    try {
      await navigator.setAppBadge(count);
    } catch (e) {
      console.error('Error setting app badge:', e);
    }
  }
  
  // 2. Actualizar Favicon (Pestaña del navegador)
  updateFaviconWithBadge(count);
};

export const clearAppBadge = async () => {
  // 1. Limpiar Badge del Sistema
  if ('clearAppBadge' in navigator) {
    try {
      await navigator.clearAppBadge();
    } catch (e) {
      console.error('Error clearing app badge:', e);
    }
  }
  
  // 2. Limpiar Favicon
  updateFaviconWithBadge(0);
  
  // 3. Limpiar LocalStorage
  localStorage.setItem('notification_count', '0');
};

export const incrementAppBadge = () => {
  const current = parseInt(localStorage.getItem('notification_count') || '0', 10);
  const newCount = current + 1;
  localStorage.setItem('notification_count', String(newCount));
  setAppBadge(newCount);
  return newCount;
};

export const enviarNotificacionSistema = (titulo, cuerpo, icono = '/img/icono_ugel.png') => {
  // 1. Verificar soporte
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

  // Verificar preferencia del usuario (localStorage)
  const userPref = localStorage.getItem('notifications_enabled');
  const isEnabled = userPref === 'true' || (userPref === null && Notification.permission === 'granted');
  if (!isEnabled) return;

  // Incrementar el badge (contador rojo en el icono de la app)
  incrementAppBadge();

  // 2. Verificar permiso
  if (Notification.permission === 'granted') {
    // 3. Verificar que el SW esté activo y listo
    navigator.serviceWorker.ready.then((registration) => {
      // Enviamos el mensaje al SW en lugar de llamar directo
      if (registration.active) {
        registration.active.postMessage({
          type: 'SHOW_NOTIFICATION',
          title: titulo,
          options: {
            body: cuerpo,
            icon: icono,
            badge: '/img/favicon-196.png',
            tag: 'sistema-ugel',
            vibrate: [200, 100, 200],
            data: { url: window.location.href }
          }
        });
      }
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
};

export const pedirPermisoNotificaciones = async () => {
  if (!("Notification" in window)) {
    alert("Tu navegador no soporta notificaciones de sistema.");
    return;
  }

  // Si ya está denegado, avisar al usuario cómo desbloquearlo
  if (Notification.permission === 'denied') {
    alert("Las notificaciones están bloqueadas. Por favor, haz clic en el icono de candado o configuración junto a la URL (arriba a la izquierda) y selecciona 'Permitir' o 'Restablecer permisos' para las notificaciones.");
    return 'denied';
  }

  try {
    const permiso = await Notification.requestPermission();
  
    if (permiso === "granted") {
      enviarNotificacionSistema("¡Permiso concedido!", "Ahora recibirás avisos aquí.");
    } else if (permiso === 'denied') {
      // Si el usuario lo deniega en ese momento
      alert("No podremos avisarte de nuevas visitas si no activas las notificaciones.");
    } else {
       // Caso 'default' (ignorado o bloqueado automáticamente por el navegador)
       alert("El navegador ha bloqueado la solicitud. Por favor revisa el icono de configuración junto a la barra de direcciones.");
    }
    
    return permiso;
  } catch (error) {
    console.error("Error solicitando permisos:", error);
    return 'denied';
  }
};
