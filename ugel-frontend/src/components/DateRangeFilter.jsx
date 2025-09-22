import React, { useState, useEffect, useRef, Fragment } from 'react';
import { format, parse, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Popover, Transition, Listbox } from '@headlessui/react';

const DateRangeFilter = ({ 
  fechaDesde, 
  fechaHasta, 
  onFechaDesdeChange, 
  onFechaHastaChange,
  className = '' 
}) => {
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');

  // Estados para los calendarios
  const [fromCalendarMonth, setFromCalendarMonth] = useState(new Date().getMonth());
  const [fromCalendarYear, setFromCalendarYear] = useState(new Date().getFullYear());
  const [toCalendarMonth, setToCalendarMonth] = useState(new Date().getMonth());
  const [toCalendarYear, setToCalendarYear] = useState(new Date().getFullYear());

  // Sincronizar inputs con props externas
  useEffect(() => {
    if (fechaDesde) {
      const date = parseDate(fechaDesde);
      if (date && isValid(date)) {
        setFromInput(format(date, 'dd/MM/yyyy'));
        setFromCalendarMonth(date.getMonth());
        setFromCalendarYear(date.getFullYear());
      }
    } else {
      setFromInput('');
      // Resetear calendario a fecha actual cuando no hay fecha seleccionada
      const today = new Date();
      setFromCalendarMonth(today.getMonth());
      setFromCalendarYear(today.getFullYear());
    }
  }, [fechaDesde]);

  useEffect(() => {
    if (fechaHasta) {
      const date = parseDate(fechaHasta);
      if (date && isValid(date)) {
        setToInput(format(date, 'dd/MM/yyyy'));
        setToCalendarMonth(date.getMonth());
        setToCalendarYear(date.getFullYear());
      }
    } else {
      setToInput('');
      // Resetear calendario a fecha actual cuando no hay fecha seleccionada
      const today = new Date();
      setToCalendarMonth(today.getMonth());
      setToCalendarYear(today.getFullYear());
    }
  }, [fechaHasta]);

  // Función para parsear fechas de manera consistente
  const parseDate = (dateString) => {
    if (!dateString) return null;
    
    let date;
    
    if (dateString.includes('-')) {
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day);
    }
    else if (dateString.includes('/')) {
      date = parse(dateString, 'dd/MM/yyyy', new Date());
    }
    else {
      return null;
    }
    
    if (date && isValid(date)) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    
    return null;
  };

  // Función para convertir Date a string YYYY-MM-DD
  const dateToString = (date) => {
    if (!date || !isValid(date)) return '';
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return format(localDate, 'yyyy-MM-dd');
  };

  const handleFechaDesdeSelect = (date, close) => {
    if (date && isValid(date)) {
      const dateString = dateToString(date);
      onFechaDesdeChange(dateString);
      close();
    }
  };

  const handleFechaHastaSelect = (date, close) => {
    if (date && isValid(date)) {
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dateString = dateToString(dateOnly);

      if (fechaDesde) {
        const fechaDesdeDate = parseDate(fechaDesde);
        if (fechaDesdeDate && dateOnly < fechaDesdeDate) {
          onFechaDesdeChange(dateString);
          onFechaHastaChange(dateToString(fechaDesdeDate));
          close();
          return;
        }
      }

      onFechaHastaChange(dateString);
      close();
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

    if (value.length === 10 && value.includes('/')) {
      const parsedDate = parse(value, 'dd/MM/yyyy', new Date());
      if (isValid(parsedDate) && !isWeekend(parsedDate) && !isFutureDate(parsedDate)) {
        if (fechaDesde) {
          const fechaDesdeDate = parseDate(fechaDesde);
          if (fechaDesdeDate) {
            const parsedDateOnly = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
            const fechaDesdeOnly = new Date(fechaDesdeDate.getFullYear(), fechaDesdeDate.getMonth(), fechaDesdeDate.getDate());
            if (parsedDateOnly >= fechaDesdeOnly) {
              onFechaHastaChange(dateToString(parsedDate));
            } else {
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
    setFromInput('');
    setToInput('');
    // Resetear calendarios a fecha actual
    const today = new Date();
    setFromCalendarMonth(today.getMonth());
    setFromCalendarYear(today.getFullYear());
    setToCalendarMonth(today.getMonth());
    setToCalendarYear(today.getFullYear());
  };

  // Función para obtener la fecha actual sin tiempo
  const getTodayDate = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  // Función para verificar si un día es fin de semana
  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Función para verificar si una fecha está en el futuro
  const isFutureDate = (date) => {
    const today = getTodayDate();
    return date > today;
  };

  // Generar días del calendario (empezando por lunes)
  const generateCalendarDays = (month, year) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    
    // Ajustar para que el primer día sea lunes (1) en lugar de domingo (0)
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(startDate.getDate() - daysToSubtract);
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  // Generar opciones de años (solo hasta el año actual)
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = 2020; year <= currentYear; year++) {
      years.push({ value: year, label: year.toString() });
    }
    return years;
  };

  // Generar opciones de meses
  const generateMonthOptions = () => {
    const months = [];
    for (let month = 0; month < 12; month++) {
      const date = new Date(2024, month, 1);
      months.push({ 
        value: month, 
        label: format(date, 'MMMM', { locale: es }) 
      });
    }
    return months;
  };

  const yearOptions = generateYearOptions();
  const monthOptions = generateMonthOptions();

  const CalendarComponent = ({ 
    selectedDate, 
    onSelect, 
    close, 
    calendarMonth, 
    setCalendarMonth, 
    calendarYear, 
    setCalendarYear,
    isFromCalendar = true 
  }) => {
    const days = generateCalendarDays(calendarMonth, calendarYear);
    const selectedDateObj = selectedDate ? parseDate(selectedDate) : null;

    const navigateMonth = (direction) => {
      if (direction === 'prev') {
        if (calendarMonth === 0) {
          setCalendarMonth(11);
          setCalendarYear(calendarYear - 1);
        } else {
          setCalendarMonth(calendarMonth - 1);
        }
      } else {
        if (calendarMonth === 11) {
          setCalendarMonth(0);
          setCalendarYear(calendarYear + 1);
        } else {
          setCalendarMonth(calendarMonth + 1);
        }
      }
    };

    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-lg w-80">
        {/* Header con controles de mes/año */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          
          <div className="flex gap-2">
            {/* Select de Mes */}
            <Listbox value={calendarMonth} onChange={setCalendarMonth}>
              <div className="relative">
                <Listbox.Button className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-100 transition-colors min-w-[100px] text-center">
                  {monthOptions[calendarMonth].label}
                </Listbox.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-36 overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {monthOptions.map((month) => (
                      <Listbox.Option
                        key={month.value}
                        value={month.value}
                        className={({ active, selected }) =>
                          `relative cursor-default select-none py-2 px-3 rounded-md mx-1 ${
                            active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                          } ${selected ? 'bg-blue-500 text-white' : ''}`
                        }
                      >
                        {month.label}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </Listbox>

            {/* Select de Año */}
            <Listbox value={calendarYear} onChange={setCalendarYear}>
              <div className="relative">
                <Listbox.Button className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-100 transition-colors min-w-[70px] text-center">
                  {calendarYear}
                </Listbox.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-24 overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {yearOptions.map((year) => (
                      <Listbox.Option
                        key={year.value}
                        value={year.value}
                        className={({ active, selected }) =>
                          `relative cursor-default select-none py-2 px-3 rounded-md mx-1 text-center ${
                            active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                          } ${selected ? 'bg-blue-500 text-white' : ''}`
                        }
                      >
                        {year.label}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </Listbox>
          </div>

          <button
            onClick={() => navigateMonth('next')}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 mb-2">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
            <div key={day} className="p-2 text-center text-xs font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const isCurrentMonth = day.getMonth() === calendarMonth;
            const isSelected = selectedDateObj && 
              day.getTime() === selectedDateObj.getTime();
            const isToday = day.toDateString() === new Date().toDateString();
            const isDisabled = isWeekend(day) || isFutureDate(day) || !isCurrentMonth;

            return (
              <button
                key={index}
                onClick={() => !isDisabled && onSelect(day, close)}
                disabled={isDisabled}
                className={`
                  h-8 w-8 text-sm rounded-full transition-colors
                  ${isSelected 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : isToday 
                    ? 'font-bold text-blue-600 hover:bg-blue-100'
                    : isDisabled 
                    ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                    : isCurrentMonth
                    ? 'hover:bg-gray-100 cursor-pointer'
                    : 'text-gray-300'
                  }
                `}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
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
        <div className="relative">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Fecha Inicio
          </label>
          <Popover className="relative">
            <div className="relative">
              <Popover.Button as="div" className="w-full">
                <input
                  type="text"
                  value={fromInput}
                  onChange={handleFromInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-10 cursor-pointer"
                  placeholder="DD/MM/AAAA"
                  readOnly
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded pointer-events-none">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                </div>
              </Popover.Button>
            </div>
            
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute z-50 mt-1 left-0">
                {({ close }) => (
                  <CalendarComponent
                    selectedDate={fechaDesde}
                    onSelect={handleFechaDesdeSelect}
                    close={close}
                    calendarMonth={fromCalendarMonth}
                    setCalendarMonth={setFromCalendarMonth}
                    calendarYear={fromCalendarYear}
                    setCalendarYear={setFromCalendarYear}
                    isFromCalendar={true}
                  />
                )}
              </Popover.Panel>
            </Transition>
          </Popover>
        </div>

        {/* Fecha Fin */}
        <div className="relative">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Fecha Fin
          </label>
          <Popover className="relative">
            <div className="relative">
              <Popover.Button as="div" className="w-full">
                <input
                  type="text"
                  value={toInput}
                  onChange={handleToInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-10 cursor-pointer"
                  placeholder="DD/MM/AAAA"
                  readOnly
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded pointer-events-none">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                </div>
              </Popover.Button>
            </div>
            
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute z-50 mt-1 right-0">
                {({ close }) => (
                  <CalendarComponent
                    selectedDate={fechaHasta}
                    onSelect={handleFechaHastaSelect}
                    close={close}
                    calendarMonth={toCalendarMonth}
                    setCalendarMonth={setToCalendarMonth}
                    calendarYear={toCalendarYear}
                    setCalendarYear={setToCalendarYear}
                    isFromCalendar={false}
                  />
                )}
              </Popover.Panel>
            </Transition>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default DateRangeFilter;