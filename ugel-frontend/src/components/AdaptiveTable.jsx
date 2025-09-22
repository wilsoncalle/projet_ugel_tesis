import { useState, useMemo } from 'react';
import PaginationTable from './PaginationTable';

const AdaptiveTable = ({
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
  actions = null,
  currentPage: externalCurrentPage,
  totalPages: externalTotalPages,
  totalItems: externalTotalItems,
  onPageChange: externalOnPageChange,
  isRowInWaiting = null,
  ...props
}) => {
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(item =>
      Object.values(item).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);
  
  // Usar paginación externa si está disponible, sino usar interna
  const currentPage = externalCurrentPage !== undefined ? externalCurrentPage : internalCurrentPage;
  const totalItems = externalTotalItems !== undefined ? externalTotalItems : filteredData.length;
  const totalPages = externalTotalPages !== undefined ? externalTotalPages : Math.ceil(totalItems / itemsPerPage);
  const onPageChange = externalOnPageChange || setInternalCurrentPage;

  // Pagination logic
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  // Si tenemos paginación externa (del backend), usar los datos tal como vienen
  // Si es paginación interna, hacer slice
  const currentData = pagination 
    ? (externalTotalItems !== undefined ? filteredData : filteredData.slice(startIndex, endIndex))
    : filteredData;

  const handlePageChange = (page) => {
    onPageChange(page);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    onPageChange(1); // Reset to first page when searching
  };

  // Calcular el ancho mínimo de la tabla basado en las columnas
  const calculateMinTableWidth = () => {
    const baseWidth = 120; // Ancho base para columnas sin especificar
    const totalWidth = columns.reduce((total, column) => {
      if (column.minWidth) {
        return total + parseInt(column.minWidth.replace('px', ''));
      }
      return total + baseWidth;
    }, 0);
    return Math.max(totalWidth, 600); // Mínimo reducido a 600px
  };

  const minTableWidth = calculateMinTableWidth();

  // Función para truncar texto con tooltip
  const truncateText = (text, maxWidth) => {
    if (!text) return text;
    const textString = String(text);
    
    // Determinar límite de caracteres basado en el ancho
    let charLimit;
    const width = parseInt(maxWidth?.replace('px', '') || '120');
    
    if (width <= 70) charLimit = 6;
    else if (width <= 100) charLimit = 12;
    else if (width <= 140) charLimit = 18;
    else if (width <= 180) charLimit = 24;
    else if (width <= 200) charLimit = 30;
    else charLimit = 40;

    if (textString.length <= charLimit) {
      return textString;
    }

    return (
      <span 
        className="block overflow-hidden text-ellipsis"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          lineHeight: '1.2em',
          maxHeight: '2.4em'
        }}
        title={textString}
      >
        {textString}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Actions Bar */}
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

      {/* Table Container con scroll horizontal adaptativo */}
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
            className="divide-y divide-gray-200"
            style={{ 
              minWidth: `${minTableWidth}px`,
              width: '100%',
              tableLayout: 'fixed'
            }}
          >
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={column.key || index}
                    scope="col"
                    className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      column.className || ''
                    } ${column.sticky ? 'sticky bg-gray-50 z-10' : ''}`}
                    style={{
                      ...column.style,
                      width: column.width || 'auto',
                      minWidth: column.minWidth || '80px',
                      maxWidth: column.maxWidth || '300px',
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
                    <div className="truncate">
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
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    <div className="flex justify-center items-center">
                      <svg
                        className="animate-spin h-6 w-6 text-primary-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span className="ml-3">Cargando datos...</span>
                    </div>
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    <div className="flex flex-col items-center justify-center py-8">
                      <svg
                        className="h-12 w-12 text-gray-400 mb-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="text-gray-500 text-sm">
                        {searchTerm ? 'No se encontraron resultados para tu búsqueda' : emptyMessage}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentData.map((row, rowIndex) => {
                  const isWaiting = isRowInWaiting ? isRowInWaiting(row) : false;
                  return (
                    <tr
                      key={row.id || rowIndex}
                      className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50 transition-colors duration-150' : ''} ${
                        isWaiting ? 'bg-amber-50' : ''
                      }`}
                      style={isWaiting ? { backgroundColor: '#fffbeb' } : {}}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {columns.map((column, colIndex) => (
                        <td
                          key={`${rowIndex}-${column.key || colIndex}`}
                          className={`px-3 py-3 text-sm text-gray-900 ${
                            column.cellClassName || ''
                          } ${column.sticky ? 'sticky bg-white z-10' : ''}`}
                          style={{
                            ...column.cellStyle,
                            width: column.width || 'auto',
                            minWidth: column.minWidth || '80px',
                            maxWidth: column.maxWidth || '300px',
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
                          <div 
                            className="overflow-hidden"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              lineHeight: '1.3em',
                              maxHeight: '2.6em',
                              wordBreak: 'break-word'
                            }}
                          >
                            {column.render
                              ? column.render(row, rowIndex)
                              : truncateText(row[column.key], column.maxWidth)}
                          </div>
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

      {/* Pagination */}
      {pagination && (
        <PaginationTable
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

export default AdaptiveTable;