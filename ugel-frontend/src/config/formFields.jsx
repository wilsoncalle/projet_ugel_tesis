// Configuración de campos para el módulo de Áreas
export const areasFormFields = [
  {
    name: 'nombre',
    label: 'Nombre del Área',
    type: 'text',
    placeholder: 'Ingrese el nombre del área',
    required: true,
  },
];

// Configuración de campos para el módulo de Tipos de Documento
export const tiposDocumentoFormFields = [
  {
    name: 'codigo',
    label: 'Código',
    type: 'text',
    placeholder: 'Ingrese el código del tipo de documento',
    required: true,
  },
  {
    name: 'nombre_completo',
    label: 'Nombre Completo',
    type: 'text',
    placeholder: 'Ingrese el nombre completo del tipo de documento',
    required: true,
  },
];

// Configuración de campos para el módulo de Motivos de Visita
export const motivosVisitaFormFields = [
  {
    name: 'nombre_motivo',
    label: 'Nombre del Motivo',
    type: 'text',
    placeholder: 'Ingrese el nombre del motivo de visita',
    required: true,
  },
];

// Configuración de campos para el módulo de Tipos de Contrato
export const tiposContratoFormFields = [
  {
    name: 'nombre_tipo',
    label: 'Nombre del Tipo',
    type: 'text',
    placeholder: 'Ingrese el nombre del tipo de contrato',
    required: true,
  },
];

// Configuración de campos para el módulo de Motivos de Salida
export const motivosSalidaFormFields = [
  {
    name: 'nombre_motivo',
    label: 'Nombre del Motivo',
    type: 'text',
    placeholder: 'Ingrese el nombre del motivo de salida',
    required: true,
  },
];

// Configuración de campos para el módulo de Personal
export const personalFormFields = [
  {
    name: 'tipoDocumento',
    label: 'Tipo de Documento',
    type: 'select',
    required: true,
    placeholder: 'Seleccione tipo de documento',
    options: [] // Se llena dinámicamente desde la base de datos
  },
  {
    name: 'numeroDocumento',
    label: 'Número de Documento',
    type: 'text',
    required: true,
    placeholder: 'Ingrese número de documento'
  },
  {
    name: 'nombres',
    label: 'Nombres',
    type: 'text',
    required: true,
    placeholder: 'Ingrese nombres'
  },
  {
    name: 'apellidos',
    label: 'Apellidos',
    type: 'text',
    required: true,
    placeholder: 'Ingrese apellidos'
  },
  {
    name: 'areaDestinoId',
    label: 'Área',
    type: 'select',
    required: true,
    placeholder: 'Seleccione un área',
    options: [] // Se llena dinámicamente
  },
  {
    name: 'tipoContratoId',
    label: 'Tipo de Contrato',
    type: 'select',
    required: true,
    placeholder: 'Seleccione tipo de contrato',
    options: [] // Se llena dinámicamente
  },
  {
    name: 'activo',
    label: 'Estado',
    type: 'select',
    options: [
      { value: true, label: 'Activo' },
      { value: false, label: 'Inactivo' }
    ],
    showOnCreate: false, // Solo mostrar al editar
    showOnEdit: true
  }
];

// Funciones de transformación para mapear campos del frontend al backend
export const transformAreas = (data) => {
  console.log('transformAreas - Datos de entrada:', data);
  if (Array.isArray(data)) {
    const transformed = data.map(item => ({
      id: item.id,
      nombre: item.nombre_area, // Mapear para el formulario
      nombre_area: item.nombre_area, // Mantener para la tabla
      activa: item.activa
    }));
    console.log('transformAreas - Datos transformados:', transformed);
    return transformed;
  }
  console.log('transformAreas - No es un array, retornando datos originales:', data);
  return data;
};

// Función para transformar datos del frontend al backend
export const transformAreasToBackend = (data) => {
  console.log('transformAreasToBackend - Datos de entrada:', data);
  const transformed = {
    nombre: data.nombre, // El backend espera 'nombre', no 'nombre_area'
    activa: data.activa
  };
  console.log('transformAreasToBackend - Datos transformados:', transformed);
  return transformed;
};

export const transformTiposDocumento = (data) => {
  console.log('transformTiposDocumento - Datos de entrada:', data);
  if (Array.isArray(data)) {
    const transformed = data.map(item => ({
      id: item.id,
      codigo: item.codigo,
      nombre_completo: item.nombre_completo,
      activo: item.activo
    }));
    console.log('transformTiposDocumento - Datos transformados:', transformed);
    return transformed;
  }
  console.log('transformTiposDocumento - No es un array, retornando datos originales:', data);
  return data;
};

// Función para transformar datos del frontend al backend
export const transformTiposDocumentoToBackend = (data) => {
  console.log('transformTiposDocumentoToBackend - Datos de entrada:', data);
  const transformed = {
    codigo: data.codigo,
    nombreCompleto: data.nombre_completo, // Convertir snake_case a camelCase
    activo: data.activo
  };
  console.log('transformTiposDocumentoToBackend - Datos transformados:', transformed);
  return transformed;
};

export const transformMotivosVisita = (data) => {
  console.log('transformMotivosVisita - Datos de entrada:', data);
  if (Array.isArray(data)) {
    const transformed = data.map(item => ({
      id: item.id,
      nombre_motivo: item.nombre_motivo,
      activo: item.activo
    }));
    console.log('transformMotivosVisita - Datos transformados:', transformed);
    return transformed;
  }
  console.log('transformMotivosVisita - No es un array, retornando datos originales:', data);
  return data;
};

// Función para transformar datos del frontend al backend
export const transformMotivosVisitaToBackend = (data) => {
  console.log('transformMotivosVisitaToBackend - Datos de entrada:', data);
  const transformed = {
    nombre: data.nombre_motivo, // Convertir nombre_motivo a nombre para el backend
    activo: data.activo
  };
  console.log('transformMotivosVisitaToBackend - Datos transformados:', transformed);
  return transformed;
};

export const transformTiposContrato = (data) => {
  console.log('transformTiposContrato - Datos de entrada:', data);
  if (Array.isArray(data)) {
    const transformed = data.map(item => ({
      id: item.id,
      nombre_tipo: item.nombre_tipo,
      activo: item.activo
    }));
    console.log('transformTiposContrato - Datos transformados:', transformed);
    return transformed;
  }
  console.log('transformTiposContrato - No es un array, retornando datos originales:', data);
  return data;
};

// Función para transformar datos del frontend al backend
export const transformTiposContratoToBackend = (data) => {
  console.log('transformTiposContratoToBackend - Datos de entrada:', data);
  const transformed = {
    nombre: data.nombre_tipo, // Convertir nombre_tipo a nombre para el backend
    activo: data.activo
  };
  console.log('transformTiposContratoToBackend - Datos transformados:', transformed);
  return transformed;
};

export const transformMotivosSalida = (data) => {
  console.log('transformMotivosSalida - Datos de entrada:', data);
  if (Array.isArray(data)) {
    const transformed = data.map(item => ({
      id: item.id,
      nombre_motivo: item.nombre_motivo,
      activo: item.activo
    }));
    console.log('transformMotivosSalida - Datos transformados:', transformed);
    return transformed;
  }
  console.log('transformMotivosSalida - No es un array, retornando datos originales:', data);
  return data;
};

// Función para transformar datos del frontend al backend
export const transformMotivosSalidaToBackend = (data) => {
  console.log('transformMotivosSalidaToBackend - Datos de entrada:', data);
  const transformed = {
    nombre: data.nombre_motivo, // Convertir nombre_motivo a nombre para el backend
    activo: data.activo
  };
  console.log('transformMotivosSalidaToBackend - Datos transformados:', transformed);
  return transformed;
};

// Transformación de datos para el módulo de Personal
export const transformPersonal = (data) => {
  console.log('transformPersonal - Datos de entrada:', data);
  if (Array.isArray(data)) {
    const transformed = data.map(item => ({
      id: item.id,
      tipoDocumento: item.tipo_documento,
      numeroDocumento: item.numero_documento,
      nombres: item.nombres,
      apellidos: item.apellidos,
      areaDestinoId: item.area_destino_id,
      tipoContratoId: item.tipo_contrato_id,
      area_nombre: item.area_nombre || 'No asignado',
      tipo_contrato_nombre: item.tipo_contrato_nombre || 'No asignado',
      activo: item.activo
    }));
    console.log('transformPersonal - Datos transformados:', transformed);
    return transformed;
  }
  console.log('transformPersonal - No es un array, retornando datos originales:', data);
  return data;
};

// Función para transformar datos del frontend al backend
export const transformPersonalToBackend = (data) => {
  console.log('transformPersonalToBackend - Datos de entrada:', data);
  const transformed = {
    tipoDocumento: data.tipoDocumento,
    numeroDocumento: data.numeroDocumento,
    nombres: data.nombres,
    apellidos: data.apellidos,
    areaDestinoId: parseInt(data.areaDestinoId),
    tipoContratoId: parseInt(data.tipoContratoId),
    activo: data.activo
  };
  console.log('transformPersonalToBackend - Datos transformados:', transformed);
  return transformed;
};

// Configuración de columnas para las tablas
export const getTableColumns = (moduleName) => {
  const baseColumns = [
    {
      key: 'id',
      title: 'ID',
      className: 'w-16',
    },
  ];

  const moduleColumns = {
    areas: [
      { key: 'nombre_area', title: 'Nombre del Área' },
      { 
        key: 'activa', 
        title: 'Estado',
        render: (value) => (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value ? 'Activa' : 'Inactiva'}
          </span>
        ),
      },
    ],
    tiposDocumento: [
      { key: 'codigo', title: 'Código' },
      { key: 'nombre_completo', title: 'Nombre Completo' },
      { 
        key: 'activo', 
        title: 'Estado',
        render: (value) => (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
    ],
    motivosVisita: [
      { key: 'nombre_motivo', title: 'Nombre del Motivo' },
      { 
        key: 'activo', 
        title: 'Estado',
        render: (value) => (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
    ],
    tiposContrato: [
      { key: 'nombre_tipo', title: 'Nombre del Tipo' },
      { 
        key: 'activo', 
        title: 'Estado',
        render: (value) => (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
    ],
    motivosSalida: [
      { key: 'nombre_motivo', title: 'Nombre del Motivo' },
      { 
        key: 'activo', 
        title: 'Estado',
        render: (value) => (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
    ],
    personal: [
      { key: 'tipoDocumento', title: 'Tipo Doc.' },
      { key: 'numeroDocumento', title: 'Número Doc.' },
      { key: 'nombres', title: 'Nombres' },
      { key: 'apellidos', title: 'Apellidos' },
      { key: 'area_nombre', title: 'Área' },
      { key: 'tipo_contrato_nombre', title: 'Tipo de Contrato' },
      { 
        key: 'activo', 
        title: 'Estado',
        render: (value) => (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
    ],
  };

  return [...baseColumns, ...(moduleColumns[moduleName] || [])];
};
