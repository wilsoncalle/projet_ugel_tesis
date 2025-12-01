import dayjs from 'dayjs';

/**
 * Utilidades para formateo de fechas y horas
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

/**
 * Formatea una fecha a formato legible
 * @param {string|Date} fechaInput - Fecha a formatear
 * @param {string} formato - Formato deseado ('DD/MM/YYYY' por defecto)
 * @returns {string} Fecha formateada
 */
export const formatFecha = (fechaInput, formato = 'DD/MM/YYYY') => {
  if (!fechaInput) return '';
  return dayjs(fechaInput).format(formato);
};

/**
 * Formatea una hora a formato HH:MM
 * @param {string|Date} horaInput - Hora a formatear
 * @returns {string} Hora en formato HH:MM
 */
export const formatHora = (horaInput) => {
  if (!horaInput) return '';

  // Si ya es un string de hora (HH:mm...)
  if (typeof horaInput === 'string' && horaInput.includes(':') && !horaInput.includes('T')) {
    return horaInput.substring(0, 5);
  }

  const fecha = dayjs(horaInput);
  return fecha.isValid() ? fecha.format('HH:mm') : '';
};

/**
 * Obtiene la hora actual en formato HH:MM
 * @returns {string} Hora actual en formato HH:MM
 */
export const getHoraActual = () => {
  return dayjs().format('HH:mm');
};
