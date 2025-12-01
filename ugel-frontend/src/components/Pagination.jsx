import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  totalItems, 
  itemsPerPage, 
  onPageChange,
  showInfo = true,
  className = ""
}) => {
  const safeTotalPages = Math.max(totalPages || 0, 0);
  const safeCurrentPage = Math.min(Math.max(currentPage || 1, 1), safeTotalPages || 1);
  const safeTotalItems = Math.max(totalItems || 0, 0);

  if (safeTotalPages <= 1) return null;

  const startItem = safeTotalItems === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
  const endItem = safeTotalItems === 0 ? 0 : Math.min(safeCurrentPage * itemsPerPage, safeTotalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (safeTotalPages <= maxVisiblePages) {
      // Mostrar todas las páginas si hay pocas
      for (let i = 1; i <= safeTotalPages; i++) {
        pages.push(i);
      }
    } else {
      // Mostrar páginas con elipsis
      if (safeCurrentPage <= 3) {
        // Páginas iniciales
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(safeTotalPages);
      } else if (safeCurrentPage >= safeTotalPages - 2) {
        // Páginas finales
        pages.push(1);
        pages.push('...');
        for (let i = safeTotalPages - 3; i <= safeTotalPages; i++) {
          pages.push(i);
        }
      } else {
        // Páginas intermedias
        pages.push(1);
        pages.push('...');
        for (let i = safeCurrentPage - 1; i <= safeCurrentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(safeTotalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 ${className}`}>
      {showInfo && (
        <div className="text-sm text-gray-600 order-2 sm:order-1 font-medium">
          Mostrando <span className="text-gray-900">{startItem} - {endItem}</span> de <span className="text-gray-900">{safeTotalItems}</span> resultados
        </div>
      )}

      <div className="flex items-center gap-1 order-1 sm:order-2">
        <button
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          className={`flex items-center justify-center w-9 h-9 text-sm font-medium rounded-lg transition-all duration-200 ${
            safeCurrentPage === 1 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200'
          }`}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>

        {getPageNumbers().map((page, index) => {
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
              onClick={() => onPageChange(page)}
              className={`flex items-center justify-center w-9 h-9 text-sm font-medium rounded-lg transition-all duration-200 ${
                page === safeCurrentPage
                  ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:bg-blue-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200'
              }`}
            >
              {page}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === safeTotalPages}
          className={`flex items-center justify-center w-9 h-9 text-sm font-medium rounded-lg transition-all duration-200 ${
            safeCurrentPage === safeTotalPages 
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

export default Pagination;
