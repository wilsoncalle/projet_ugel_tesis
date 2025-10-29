/**
 * Utilidades para manejo de fechas en zona horaria de Lima
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

/**
 * Normaliza un input de fecha (ISO string, Date object, o YYYY-MM-DD) 
 * a formato YYYY-MM-DD en zona horaria de Lima (America/Lima, UTC-5)
 * 
 * @param {string|Date|null|undefined} input - Fecha a normalizar
 * @returns {string|null} - Fecha en formato YYYY-MM-DD o null si no hay input
 */
function toLimaDateYYYYMMDD(input) {
  if (!input) return null;
  
  // Si ya viene como YYYY-MM-DD (sin hora), devolverlo directo comprobando el regex
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  
  // Si viene como ISO string o Date object, convertirlo
  let date;
  if (input instanceof Date) {
    date = new Date(input);
  } else if (typeof input === 'string') {
    // Parsear el string
    date = new Date(input);
  } else {
    return null;
  }
  
  // Verificar que sea una fecha válida
  if (isNaN(date.getTime())) {
    return null;
  }
  
  // Convertir a zona horaria de Lima (UTC-5)
  // Lima está 5 horas detrás de UTC
  // Para obtener la fecha en Lima, restamos 5 horas a la fecha UTC
  const limaOffset = -5 * 60; // -5 horas en minutos
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  const limaTime = new Date(utcTime + (limaOffset * 60000));
  
  // Formatear a YYYY-MM-DD
  const year = limaTime.getUTCFullYear();
  const month = String(limaTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(limaTime.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

module.exports = { toLimaDateYYYYMMDD };

