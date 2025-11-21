import { formatHora } from '../../../utils/dateHelpers';

const getHistorialVisitasColumns = ({ handleOpenModal } = {}) => {
  const columns = [
    {
      key: 'visitante',
      label: 'Visitante',
      minWidth: '220px',
      maxWidth: '260px',
      width: '30%',
      render: (row) => {
        if (!row) {
          return (
            <div>
              <div className="font-medium text-gray-900">-</div>
              <div className="text-sm text-gray-500">-</div>
            </div>
          );
        }

        let nombres = row.visitante_nombres || row.nombres || '';
        let apellidos = row.visitante_apellidos || row.apellidos || '';
        let tipoDoc = row.tipo_documento_codigo || 'DNI';
        let numDoc = row.numero_documento || '';

        const nombreCompleto = `${nombres} ${apellidos}`.trim();
        const documentoCompleto = `${tipoDoc}: ${numDoc}`;

        return (
          <div className="max-w-full">
            <div className="font-medium text-gray-900 break-words" title={nombreCompleto}>
              {nombreCompleto}
            </div>
            <div className="text-sm text-gray-500 break-words" title={documentoCompleto}>
              {documentoCompleto}
            </div>
          </div>
        );
      }
    },
    {
      key: 'empleado',
      label: 'Empleado Visitado',
      minWidth: '200px',
      maxWidth: '280px',
      width: '35%',
      render: (row) => {
        if (!row) {
          return <div className="text-sm">-</div>;
        }

        const empleadoNombre = row.personal_nombres || '';
        const empleadoApellido = row.personal_apellidos || '';
        const empleadoCompleto = `${empleadoNombre} ${empleadoApellido}`.trim();

        return (
          <div
            className="text-sm line-clamp-2"
            title={empleadoCompleto}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
          >
            {empleadoCompleto || '-'}
          </div>
        );
      }
    },
    {
      key: 'motivo',
      label: 'Motivo',
      minWidth: '200px',
      maxWidth: '280px',
      width: '35%',
      render: (row) => {
        if (!row) {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              -
            </span>
          );
        }

        const motivoNombre = row.nombre_motivo || '';

        return (
          <div className="inline-block max-w-full">
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              title={motivoNombre}
              style={{
                maxWidth: '100%',
                wordBreak: 'word-break',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: '1.2',
                width: 'fit-content',
              }}
            >
              {motivoNombre || '-'}
            </span>
          </div>
        );
      }
    },
    {
      key: 'cargo',
      label: 'Cargo',
      minWidth: '200px',
      maxWidth: '280px',
      width: '35%',
      render: (row) => {
        if (!row) {
          return <div className="text-sm text-gray-900">-</div>;
        }

        const cargo = row.personal_cargo || row.cargo_nombre || row.cargo || '';

        return (
          <div
            className="text-sm text-gray-900"
            title={cargo}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
          >
            {cargo || '-'}
          </div>
        );
      }
    },
    {
      key: 'lugar',
      label: 'Lugar',
      minWidth: '200px',
      maxWidth: '280px',
      width: '35%',
      render: (row) => {
        if (!row) {
          return <div className="text-sm text-gray-900">-</div>;
        }

        const lugar = row.nombre_area || '';

        return (
          <div
            className="text-sm text-gray-900"
            title={lugar}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
          >
            {lugar || '-'}
          </div>
        );
      }
    },
    {
      key: 'horaIngreso',
      label: 'Ingreso',
      minWidth: '60px',
      maxWidth: '80px',
      width: '80px',
      render: (row) => {
        if (!row) {
          return <div className="text-sm text-gray-900">-</div>;
        }

        const horaFormateada = formatHora(row.hora_ingreso || row.horaIngreso || row.fecha_ingreso) || '00:00';

        return <div className="text-sm text-gray-900 px-1">{horaFormateada || '-'}</div>;
      }
    },
    {
      key: 'fecha',
      label: 'Fecha',
      minWidth: '110px',
      maxWidth: '110px',
      width: '110px',
      render: (row) => {
        if (!row) {
          return <div className="text-sm text-gray-900">-</div>;
        }

        let fechaStr = '';

        try {
          const fechaIngreso = row.fecha_ingreso;
          if (fechaIngreso) {
            const fecha = new Date(fechaIngreso);
            if (!isNaN(fecha.getTime())) {
              fechaStr = fecha.toLocaleDateString('es-PE');
            } else {
              fechaStr = fechaIngreso;
            }
          }
        } catch (e) {
          fechaStr = row.fecha_ingreso || '';
        }

        return <div className="text-sm text-gray-900 px-1">{fechaStr || '-'}</div>;
      }
    },
    {
      key: 'horaSalida',
      label: 'Salida',
      minWidth: '80px',
      maxWidth: '80px',
      width: '80px',
      render: (row) => {
        if (!row) {
          return <div className="text-sm text-gray-900">-</div>;
        }

        const horaFormateada = formatHora(row.fecha_salida || row.hora_salida);

        return <div className="text-sm text-gray-900 px-1">{horaFormateada || '-'}</div>;
      }
    },
  ];

  if (handleOpenModal) {
    columns.push({
      key: 'actions',
      label: 'Ver',
      minWidth: '80px',
      maxWidth: '80px',
      width: '80px',
      sticky: 'right',
      stickyOffset: '0px',
      render: (row) => {
        if (!row) {
          return null;
        }

        return (
          <div className="flex justify-center">
            <button
              onClick={() => handleOpenModal(row)}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
              title="Ver Detalles"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
              >
                <path
                  d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        );
      },
    });
  }

  return columns;
};

export default getHistorialVisitasColumns;
