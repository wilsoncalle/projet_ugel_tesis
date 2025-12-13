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



// Configuración de campos para el módulo de Cargos
export const cargosFormFields = [
  {
    name: 'nombre_cargo',
    label: 'Nombre del Cargo',
    type: 'text',
    placeholder: 'Ingrese el nombre del cargo',
    required: true,
  },
  {
    name: 'descripcion',
    label: 'Descripción',
    type: 'textarea',
    placeholder: 'Ingrese una descripción del cargo (opcional)',
    required: false,
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
    name: 'fechaNacimiento',
    label: 'Fecha de Nacimiento',
    type: 'date',
    required: true,
    placeholder: 'Seleccione fecha de nacimiento'
  },
  {
    name: 'email',
    label: 'Correo Electrónico',
    type: 'email',
    required: true,
    placeholder: 'Ingrese correo electrónico'
  },
  {
    name: 'cargoId',
    label: 'Cargo',
    type: 'select',
    required: true,
    placeholder: 'Seleccione un cargo',
    options: [] // Se llena dinámicamente
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
  } else if (data && typeof data === 'object') {
    // Manejar objeto individual (para edición)
    const transformed = {
      id: data.id,
      // Backend puede devolver nombre_area o nombre según endpoint
      nombre: data.nombre_area ?? data.nombre ?? '',
      nombre_area: data.nombre_area ?? data.nombre ?? '',
      activa: data.activa
    };
    console.log('transformAreas - Datos transformados (objeto):', transformed);
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
  if (Array.isArray(data)) {
    return data.map(item => ({
      id: item.id,
      codigo: item.codigo,
      nombre_completo: item.nombre_completo,
      activo: item.activo
    }));
  }
  return data;
};

// Función para transformar datos del frontend al backend
export const transformTiposDocumentoToBackend = (data) => {
  const transformed = {
    codigo: data.codigo,
    nombreCompleto: data.nombre_completo, // Convertir snake_case a camelCase
    activo: data.activo
  };
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



// Transformación de datos para el módulo de Cargos
export const transformCargos = (data) => {
  if (Array.isArray(data)) {
    return data.map(item => ({
      id: item.id,
      nombre_cargo: item.nombre_cargo,
      descripcion: item.descripcion || '',

      activo: item.activo,
      fecha_creacion: item.fecha_creacion
    }));
  } else if (data && typeof data === 'object') {
    // Manejar objeto individual (para edición)
    return {
      id: data.id,
      nombre_cargo: data.nombre_cargo,
      descripcion: data.descripcion || '',

      activo: data.activo,
      fecha_creacion: data.fecha_creacion
    };
  }
  return data;
};

// Función para transformar datos del frontend al backend
export const transformCargosToBackend = (data) => {
  const transformed = {
    nombre_cargo: data.nombre_cargo,
    descripcion: data.descripcion,

    activo: data.activo !== undefined ? data.activo : true // Valor por defecto si no se especifica
  };
  return transformed;
};

// Transformación de datos para el módulo de Personal

// Helper para formatear fechas al formato YYYY-MM-DD (requerido por input type="date")
const formatDateForInput = (value) => {
  if (!value) return '';

  // Si ya viene en formato YYYY-MM-DD
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  
  // Si viene con hora (ISO), cortamos la parte de la fecha
  if (typeof value === 'string' && value.includes('T')) {
      return value.split('T')[0];
  }

  // Si es un objeto Date
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  // Extraer componentes locales
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const transformPersonal = (data) => {
  console.log('transformPersonal - Datos de entrada:', data);
  if (Array.isArray(data)) {
    const transformed = data.map(item => ({
      id: item.id,
      tipoDocumento: item.tipo_documento,
      numeroDocumento: item.numero_documento,
      nombres: item.nombres,
      apellidos: item.apellidos,
      fechaNacimiento: formatDateForInput(item.fecha_nacimiento),
      email: item.email,
      cargoId: item.cargo_id ? item.cargo_id.toString() : '',
      cargo_nombre: item.cargo_nombre || 'Sin asignar',
      areaDestinoId: item.area_destino_id ? item.area_destino_id.toString() : '',
      tipoContratoId: item.tipo_contrato_id ? item.tipo_contrato_id.toString() : '',
      area_nombre: item.area_nombre || 'No asignado',
      tipo_contrato_nombre: item.tipo_contrato_nombre || 'No asignado',
      activo: item.activo
    }));
    console.log('transformPersonal - Datos transformados (array):', transformed);
    return transformed;
  } else if (data && typeof data === 'object') {
    const transformed = {
      id: data.id,
      tipoDocumento: data.tipo_documento || data.tipoDocumento, 
      numeroDocumento: data.numero_documento,
      nombres: data.nombres,
      apellidos: data.apellidos,
      fechaNacimiento: formatDateForInput(data.fecha_nacimiento),
      email: data.email,
      cargoId: data.cargo_id ? data.cargo_id.toString() : '',
      cargo_nombre: data.cargo_nombre || 'Sin asignar',
      areaDestinoId: data.area_destino_id ? data.area_destino_id.toString() : '',
      tipoContratoId: data.tipo_contrato_id ? data.tipo_contrato_id.toString() : '',
      area_nombre: data.area_nombre || 'No asignado',
      tipo_contrato_nombre: data.tipo_contrato_nombre || 'No asignado',
      activo: data.activo
    };
    console.log('transformPersonal - Datos transformados (objeto):', transformed);
    return transformed;
  }
  console.log('transformPersonal - No es un array ni objeto, retornando datos originales:', data);
  return data;
};


// Función para transformar datos del frontend al backend
export const transformPersonalToBackend = (data) => {
  console.log('transformPersonalToBackend - Datos de entrada:', data);
  const transformed = {
    tipoDocumento: data.tipoDocumento, // Fix: Ensure this matches the select value
    numeroDocumento: data.numeroDocumento,
    nombres: data.nombres,
    apellidos: data.apellidos,
    fechaNacimiento: data.fechaNacimiento || null,
    email: data.email || null,
    cargoId: parseInt(data.cargoId),
    areaDestinoId: parseInt(data.areaDestinoId),
    tipoContratoId: parseInt(data.tipoContratoId),
    activo: data.activo
  };
  console.log('transformPersonalToBackend - Datos transformados:', transformed);
  return transformed;
};

// Usuarios - campos y transformaciones
export const usuariosFormFields = [
  {
    name: 'nombre_usuario',
    label: 'Nombre de Usuario',
    type: 'text',
    placeholder: 'Ingrese nombre de usuario',
    required: true,
    validation: (value) => {
      if (!value) return 'El nombre de usuario es requerido';
      const trimmed = String(value).trim();
      if (trimmed.length < 3) return 'Debe tener al menos 3 caracteres';
      if (trimmed.length > 100) return 'No puede exceder 100 caracteres';
      if (!/^[A-Za-z0-9]+$/.test(trimmed)) return 'Solo letras y números, sin espacios';
      return null;
    }
  },
  {
    name: 'email',
    label: 'Correo Electrónico',
    type: 'email',
    placeholder: 'Ingrese correo electrónico',
    required: true,
    validation: (value) => {
      if (!value) return 'El correo es requerido';
      const trimmed = String(value).trim();
      if (trimmed.length > 150) return 'El correo no puede exceder 150 caracteres';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Ingrese un correo válido';
      return null;
    }
  },
  {
    name: 'hash_contrasena',
    label: 'Contraseña',
    type: 'password',
    placeholder: 'Ingrese una contraseña segura',
    required: true,
    validation: (value) => {
      if (!value) return 'La contraseña es requerida';
      if (String(value).length < 8) return 'La contraseña debe tener al menos 8 caracteres';
      if (String(value).length > 255) return 'La contraseña es demasiado larga';
      return null;
    }
  },
  {
    name: 'rol',
    label: 'Rol',
    type: 'select',
    required: true,
    placeholder: 'Seleccione rol',
    options: [
      { value: 'Administrador', label: 'Administrador' },
      { value: 'RRHH', label: 'RRHH' },
      { value: 'Vigilante', label: 'Vigilante' },
    ],
    validation: (value) => {
      if (!value) return 'El rol es requerido';
      if (!['Administrador','RRHH','Vigilante'].includes(value)) return 'Rol inválido';
      return null;
    }
  },
  {
    name: 'personal_id',
    label: 'Personal Vinculado',
    type: 'select',
    required: false,
    placeholder: 'Vincular a un trabajador...',
    options: [], // UsuariosPage.jsx se encargará de rellenar esto
    showOnCreate: true,
    showOnEdit: true,
    validation: (value) => null // Sin validación, es opcional
  },
];

export const transformUsuarios = (data) => {
  if (Array.isArray(data)) {
    return data.map(item => ({
      id: item.id,
      nombre_usuario: item.nombre_usuario || item.username,
      email: item.email,
      rol: item.rol,
      activo: item.activo,
      // El 'personal_id' para el formulario
      personal_id: item.personal_id,
      // El texto para la columna de la tabla
      personal_vinculado: item.personal_nombres
        ? `${item.personal_nombres} ${item.personal_apellidos}`
        : 'No vinculado',
    }));
  } else if (data && typeof data === 'object') {
    // Lo mismo para el modo edición (cuando se carga un solo item)
    return {
      id: data.id,
      nombre_usuario: data.nombre_usuario || data.username,
      email: data.email,
      rol: data.rol,
      activo: data.activo,
      // El 'personal_id' para el formulario
      personal_id: data.personal_id,
      // El texto para la columna de la tabla
      personal_vinculado: data.personal_nombres
        ? `${data.personal_nombres} ${data.personal_apellidos}`
        : 'No vinculado',
    };
  }
  return data;
};

export const transformUsuariosToBackend = (data) => {
  const transformed = {
    nombreUsuario: (data.nombre_usuario ?? '').trim(),
    email: (data.email ?? '').trim(),
    contrasena: data.hash_contrasena,
    rol: data.rol,
    // Mapea el 'personal_id' del form al 'personalId' que espera el servicio
    personalId: data.personal_id || null,
  };

  // Borra la contraseña si está vacía (para que no falle al editar)
  if (!transformed.contrasena) {
    delete transformed.contrasena;
  }

  console.log('transformUsuariosToBackend - Datos de entrada:', data);
  console.log('transformUsuariosToBackend - Datos transformados:', transformed);
  return transformed;
};

// Configuración de columnas para las tablas - OPTIMIZADA
export const getTableColumns = (moduleName) => {
  const baseColumns = [
    {
      key: 'id',
      title: 'ID',
      minWidth: '50px',
      maxWidth: '60px',
      width: '50px'
    },
  ];

  const moduleColumns = {
    usuarios: [
      {
        key: 'nombre_usuario',
        title: 'Usuario',
        minWidth: '200px',
        maxWidth: '200px',
        width: '200px'
      },
      {
        key: 'email',
        title: 'Email',
        minWidth: '320px',
        maxWidth: '320px',
        width: '320px'
      },
      {
        key: 'rol',
        title: 'Rol',
        minWidth: '120px',
        maxWidth: '140px',
        width: '120px'
      },
      {
        key: 'personal_vinculado',
        title: 'Personal Vinculado',
        minWidth: '200px',
        maxWidth: '300px',
        width: 'auto'
      },
      {
        key: 'activo',
        title: 'Estado',
        minWidth: '90px',
        maxWidth: '100px',
        width: '90px',
        render: (value) => (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
    ],
    areas: [
      { 
        key: 'nombre_area', 
        title: 'Nombre del Área',
        minWidth: '200px',
        maxWidth: '500px',
        width: 'auto'
      },
      { 
        key: 'activa', 
        title: 'Estado',
        minWidth: '90px',
        maxWidth: '100px',
        width: '90px',
        render: (value) => (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value ? 'Activa' : 'Inactiva'}
          </span>
        ),
      },
    ],
    tiposDocumento: [
      { 
        key: 'codigo', 
        title: 'Código',
        minWidth: '80px',
        maxWidth: '100px',
        width: '80px'
      },
      { 
        key: 'nombre_completo', 
        title: 'Nombre Completo',
        minWidth: '250px',
        maxWidth: '500px',
        width: 'auto'
      },
      { 
        key: 'activo', 
        title: 'Estado',
        minWidth: '90px',
        maxWidth: '100px',
        width: '90px',
        render: (value) => (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
    ],
    motivosVisita: [
      { 
        key: 'nombre_motivo', 
        title: 'Nombre del Motivo',
        minWidth: '200px',
        maxWidth: '500px',
        width: 'auto'
      },
      { 
        key: 'activo', 
        title: 'Estado',
        minWidth: '90px',
        maxWidth: '100px',
        width: '90px',
        render: (value) => (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
    ],
    tiposContrato: [
      { 
        key: 'nombre_tipo', 
        title: 'Nombre del Tipo',
        minWidth: '200px',
        maxWidth: '500px',
        width: 'auto'
      },
      { 
        key: 'activo', 
        title: 'Estado',
        minWidth: '90px',
        maxWidth: '100px',
        width: '90px',
        render: (value) => (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
    ],

    cargos: [
      { 
        key: 'nombre_cargo', 
        title: 'Nombre del Cargo',
        minWidth: '200px',
        maxWidth: '300px',
        width: 'auto'
      },
      { 
        key: 'descripcion', 
        title: 'Descripción',
        minWidth: '250px',
        maxWidth: '400px',
        width: 'auto'
      },

      { 
        key: 'activo', 
        title: 'Estado',
        minWidth: '90px',
        maxWidth: '100px',
        width: '90px',
        render: (value) => (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
            value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {value ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
    ],
    personal: [
      { 
        key: 'tipoDocumento', 
        title: 'Tipo',
        minWidth: '60px',
        maxWidth: '70px',
        width: '60px'
      },
      { 
        key: 'numeroDocumento', 
        title: 'Documento',
        minWidth: '100px',
        maxWidth: '120px',
        width: '100px'
      },
      { 
        key: 'nombres', 
        title: 'Nombres',
        minWidth: '150px',
        maxWidth: '150px',
        width: '150px'
      },
      { 
        key: 'apellidos', 
        title: 'Apellidos',
        minWidth: '150px',
        maxWidth: '150px',
        width: '150px'
      },
      {
        key: 'fechaNacimiento',
        title: 'F. Nacimiento',
        minWidth: '120px',
        maxWidth: '130px',
        width: '120px',
        render: (value, row) => {
          // En algunos componentes de tabla, `value` puede venir como:
          // - el valor de la celda (string)
          // - o la fila completa (objeto)
          let raw = value;

          // Si value es un objeto, intentamos sacar la fecha de ahí o de row
          if (raw && typeof raw === 'object') {
            if ('fechaNacimiento' in raw) {
              raw = raw.fechaNacimiento;
            } else if ('fecha_nacimiento' in raw) {
              raw = raw.fecha_nacimiento;
            } else if (row && typeof row === 'object') {
              raw = row.fechaNacimiento || row.fecha_nacimiento || '';
            } else {
              raw = '';
            }
          } else if (!raw && row && typeof row === 'object') {
            // Si value viene vacío pero la fila sí tiene el campo
            raw = row.fechaNacimiento || row.fecha_nacimiento || '';
          }

          if (!raw) return '';

          // A estas alturas raw debería ser algo tipo 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:mm:ss'
          if (typeof raw === 'string') {
            const [datePart] = raw.split('T');   // '2004-09-26'
            const parts = datePart.split('-');   // ['2004','09','26']
            if (parts.length === 3) {
              const [year, month, day] = parts;
              return `${day}/${month}/${year}`; // 26/09/2004
            }
            // Si no es formateable, devolvemos el pedazo de fecha
            return datePart;
          }

          // Fallback por si raw no es string (Date u otra cosa parseable)
          const date = raw instanceof Date ? raw : new Date(raw);
          if (Number.isNaN(date.getTime())) {
            // Mejor mostrar vacío que [object Object]
            return '';
          }

          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        }
      },
      {
        key: 'email',
        title: 'Correo',
        minWidth: '220px',
        maxWidth: '260px',
        width: '220px'
      },
      { 
        key: 'cargo_nombre', 
        title: 'Cargo',
        minWidth: '150px',
        maxWidth: '150px',
        width: '150px'
      },
      { 
        key: 'area_nombre', 
        title: 'Área',
        minWidth: '190px',
        maxWidth: '190px',
        width: '190px'
      },
      { 
        key: 'tipo_contrato_nombre', 
        title: 'Contrato',
        minWidth: '150px',
        maxWidth: '150px',
        width: '150px'
      },
      { 
        key: 'activo', 
        title: 'Estado',
        minWidth: '80px',
        maxWidth: '90px',
        width: '80px',
        render: (value) => (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
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