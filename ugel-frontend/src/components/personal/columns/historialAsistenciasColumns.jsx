const getHistorialAsistenciasColumns = ({ handleOpenModal } = {}) => {
  const columns = [
    {
      key: 'personal',
      label: 'Personal',
      minWidth: '220px',
      maxWidth: '260px',
      width: '30%',
      render: (row) => {
        if (!row) return <div>-</div>;

        const nombreCompleto = `${row.personal_nombres || ''} ${row.personal_apellidos || ''}`.trim();
        const documentoCompleto = `${row.personal_tipo_documento || 'DNI'}: ${row.personal_numero_documento || ''}`;

        return (
          <div className="max-w-full">
            <div className="font-medium text-gray-900 break-words">{nombreCompleto}</div>
            <div className="text-sm text-gray-500 break-words">{documentoCompleto}</div>
          </div>
        );
      },
    },
    {
      key: 'cargo',
      label: 'Cargo',
      minWidth: '200px',
      maxWidth: '280px',
      width: '35%',
      render: (row) => {
        if (!row) return <div>-</div>;

        const cargo = row.personal_cargo_nombre || row.cargo_nombre || row.cargo;

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
      },
    },
    {
      key: 'area',
      label: 'Área',
      minWidth: '200px',
      maxWidth: '280px',
      width: '35%',
      render: (row) => {
        if (!row) return <div>-</div>;

        const area = row.personal_area_nombre || row.area_nombre || row.area;

        return (
          <div
            className="text-sm text-gray-900"
            title={area}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
          >
            {area || '-'}
          </div>
        );
      },
    },
    {
      key: 'fecha',
      label: 'Fecha',
      minWidth: '110px',
      maxWidth: '110px',
      width: '110px',
      render: (row) => {
        if (!row || !row.fecha) return <div>-</div>;
        try {
          const fecha = new Date(row.fecha);
          return <div className="text-sm text-gray-900 px-1">{fecha.toLocaleDateString('es-PE')}</div>;
        } catch {
          return <div className="text-sm text-gray-900 px-1">{row.fecha}</div>;
        }
      },
    },
    {
      key: 'hora_ingreso',
      label: 'Ingreso',
      minWidth: '60px',
      maxWidth: '80px',
      width: '80px',
      render: (row) => {
        if (!row) return <div>-</div>;
        let horaFormateada = row.hora_ingreso || '-';
        if (horaFormateada !== '-' && horaFormateada.includes(':')) {
          horaFormateada = horaFormateada.substring(0, 5);
        }
        return <div className="text-sm text-gray-900 px-1">{horaFormateada}</div>;
      },
    },
    {
      key: 'hora_salida',
      label: 'Salida',
      minWidth: '80px',
      maxWidth: '80px',
      width: '80px',
      render: (row) => {
        if (!row) return <div>-</div>;
        let horaFormateada = row.hora_salida || '-';
        if (horaFormateada !== '-' && horaFormateada.includes(':')) {
          horaFormateada = horaFormateada.substring(0, 5);
        }
        return <div className="text-sm text-gray-900 px-1">{horaFormateada}</div>;
      },
    },
    {
      key: 'estado_presencia',
      label: 'Estado',
      minWidth: '120px',
      maxWidth: '120px',
      width: '120px',
      render: (row) => {
        if (!row) return null;
        const estado = row.estado_presencia || 'No especificado';
        let bgClass = 'bg-gray-100 text-gray-800';

        if (estado === 'Presente') bgClass = 'bg-green-100 text-green-800';
        else if (estado === 'Tarde' || estado === 'Tardanza') bgClass = 'bg-yellow-100 text-yellow-800';
        else if (estado === 'Ausente') bgClass = 'bg-red-100 text-red-800';
        else if (estado === 'Permiso') bgClass = 'bg-blue-100 text-blue-800';

        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgClass}`}>
            {estado}
          </span>
        );
      },
    },
  ];

  if (handleOpenModal) {
    columns.push({
      key: 'actions',
      label: 'Ver',
      minWidth: '80px',
      maxWidth: '80px',
      width: '80px',
      className: 'text-center',
      cellClassName: 'text-center',
      sticky: 'right',
      stickyOffset: '0px',
      render: (row) => {
        if (!row) return null;
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

export default getHistorialAsistenciasColumns;
