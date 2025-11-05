/**
 * Utilidades para el Dashboard Administrativo
 * Funciones de cálculo, formateo y procesamiento de datos
 */

/**
 * Formatea un número con separadores de miles
 * @param {number} num - Número a formatear
 * @returns {string} Número formateado
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('es-PE');
};

/**
 * Formatea un porcentaje
 * @param {number} value - Valor del porcentaje
 * @param {number} decimals - Número de decimales (default: 1)
 * @returns {string} Porcentaje formateado
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return '0%';
  return `${value.toFixed(decimals)}%`;
};

/**
 * Calcula el porcentaje de cambio entre dos valores
 * @param {number} current - Valor actual
 * @param {number} previous - Valor anterior
 * @returns {number} Porcentaje de cambio
 */
export const calculatePercentageChange = (current, previous) => {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Determina el color y el ícono según el cambio porcentual
 * @param {number} change - Cambio porcentual
 * @returns {Object} Objeto con color, icono y dirección
 */
export const getTrendInfo = (change) => {
  if (change > 0) {
    return {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: '↑',
      direction: 'up',
      label: 'Incremento'
    };
  } else if (change < 0) {
    return {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: '↓',
      direction: 'down',
      label: 'Disminución'
    };
  } else {
    return {
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      icon: '→',
      direction: 'neutral',
      label: 'Sin cambios'
    };
  }
};

/**
 * Formatea una fecha en formato legible
 * @param {string|Date} date - Fecha a formatear
 * @param {string} format - Formato deseado ('short', 'long', 'full')
 * @returns {string} Fecha formateada
 */
export const formatDate = (date, format = 'short') => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const formats = {
    short: { day: '2-digit', month: 'short' },
    long: { day: '2-digit', month: 'long', year: 'numeric' },
    full: { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
  };
  
  return dateObj.toLocaleDateString('es-PE', formats[format] || formats.short);
};

/**
 * Calcula el promedio de un array de números
 * @param {Array<number>} values - Array de valores
 * @returns {number} Promedio
 */
export const calculateAverage = (values) => {
  if (!values || values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
};

/**
 * Encuentra el valor máximo y su índice
 * @param {Array<number>} values - Array de valores
 * @returns {Object} Objeto con valor máximo e índice
 */
export const findMax = (values) => {
  if (!values || values.length === 0) return { value: 0, index: -1 };
  const max = Math.max(...values);
  const index = values.indexOf(max);
  return { value: max, index };
};

/**
 * Encuentra el valor mínimo y su índice
 * @param {Array<number>} values - Array de valores
 * @returns {Object} Objeto con valor mínimo e índice
 */
export const findMin = (values) => {
  if (!values || values.length === 0) return { value: 0, index: -1 };
  const min = Math.min(...values);
  const index = values.indexOf(min);
  return { value: min, index };
};

/**
 * Agrupa datos por una clave específica
 * @param {Array} data - Array de datos
 * @param {string} key - Clave para agrupar
 * @returns {Object} Datos agrupados
 */
export const groupBy = (data, key) => {
  if (!data || !Array.isArray(data)) return {};
  
  return data.reduce((acc, item) => {
    const groupKey = item[key];
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(item);
    return acc;
  }, {});
};

/**
 * Ordena un array de objetos por una clave
 * @param {Array} data - Array de datos
 * @param {string} key - Clave para ordenar
 * @param {string} order - Orden ('asc' o 'desc')
 * @returns {Array} Array ordenado
 */
export const sortBy = (data, key, order = 'asc') => {
  if (!data || !Array.isArray(data)) return [];
  
  return [...data].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (order === 'asc') {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    } else {
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    }
  });
};

/**
 * Filtra datos por rango de fechas
 * @param {Array} data - Array de datos
 * @param {string} dateKey - Clave de la fecha
 * @param {Date} startDate - Fecha de inicio
 * @param {Date} endDate - Fecha de fin
 * @returns {Array} Datos filtrados
 */
export const filterByDateRange = (data, dateKey, startDate, endDate) => {
  if (!data || !Array.isArray(data)) return [];
  
  return data.filter(item => {
    const itemDate = new Date(item[dateKey]);
    return itemDate >= startDate && itemDate <= endDate;
  });
};

/**
 * Calcula el total de una clave específica en un array
 * @param {Array} data - Array de datos
 * @param {string} key - Clave a sumar
 * @returns {number} Total
 */
export const sumBy = (data, key) => {
  if (!data || !Array.isArray(data)) return 0;
  
  return data.reduce((sum, item) => {
    const value = parseFloat(item[key]) || 0;
    return sum + value;
  }, 0);
};

/**
 * Transforma datos para gráficos de pie/doughnut
 * @param {Array} data - Array de datos
 * @param {string} labelKey - Clave para las etiquetas
 * @param {string} valueKey - Clave para los valores
 * @returns {Object} Datos formateados para gráfico
 */
export const transformToPieData = (data, labelKey, valueKey) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { labels: [], datasets: [{ data: [] }] };
  }
  
  return {
    labels: data.map(item => item[labelKey]),
    datasets: [{
      data: data.map(item => parseInt(item[valueKey]) || 0)
    }]
  };
};

/**
 * Transforma datos para gráficos de líneas
 * @param {Array} data - Array de datos
 * @param {string} labelKey - Clave para las etiquetas (eje X)
 * @param {string} valueKey - Clave para los valores (eje Y)
 * @returns {Object} Datos formateados para gráfico
 */
export const transformToLineData = (data, labelKey, valueKey) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { labels: [], datasets: [{ data: [] }] };
  }
  
  return {
    labels: data.map(item => {
      const fecha = new Date(item[labelKey]);
      return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
    }),
    datasets: [{
      data: data.map(item => parseInt(item[valueKey]) || 0)
    }]
  };
};

/**
 * Genera un rango de fechas
 * @param {Date} startDate - Fecha de inicio
 * @param {Date} endDate - Fecha de fin
 * @returns {Array<Date>} Array de fechas
 */
export const generateDateRange = (startDate, endDate) => {
  const dates = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

/**
 * Obtiene el rango de fechas según el período
 * @param {string} periodo - Período ('hoy', 'semana', 'mes', 'anio', 'todo')
 * @returns {Object} Objeto con fechas de inicio y fin
 */
export const getDateRangeFromPeriod = (periodo) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (periodo) {
    case 'hoy':
      return {
        startDate: today,
        endDate: today,
        label: 'Hoy'
      };
      
    case 'semana':
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return {
        startDate: startOfWeek,
        endDate: today,
        label: 'Esta Semana'
      };
      
    case 'mes':
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        startDate: startOfMonth,
        endDate: today,
        label: 'Este Mes'
      };
      
    case 'anio':
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      return {
        startDate: startOfYear,
        endDate: today,
        label: 'Este Año'
      };
      
    case 'todo':
    default:
      return {
        startDate: new Date(2020, 0, 1), // Fecha arbitraria antigua
        endDate: today,
        label: 'Todo el Historial'
      };
  }
};

/**
 * Exporta datos a CSV
 * @param {Array} data - Datos a exportar
 * @param {string} filename - Nombre del archivo
 */
export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) {
    console.warn('No hay datos para exportar');
    return;
  }
  
  // Obtener headers
  const headers = Object.keys(data[0]);
  
  // Crear filas CSV
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escapar comillas y envolver en comillas si contiene coma
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      }).join(',')
    )
  ];
  
  // Crear blob y descargar
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Debounce function para optimizar búsquedas
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} Función con debounce
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Genera colores para gráficos
 * @param {number} count - Cantidad de colores
 * @returns {Array<string>} Array de colores
 */
export const generateColors = (count) => {
  const baseColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
    '#06B6D4', '#F97316', '#6366F1', '#14B8A6', '#EF4444',
  ];
  
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  
  return colors;
};
