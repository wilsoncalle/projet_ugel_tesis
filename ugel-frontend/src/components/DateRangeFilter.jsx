import React, { useState, useEffect, useRef } from 'react';
import { format, parse, isValid } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { CalendarIcon } from '@heroicons/react/24/outline';
import 'react-day-picker/dist/style.css';

const DateRangeFilter = ({ 
  fechaDesde, 
  fechaHasta, 
  onFechaDesdeChange, 
  onFechaHastaChange,
  className = '' 
}) => {
  const [isOpenDesde, setIsOpenDesde] = useState(false);
  const [isOpenHasta, setIsOpenHasta] = useState(false);
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const desdeRef = useRef(null);
  const hastaRef = useRef(null);

  // Sincronizar inputs con props externas
  useEffect(() => {
    if (fechaDesde) {
      const date = parseDate(fechaDesde);
      if (date && isValid(date)) {
        setFromInput(format(date, 'dd/MM/yyyy'));
      }
    } else {
      setFromInput('');
    }
  }, [fechaDesde]);

  useEffect(() => {
    if (fechaHasta) {
      const date = parseDate(fechaHasta);
      if (date && isValid(date)) {
        setToInput(format(date, 'dd/MM/yyyy'));
      }
    } else {
      setToInput('');
    }
  }, [fechaHasta]);

  // Cerrar calendarios cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (desdeRef.current && !desdeRef.current.contains(event.target)) {
        setIsOpenDesde(false);
      }
      if (hastaRef.current && !hastaRef.current.contains(event.target)) {
        setIsOpenHasta(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Función para parsear fechas de manera consistente
  const parseDate = (dateString) => {
    if (!dateString) return null;
    
    let date;
    
    // Si viene en formato YYYY-MM-DD
    if (dateString.includes('-')) {
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day); // month - 1 porque los meses en JS van de 0-11
    }
    // Si viene en formato DD/MM/YYYY
    else if (dateString.includes('/')) {
      date = parse(dateString, 'dd/MM/yyyy', new Date());
    }
    else {
      return null;
    }
    
    // Crear una nueva fecha solo con día/mes/año (sin tiempo)
    if (date && isValid(date)) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    
    return null;
  };

  // Función para convertir Date a string YYYY-MM-DD
  const dateToString = (date) => {
    if (!date || !isValid(date)) return '';
    // Crear fecha solo con año/mes/día para evitar problemas de zona horaria
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return format(localDate, 'yyyy-MM-dd');
  };

  const handleFechaDesdeSelect = (date) => {
    if (date && isValid(date)) {
      const dateString = dateToString(date);
      onFechaDesdeChange(dateString);
      setIsOpenDesde(false);
    }
  };

  // Aquí está la lógica modificada:
  // - Permitimos seleccionar cualquier fecha válida en "Fecha Fin".
  // - Si el usuario selecciona una fechaFinal anterior a fechaDesde, hacemos SWAP:
  //   nueva fechaDesde = selected date, nueva fechaHasta = anterior fechaDesde.
  const handleFechaHastaSelect = (date) => {
    if (date && isValid(date)) {
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dateString = dateToString(dateOnly);

      if (fechaDesde) {
        const fechaDesdeDate = parseDate(fechaDesde);
        if (fechaDesdeDate && dateOnly < fechaDesdeDate) {
          // SWAP: el seleccionado se convierte en inicio y el anterior inicio pasa a ser fin
          onFechaDesdeChange(dateString);
          onFechaHastaChange(dateToString(fechaDesdeDate));
          setIsOpenHasta(false);
          return;
        }
      }

      onFechaHastaChange(dateString);
      setIsOpenHasta(false);
    }
  };

  // Manejar cambios en el input "Desde"
  const handleFromInputChange = (e) => {
    const value = e.target.value;
    setFromInput(value);

    if (value === '') {
      onFechaDesdeChange('');
      return;
    }

    // Intentar parsear la fecha cuando tiene formato completo
    if (value.length === 10 && value.includes('/')) {
      const parsedDate = parse(value, 'dd/MM/yyyy', new Date());
      if (isValid(parsedDate) && !isWeekend(parsedDate) && !isFutureDate(parsedDate)) {
        onFechaDesdeChange(dateToString(parsedDate));
      }
    }
  };

  // Manejar cambios en el input "Hasta"
  const handleToInputChange = (e) => {
    const value = e.target.value;
    setToInput(value);

    if (value === '') {
      onFechaHastaChange('');
      return;
    }

    // Intentar parsear la fecha cuando tiene formato completo
    if (value.length === 10 && value.includes('/')) {
      const parsedDate = parse(value, 'dd/MM/yyyy', new Date());
      if (isValid(parsedDate) && !isWeekend(parsedDate) && !isFutureDate(parsedDate)) {
        // Validar que no sea anterior a fecha inicio
        if (fechaDesde) {
          const fechaDesdeDate = parseDate(fechaDesde);
          if (fechaDesdeDate) {
            // Permitir el mismo día o días posteriores
            const parsedDateOnly = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
            const fechaDesdeOnly = new Date(fechaDesdeDate.getFullYear(), fechaDesdeDate.getMonth(), fechaDesdeDate.getDate());
            if (parsedDateOnly >= fechaDesdeOnly) {
              onFechaHastaChange(dateToString(parsedDate));
            } else {
              // Si el usuario escribe manualmente un hasta < desde, hacemos swap (misma lógica que en el selector)
              onFechaDesdeChange(dateToString(parsedDate));
              onFechaHastaChange(dateToString(fechaDesdeDate));
            }
          }
        } else {
          onFechaHastaChange(dateToString(parsedDate));
        }
      }
    }
  };

  const clearRange = () => {
    onFechaDesdeChange('');
    onFechaHastaChange('');
  };

  // Función para verificar si el botón "Hoy" está activo
  const isTodayActive = () => {
    if (!fechaDesde || !fechaHasta) return false;
    const today = dateToString(new Date());
    const isActive = fechaDesde === today && fechaHasta === today;
    return isActive;
  };

  // Función para verificar si el botón "Última semana" está activo
  const isLastWeekActive = () => {
    if (!fechaDesde || !fechaHasta) return false;
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const expectedFrom = dateToString(weekAgo);
    const expectedTo = dateToString(today);
    return fechaDesde === expectedFrom && fechaHasta === expectedTo;
  };

  // Función para verificar si el botón "Último mes" está activo
  const isLastMonthActive = () => {
    if (!fechaDesde || !fechaHasta) return false;
    const today = new Date();
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const expectedFrom = dateToString(monthAgo);
    const expectedTo = dateToString(today);
    return fechaDesde === expectedFrom && fechaHasta === expectedTo;
  };

  // Función para obtener la fecha actual sin tiempo
  const getTodayDate = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  // Función para verificar si un día es fin de semana
  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Domingo o Sábado
  };

  // Función para verificar si una fecha está en el futuro
  const isFutureDate = (date) => {
    const today = getTodayDate();
    return date > today;
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm p-4 ${className}`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-700">Filtro por Fechas</h3>
        {(fechaDesde || fechaHasta) && (
          <button
            onClick={clearRange}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
          >
            Limpiar fechas
          </button>
        )}
      </div>

      {/* Campos de Fecha Inicio y Fecha Fin */}
      <div className="grid grid-cols-2 gap-3">
        {/* Fecha Inicio */}
        <div className="relative" ref={desdeRef}>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Fecha Inicio
          </label>
          <div className="relative">
            <input
              type="text"
              value={fromInput}
              onChange={handleFromInputChange}
              onClick={() => {
                setIsOpenDesde(!isOpenDesde);
                setIsOpenHasta(false);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-10"
              placeholder="DD/MM/AAAA"
            />
            <button
              type="button"
              onClick={() => {
                setIsOpenDesde(!isOpenDesde);
                setIsOpenHasta(false);
              }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
            >
              <CalendarIcon className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          
          {isOpenDesde && (
            <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg left-0">
              <DayPicker
                mode="single"
                selected={fechaDesde ? parseDate(fechaDesde) : undefined}
                onSelect={handleFechaDesdeSelect}
                defaultMonth={fechaDesde ? parseDate(fechaDesde) : new Date()}
                locale={es}
                className="p-2 text-sm"
                showOutsideDays={false}
                captionLayout="dropdown-buttons"
                fromYear={2020}
                toYear={2030}
                disabled={(date) => {
                  return isWeekend(date) || isFutureDate(date);
                }}
                fromDate={new Date(2020, 0, 1)}
                toDate={getTodayDate()}
                modifiersClassNames={{
                  selected: "!bg-blue-500 !text-white hover:!bg-blue-600 focus:!bg-blue-500 rounded-full",
                  today: "!font-bold !text-blue-600",
                  day: "hover:bg-gray-100 rounded-full transition-colors cursor-pointer",
                  disabled: "!text-gray-300 !cursor-not-allowed !bg-gray-50 hover:!bg-gray-50"
                }}
                classNames={{
                  day: "h-8 w-8 text-center text-sm p-0 font-normal aria-selected:opacity-100",
                  caption: "flex justify-center py-2 relative items-center",
                  caption_label: "text-sm font-medium",
                  nav: "absolute top-2 right-2",
                  nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  head_cell: "text-gray-500 rounded-md w-8 font-normal text-xs",
                  row: "flex w-full mt-2",
                  cell: "h-8 w-8 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20"
                }}
              />
            </div>
          )}
        </div>

        {/* Fecha Fin */}
        <div className="relative" ref={hastaRef}>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Fecha Fin
          </label>
          <div className="relative">
            <input
              type="text"
              value={toInput}
              onChange={handleToInputChange}
              onClick={() => {
                setIsOpenHasta(!isOpenHasta);
                setIsOpenDesde(false);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-10"
              placeholder="DD/MM/AAAA"
            />
            <button
              type="button"
              onClick={() => {
                setIsOpenHasta(!isOpenHasta);
                setIsOpenDesde(false);
              }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
            >
              <CalendarIcon className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          
          {isOpenHasta && (
            <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg right-0">
              <DayPicker
                mode="single"
                selected={fechaHasta ? parseDate(fechaHasta) : undefined}
                onSelect={handleFechaHastaSelect}
                defaultMonth={fechaHasta ? parseDate(fechaHasta) : (fechaDesde ? parseDate(fechaDesde) : new Date())}
                locale={es}
                className="p-2 text-sm"
                showOutsideDays={false}
                captionLayout="dropdown-buttons"
                fromYear={2020}
                toYear={2030}
                disabled={(date) => {
                  // Solo deshabilitar fines de semana y fechas futuras.
                  return isWeekend(date) || isFutureDate(date);
                }}
                // fromDate fijo (no depender de fechaDesde para evitar bloqueo al pulsar "Hoy")
                fromDate={new Date(2020, 0, 1)}
                toDate={getTodayDate()}
                modifiersClassNames={{
                  selected: "!bg-blue-500 !text-white hover:!bg-blue-600 focus:!bg-blue-500 rounded-full",
                  today: "!font-bold !text-blue-600",
                  day: "hover:bg-gray-100 rounded-full transition-colors cursor-pointer",
                  disabled: "!text-gray-300 !cursor-not-allowed !bg-gray-50 hover:!bg-gray-50"
                }}
                classNames={{
                  day: "h-8 w-8 text-center text-sm p-0 font-normal aria-selected:opacity-100",
                  caption: "flex justify-center py-2 relative items-center",
                  caption_label: "text-sm font-medium",
                  nav: "absolute top-2 right-2",
                  nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  head_cell: "text-gray-500 rounded-md w-8 font-normal text-xs",
                  row: "flex w-full mt-2",
                  cell: "h-8 w-8 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20"
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Botones de acceso rápido */}
      <div className="mt-3 flex gap-2 flex-wrap">
  
        <button
          onClick={() => {
            const today = dateToString(new Date());
            onFechaDesdeChange(today);
            onFechaHastaChange(today);
          }}
          className={`px-3 py-1.5 text-xs border rounded-md transition-colors ${
            isTodayActive()
              ? 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
          }`}
        >
          Hoy
        </button>
        <button
          onClick={() => {
            const today = new Date();
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            onFechaDesdeChange(dateToString(weekAgo));
            onFechaHastaChange(dateToString(today));
          }}
          className={`px-3 py-1.5 text-xs border rounded-md transition-colors ${
            isLastWeekActive()
              ? 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
          }`}
        >
          Última semana
        </button>
        <button
          onClick={() => {
            const today = new Date();
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            onFechaDesdeChange(dateToString(monthAgo));
            onFechaHastaChange(dateToString(today));
          }}
          className={`px-3 py-1.5 text-xs border rounded-md transition-colors ${
            isLastMonthActive()
              ? 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
          }`}
        >
          Último mes
        </button>
      </div>
    </div>
  );
};

export default DateRangeFilter;
