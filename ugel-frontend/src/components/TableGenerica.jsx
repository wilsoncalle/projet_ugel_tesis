import { useState, useMemo } from 'react';
import PaginationTable from './PaginationTable';

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
  minTableWidth = '1200px',
  currentPage: externalCurrentPage,
  totalPages: externalTotalPages,
  totalItems: externalTotalItems,
  onPageChange: externalOnPageChange,
  isRowInWaiting = null, // Nueva prop para determinar si una fila está en espera
  ...props
}) => {
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  
  // Usar search term externo si está disponible, sino usar interno
  const searchTerm = externalSearchValue !== undefined ? externalSearchValue : internalSearchTerm;

  // Filter data based on search term (solo si no hay búsqueda externa)
  const filteredData = useMemo(() => {
    if (externalOnSearch || externalSearchValue !== undefined) {
      // Si hay búsqueda externa, usar datos tal cual
      return data;
    }
    if (!searchTerm) return data;
    
    return data.filter(item =>
      Object.values(item).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm, externalOnSearch, externalSearchValue]);
  
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
    const value = e.target.value;
    if (externalOnSearch) {
      // Si hay callback externo, usarlo y resetear página
      externalOnSearch(value);
      onPageChange(1);
    } else {
      // Búsqueda interna
      setInternalSearchTerm(value);
      onPageChange(1);
    }
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

      {/* Table Container - Solo la tabla con scroll */}
      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
        <div 
          className="overflow-x-auto" 
          style={{ 
            maxWidth: '100%', 
            scrollbarWidth: 'thin',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <table className="divide-y divide-gray-200 w-full">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={column.key || index}
                    scope="col"
                    className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      column.className || ''
                    } ${column.sticky ? 'sticky bg-white z-10' : ''}`}
                    style={{
                      ...column.style,
                      minWidth: column.minWidth || 'auto',
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
                    {column.label || column.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500"
                  >
                    <div className="flex justify-center items-center">
                      <svg
                        className="animate-spin h-5 w-5 text-primary-500"
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
                      <span className="ml-2">Cargando...</span>
                    </div>
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-500"
                  >
                    {searchTerm ? 'No se encontraron resultados para tu búsqueda' : emptyMessage}
                  </td>
                </tr>
              ) : (
                currentData.map((row, rowIndex) => {
                  const isWaiting = isRowInWaiting ? isRowInWaiting(row) : false;
                  return (
                    <tr
                      key={row.id || rowIndex}
                      className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} ${
                        isWaiting ? 'bg-amber-50' : ''
                      }`}
                      style={isWaiting ? { backgroundColor: '#fffbeb' } : {}}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                    {columns.map((column, colIndex) => (
                      <td
                        key={`${rowIndex}-${column.key || colIndex}`}
                        className={`px-3 py-2 text-sm ${
                          column.cellClassName || ''
                        } ${column.sticky ? 'sticky bg-white z-10' : ''}`}
                        style={{
                          ...column.cellStyle,
                          maxWidth: column.maxWidth || '250px',
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
                        {column.render
                          ? column.render(row, rowIndex)
                          : row[column.key]}
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

export default TableGenerica;