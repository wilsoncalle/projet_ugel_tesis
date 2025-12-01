// utils/notificationUtils.js

// ========================
// Constantes de configuración
// ========================
const NOTIFICATION_COUNT_KEY = 'notification_count';
const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled';

const DEFAULT_ICON = '/img/icono_ugel.png';
const BADGE_ICON = '/img/favicon-196.png';
const DEFAULT_TAG = 'sistema-ugel';

// ========================
// Helpers internos
// ========================
const isBrowser = typeof window !== 'undefined';
const isNotificationSupported = () =>
  isBrowser && 'Notification' in window;
const isServiceWorkerSupported = () =>
  typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

const getNotificationPermission = () => {
  if (!isNotificationSupported()) return 'default';
  return Notification.permission;
};

const getStoredBadgeCount = () => {
  if (!isBrowser) return 0;
  return parseInt(localStorage.getItem(NOTIFICATION_COUNT_KEY) || '0', 10);
};

const setStoredBadgeCount = (count) => {
  if (!isBrowser) return;
  localStorage.setItem(NOTIFICATION_COUNT_KEY, String(count));
};

const getUserNotificationsEnabled = () => {
  if (!isBrowser || !isNotificationSupported()) return false;

  const pref = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  const permission = Notification.permission;

  // Si no hay preferencia guardada pero el permiso está concedido,
  // asumimos true (comportamiento legacy).
  if (pref === null && permission === 'granted') return true;

  return pref === 'true';
};

const setUserNotificationsEnabled = (enabled) => {
  if (!isBrowser) return;
  localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(enabled));
};

// ========================
// Favicon + Badge
// ========================

// Helper para actualizar el favicon con un badge
const updateFaviconWithBadge = (count) => {
  if (!isBrowser) return;

  const favicon = document.querySelector('link[rel="icon"]');
  if (!favicon) return;

  // Si el contador es 0, restaurar el original
  if (count <= 0) {
    favicon.href = '/favicon.ico';
    return;
  }

  const img = new Image();
  img.src = '/favicon.ico';
  img.crossOrigin = 'anonymous';

  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dibujar icono original
    ctx.drawImage(img, 0, 0, 32, 32);

    // Configuración del badge
    const badgeSize = 20;
    const x = 32 - badgeSize;
    const y = 0;

    // Círculo rojo
    ctx.beginPath();
    ctx.arc(x + badgeSize / 2, y + badgeSize / 2, badgeSize / 2, 0, 2 * Math.PI);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Texto
    ctx.font = 'bold 14px "Roboto", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = count > 9 ? '9+' : count.toString();
    ctx.fillText(text, x + badgeSize / 2, y + badgeSize / 2 + 1);

    favicon.href = canvas.toDataURL('image/png');
  };
};

/**
 * Establece el número del badge de notificaciones (App Badge + Favicon)
 */
export const setNotificationBadge = async (count) => {
  if (!isBrowser) return;

  // 1. Badge de PWA / barra de tareas
  if ('setAppBadge' in navigator) {
    try {
      await navigator.setAppBadge(count);
    } catch (e) {
      console.error('Error setting app badge:', e);
    }
  }

  // 2. Favicon
  updateFaviconWithBadge(count);

  // 3. Persistir
  setStoredBadgeCount(count);
};

/**
 * Limpia el badge de notificaciones
 */
export const clearNotificationBadge = async () => {
  if (!isBrowser) return;

  // 1. Badge del sistema
  if ('clearAppBadge' in navigator) {
    try {
      await navigator.clearAppBadge();
    } catch (e) {
      console.error('Error clearing app badge:', e);
    }
  }

  // 2. Favicon
  updateFaviconWithBadge(0);

  // 3. LocalStorage
  setStoredBadgeCount(0);
};

/**
 * Incrementa el badge de notificaciones en 1 y devuelve el nuevo valor
 */
export const incrementNotificationBadge = () => {
  const current = getStoredBadgeCount();
  const newCount = current + 1;
  setNotificationBadge(newCount);
  return newCount;
};

// ========================
// Notificaciones del sistema
// ========================

/**
 * Envía una notificación del sistema (via Service Worker)
 */
export const sendSystemNotification = ({
  title,
  body,
  url,
  icon = DEFAULT_ICON,
}) => {
  if (!isNotificationSupported() || !isServiceWorkerSupported()) return;

  // Respetar preferencia del usuario
  if (!getUserNotificationsEnabled()) return;

  // Incrementar badge
  incrementNotificationBadge();

  if (Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.active) {
        registration.active.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          options: {
            body,
            icon,
            badge: BADGE_ICON,
            tag: DEFAULT_TAG,
            vibrate: [200, 100, 200],
            data: { url: url || window.location.href },
          },
        });
      }
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
};

/**
 * Solicita permiso para mostrar notificaciones
 */
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    alert('Tu navegador no soporta notificaciones de sistema.');
    return 'default';
  }

  // Si ya está denegado, mensaje explicando cómo desbloquear
  if (Notification.permission === 'denied') {
    alert(
      "Las notificaciones están bloqueadas. Por favor, haz clic en el icono de candado o configuración junto a la URL y selecciona 'Permitir' o 'Restablecer permisos' para las notificaciones."
    );
    return 'denied';
  }

  try {
    const permiso = await Notification.requestPermission();

    if (permiso === 'granted') {
      setUserNotificationsEnabled(true);
      sendSystemNotification({
        title: '¡Permiso concedido!',
        body: 'Ahora recibirás avisos aquí.',
      });
    } else if (permiso === 'denied') {
      setUserNotificationsEnabled(false);
      alert('No podremos avisarte de nuevas visitas si no activas las notificaciones.');
    } else {
      alert(
        'El navegador ha bloqueado la solicitud. Por favor revisa el icono de configuración junto a la barra de direcciones.'
      );
    }

    return permiso;
  } catch (error) {
    console.error('Error solicitando permisos:', error);
    setUserNotificationsEnabled(false);
    return 'denied';
  }
};

/**
 * Devuelve si el usuario tiene activadas las notificaciones (preferencia local)
 */
export const areNotificationsEnabled = () => getUserNotificationsEnabled();

/**
 * Permite activar/desactivar manualmente la preferencia local
 * (útil si quieres un toggle global fuera del ProfilePage)
 */
export const setNotificationsEnabled = (enabled) => {
  setUserNotificationsEnabled(enabled);
};

// ========================
// Aliases para compatibilidad hacia atrás
// ========================

export const enviarNotificacionSistema = (titulo, cuerpo, icono) =>
  sendSystemNotification({ title: titulo, body: cuerpo, icon: icono });

export const pedirPermisoNotificaciones = requestNotificationPermission;
export const setAppBadge = setNotificationBadge;
export const clearAppBadge = clearNotificationBadge;
export const incrementAppBadge = incrementNotificationBadge;
