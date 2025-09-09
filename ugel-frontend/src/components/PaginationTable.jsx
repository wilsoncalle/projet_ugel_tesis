import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

const PaginationTable = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange
}) => {
  if (totalPages <= 1) return null;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const handlePageChange = (page) => {
    onPageChange(page);
  };

  const getVisiblePages = () => {
    const delta = 2;
    const pages = [];
    const rangeStart = Math.max(2, currentPage - delta);
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

    if (currentPage - delta > 2) {
      pages.push(1, '...');
    } else {
      for (let i = 1; i < rangeStart; i++) {
        pages.push(i);
      }
    }

    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }

    if (currentPage + delta < totalPages - 1) {
      pages.push('...', totalPages);
    } else {
      for (let i = rangeEnd + 1; i <= totalPages; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
      {/* Información de resultados */}
      <div className="text-sm text-gray-600 order-2 sm:order-1 font-medium">
        Mostrando <span className="text-gray-900">{startIndex + 1} - {Math.min(endIndex, totalItems)}</span> de <span className="text-gray-900">{totalItems}</span> resultados
      </div>
      
      {/* Controles de paginación */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        {/* Botón Anterior */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`flex items-center justify-center w-9 h-9 text-sm font-medium rounded-lg transition-all duration-200 ${
            currentPage === 1 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200'
          }`}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        
        {/* Números de página con lógica de truncamiento */}
        {getVisiblePages().map((page, index) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="flex items-center justify-center w-9 h-9 text-gray-500 font-medium"
              >
                ...
              </span>
            );
          }

          return (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`flex items-center justify-center w-9 h-9 text-sm font-medium rounded-lg transition-all duration-200 ${
                page === currentPage
                  ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:bg-blue-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200'
              }`}
            >
              {page}
            </button>
          );
        })}
        
        {/* Botón Siguiente */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`flex items-center justify-center w-9 h-9 text-sm font-medium rounded-lg transition-all duration-200 ${
            currentPage === totalPages 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200'
          }`}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default PaginationTable;
