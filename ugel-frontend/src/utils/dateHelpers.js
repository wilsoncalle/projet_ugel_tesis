/**
 * Utilidades para formateo de fechas y horas
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

/**
 * Formatea una hora a formato HH:MM
 * Soporta múltiples formatos de entrada: 'HH:MM:SS', 'HH:MM', Date object, ISO string
 * @param {string|Date} horaInput - Hora a formatear
 * @returns {string} Hora en formato HH:MM o cadena vacía si no es válida
 */
export const formatHora = (horaInput) => {
  if (!horaInput) return '';

  // Si es un objeto Date, extraer hora y minutos
  if (horaInput instanceof Date) {
    const horas = String(horaInput.getHours()).padStart(2, '0');
    const minutos = String(horaInput.getMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
  }

  // Si es string, parsearlo
  if (typeof horaInput === 'string') {
    // Si contiene 'T' (ISO string), parsear como fecha
    if (horaInput.includes('T')) {
      try {
        const fecha = new Date(horaInput);
        if (!isNaN(fecha.getTime())) {
          const horas = String(fecha.getHours()).padStart(2, '0');
          const minutos = String(fecha.getMinutes()).padStart(2, '0');
          return `${horas}:${minutos}`;
        }
      } catch (e) {
        // Si falla el parseo, continuar con lógica de string
      }
    }

    // Si es formato HH:MM:SS o HH:MM, extraer los primeros 5 caracteres
    if (horaInput.includes(':')) {
      const partes = horaInput.split(':');
      if (partes.length >= 2) {
        const horas = partes[0].padStart(2, '0');
        const minutos = partes[1].padStart(2, '0');
        return `${horas}:${minutos}`;
      }
    }
  }

  return '';
};

/**
 * Obtiene la hora actual en formato HH:MM en zona horaria local
 * @returns {string} Hora actual en formato HH:MM
 */
export const getHoraActual = () => {
  const ahora = new Date();
  return formatHora(ahora);
};

/**
 * Formatea una fecha a formato legible
 * @param {string|Date} fechaInput - Fecha a formatear
 * @param {string} formato - Formato deseado ('dd/MM/yyyy' por defecto)
 * @returns {string} Fecha formateada
 */
export const formatFecha = (fechaInput, formato = 'dd/MM/yyyy') => {
  if (!fechaInput) return '';

  let fecha;
  if (fechaInput instanceof Date) {
    fecha = fechaInput;
  } else if (typeof fechaInput === 'string') {
    fecha = new Date(fechaInput);
    if (isNaN(fecha.getTime())) return '';
  } else {
    return '';
  }

  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const año = fecha.getFullYear();

  switch (formato) {
    case 'dd/MM/yyyy':
      return `${dia}/${mes}/${año}`;
    case 'yyyy-MM-dd':
      return `${año}-${mes}-${dia}`;
    default:
      return `${dia}/${mes}/${año}`;
  }
};

