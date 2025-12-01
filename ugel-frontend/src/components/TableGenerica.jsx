// ugel-frontend/src/components/TableGenerica.jsx
import { useMemo, useState, isValidElement } from 'react';
import Pagination from './Pagination';

const TableGenerica = ({
  columns,
  data = [],
  isLoading = false,
  emptyMessage = 'No hay datos disponibles',
  className = '',
  onRowClick,
  pagination = false,
  itemsPerPage = 10,
  searchable = false,
  searchPlaceholder = 'Buscar...',
  searchValue: externalSearchValue,
  onSearch: externalOnSearch,
  actions = null,
  minTableWidth, // QUITAMOS EL VALOR POR DEFECTO '1200px'
  adaptive = false,
  currentPage: externalCurrentPage,
  totalPages: externalTotalPages,
  totalItems: externalTotalItems,
  onPageChange: externalOnPageChange,
  isRowInWaiting = null,
  cellPadding = 'px-3',
  rowClassName = '',
  ...props
}) => {
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const [internalSearchTerm, setInternalSearchTerm] = useState('');

  const searchTerm = externalSearchValue !== undefined ? externalSearchValue : internalSearchTerm;

  const filteredData = useMemo(() => {
    if (externalOnSearch || externalSearchValue !== undefined) {
      return data;
    }
    if (!searchTerm) return data;

    return data.filter(item =>
      Object.values(item).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm, externalOnSearch, externalSearchValue]);

  const rawCurrentPage = externalCurrentPage !== undefined ? externalCurrentPage : internalCurrentPage;
  const totalItems = externalTotalItems !== undefined ? externalTotalItems : filteredData.length;
  const computedTotalPages = itemsPerPage > 0 ? Math.ceil(totalItems / itemsPerPage) : 0;
  const totalPages = Math.max(
    externalTotalPages !== undefined ? externalTotalPages : computedTotalPages,
    0
  );
  const currentPage = Math.min(Math.max(rawCurrentPage || 1, 1), totalPages || 1);
  const onPageChange = externalOnPageChange || setInternalCurrentPage;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const currentData = pagination
    ? (externalTotalItems !== undefined ? filteredData : filteredData.slice(startIndex, endIndex))
    : filteredData;

  const handlePageChange = (page) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages || 1);
    onPageChange(nextPage);
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    if (externalOnSearch) {
      externalOnSearch(value);
      onPageChange(1);
    } else {
      setInternalSearchTerm(value);
      onPageChange(1);
    }
  };

  // Lógica corregida para el ancho de la tabla
  const computedMinTableWidth = useMemo(() => {
    if (!adaptive) {
      // Si no es adaptativo, usar el minTableWidth si se pasó explícitamente,
      // de lo contrario '100%' para que se ajuste al contenedor como antes.
      return minTableWidth 
        ? (typeof minTableWidth === 'number' ? `${minTableWidth}px` : minTableWidth) 
        : '100%';
    }

    const baseWidth = 120;
    const totalWidth = columns.reduce((total, column) => {
      const widthValue = column.minWidth || column.width;
      if (typeof widthValue === 'number') return total + widthValue;
      if (typeof widthValue === 'string' && widthValue.endsWith('px')) {
        const parsed = parseInt(widthValue.replace('px', ''), 10);
        return total + (Number.isNaN(parsed) ? baseWidth : parsed);
      }
      // Si es porcentaje o auto, asumimos baseWidth para el cálculo mínimo
      return total + baseWidth;
    }, 0);

    const fallbackMin = typeof minTableWidth === 'number'
      ? minTableWidth
      : parseInt(String(minTableWidth || '').replace('px', ''), 10);

    const minWidth = Math.max(totalWidth, !Number.isNaN(fallbackMin) ? fallbackMin : 0, 600);
    return `${minWidth}px`;
  }, [adaptive, columns, minTableWidth]);

  const renderCellContent = (column, row, rowIndex) => {
    const content = column.render ? column.render(row, rowIndex) : row[column.key];
    const shouldTruncate = adaptive || column.truncate;

    // Si es un elemento React u objeto, no truncar
    if (isValidElement(content)) return content;
    if (typeof content === 'object' && content !== null) return content;

    if (!shouldTruncate || content === null || content === undefined) return content;

    const textString = String(content);
    // Lógica de truncado conservadora
    const width = column.maxWidth || column.minWidth || column.width || '120px';
    const numericWidth = typeof width === 'number'
      ? width
      : parseInt(String(width).replace('px', ''), 10) || 120;

    let charLimit;
    if (numericWidth <= 70) charLimit = 8;      // Aumentado un poco
    else if (numericWidth <= 100) charLimit = 15;
    else if (numericWidth <= 140) charLimit = 22;
    else if (numericWidth <= 180) charLimit = 30;
    else if (numericWidth <= 200) charLimit = 40;
    else charLimit = 55;

    if (textString.length <= charLimit) return textString;

    return (
      <span
        className="block overflow-hidden text-ellipsis"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          lineHeight: '1.2em',
          maxHeight: '2.4em',
          wordBreak: 'break-word'
        }}
        title={textString}
      >
        {textString}
      </span>
    );
  };

  return (
    <div className={`space-y-4 ${className}`} {...props}>
      {(searchable || actions) && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {searchable && (
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          )}
          {actions && (
            <div className="flex gap-2">
              {actions}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
        <div
          className="overflow-x-auto"
          style={{
            maxWidth: '100%',
            scrollbarWidth: 'thin',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <table
            className="divide-y divide-gray-200 w-full"
            style={{
              minWidth: computedMinTableWidth,
              width: '100%',
              // Solo usar fixed si es adaptativo, de lo contrario auto (comportamiento navegador)
              tableLayout: adaptive ? 'fixed' : 'auto' 
            }}
          >
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={column.key || index}
                    scope="col"
                    className={`${cellPadding} py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      column.className || ''
                    } ${column.sticky ? 'sticky bg-white z-10' : ''}`}
                    style={{
                      ...column.style,
                      // Respetar anchos definidos, pero no forzar mínimos grandes si no es adaptive
                      minWidth: column.minWidth || (adaptive ? '80px' : 'auto'),
                      maxWidth: column.maxWidth || '250px',
                      width: column.width || 'auto',
                      ...(column.sticky === 'right' && {
                        position: 'sticky',
                        right: column.stickyOffset || '0px',
                        backgroundColor: '#f9fafb',
                        zIndex: 10
                      }),
                      ...(column.sticky === 'left' && {
                        position: 'sticky',
                        left: column.stickyOffset || '0px',
                        backgroundColor: '#f9fafb',
                        zIndex: 10
                      })
                    }}
                  >
                    <div className={adaptive ? "truncate" : ""}>
                      {column.label || column.title}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className={`${cellPadding} py-2 whitespace-nowrap text-center text-sm text-gray-500`}
                  >
                    <div className="flex justify-center items-center">
                      <svg className="animate-spin h-5 w-5 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="ml-2">Cargando...</span>
                    </div>
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className={`${cellPadding} py-2 whitespace-nowrap text-center text-sm text-gray-500`}
                  >
                    {searchTerm ? 'No se encontraron resultados para tu búsqueda' : emptyMessage}
                  </td>
                </tr>
              ) : (
                currentData.map((row, rowIndex) => {
                  const isWaiting = isRowInWaiting ? isRowInWaiting(row) : false;
                  const resolvedRowClassName = typeof rowClassName === 'function' ? rowClassName(row, rowIndex) : rowClassName || '';
                  return (
                    <tr
                      key={row.id || rowIndex}
                      className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} ${
                        isWaiting ? 'bg-amber-50' : ''
                      } ${resolvedRowClassName}`}
                      style={isWaiting ? { backgroundColor: '#fffbeb' } : {}}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {columns.map((column, colIndex) => (
                        <td
                          key={`${rowIndex}-${column.key || colIndex}`}
                          className={`${cellPadding} py-2 text-sm ${
                            column.cellClassName || ''
                          } ${column.sticky ? 'sticky bg-white z-10' : ''}`}
                          style={{
                            ...column.cellStyle,
                            maxWidth: column.maxWidth || '250px',
                            // Solo forzar comportamiento de palabra si es necesario
                            wordWrap: 'break-word',
                            wordBreak: 'break-word', 
                            overflowWrap: 'break-word',
                            ...(column.sticky === 'right' && {
                              position: 'sticky',
                              right: column.stickyOffset || '0px',
                              backgroundColor: isWaiting ? '#fffbeb' : 'white',
                              zIndex: 10
                            }),
                            ...(column.sticky === 'left' && {
                              position: 'sticky',
                              left: column.stickyOffset || '0px',
                              backgroundColor: isWaiting ? '#fffbeb' : 'white',
                              zIndex: 10
                            })
                          }}
                        >
                          {/* Contenedor interno solo si es adaptativo para truncar */}
                          {adaptive ? (
                             <div style={{ maxHeight: '2.6em', overflow: 'hidden' }}>
                               {renderCellContent(column, row, rowIndex)}
                             </div>
                          ) : (
                             renderCellContent(column, row, rowIndex)
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default TableGenerica;