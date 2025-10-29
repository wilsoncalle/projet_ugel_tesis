import React, { useState, useEffect, Fragment } from 'react';
import { format, parse, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Popover, Transition, Listbox } from '@headlessui/react';

const DateRangeFilter = ({ 
  fechaDesde, 
  fechaHasta, 
  onFechaDesdeChange, 
  onFechaHastaChange,
  onClear,
  className = '',
  onSemanaChange, // <- NUEVO (opcional)
}) => {
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');

  const [fromCalendarMonth, setFromCalendarMonth] = useState(new Date().getMonth());
  const [fromCalendarYear, setFromCalendarYear] = useState(new Date().getFullYear());
  const [toCalendarMonth, setToCalendarMonth] = useState(new Date().getMonth());
  const [toCalendarYear, setToCalendarYear] = useState(new Date().getFullYear());

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
      const today = new Date();
      setToCalendarMonth(today.getMonth());
      setToCalendarYear(today.getFullYear());
    }
  }, [fechaHasta]);

  const parseDate = (dateString) => {
    if (!dateString) return null;
    let date;
    if (dateString.includes('-')) {
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else if (dateString.includes('/')) {
      date = parse(dateString, 'dd/MM/yyyy', new Date());
    } else {
      return null;
    }
    if (date && isValid(date)) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    return null;
  };

  const dateToString = (date) => {
    if (!date || !isValid(date)) return '';
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return format(localDate, 'yyyy-MM-dd');
  };

  // Helper para calcular número de semana ISO
  const getIsoWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  // Helper para construir payload de la semana
  const buildWeekPayload = (start, end) => {
    const days = Array.from({ length: 7 }, (_, i) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    );
    return {
      start: dateToString(start),
      end: dateToString(end),
      weekNumber: getIsoWeekNumber(start),
      days: days.map(d => ({
        date: dateToString(d),
        labelShort: format(d, 'EEEEE', { locale: es }).toUpperCase(), // L, M, X, J, V, S, D
        labelLong: format(d, 'EEEE', { locale: es }),                // lunes, martes, miércoles...
      })),
    };
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
    setFromInput('');
    setToInput('');
    const today = new Date();
    setFromCalendarMonth(today.getMonth());
    setFromCalendarYear(today.getFullYear());
    setToCalendarMonth(today.getMonth());
    setToCalendarYear(today.getFullYear());
    if (onClear) onClear();
  };

  const getTodayDate = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const isFutureDate = (date) => {
    const today = getTodayDate();
    return date > today;
  };

  // ==== Calendario con semanas (lunes-domingo) ====
  const generateCalendarWeeks = (month, year) => {
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);

    const start = new Date(firstDay);
    const dow = firstDay.getDay(); // 0=Dom … 1=Lun
    const toSubtract = dow === 0 ? 6 : dow - 1;
    start.setDate(start.getDate() - toSubtract);

    const end = new Date(lastDay);
    const dowEnd = lastDay.getDay();
    const toAdd = dowEnd === 0 ? 0 : 7 - dowEnd;
    end.setDate(end.getDate() + toAdd);

    const days = [];
    const cur = new Date(start);
    while (cur <= end) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks; // 5-6 filas
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = 2020; year <= currentYear; year++) {
      years.push({ value: year, label: year.toString() });
    }
    return years;
  };

  const generateMonthOptions = () => {
    const months = [];
    for (let month = 0; month < 12; month++) {
      const date = new Date(2024, month, 1);
      months.push({ value: month, label: format(date, 'MMMM', { locale: es }) });
    }
    return months;
  };

  const yearOptions = generateYearOptions();
  const monthOptions = generateMonthOptions();

  // ================= CalendarComponent =================
  const CalendarComponent = ({ 
    selectedDate,        // para pintar el día activo (desde o hasta)
    onSelect,            // callback al elegir un día
    close,
    isFechaDesde,        // true si es el calendario de fecha inicio, false si es fecha fin
    fechaDesde,          // fecha inicio actual (pasada como prop)
    fechaHasta,          // fecha fin actual (pasada como prop)
    onFechaDesdeChange,  // callback para cambiar fecha inicio
    onFechaHastaChange,  // callback para cambiar fecha fin
    onSemanaChange,      // callback para cambiar semana (nuevo)
    calendarMonth, setCalendarMonth, 
    calendarYear, setCalendarYear,
  }) => {
    const weeks = generateCalendarWeeks(calendarMonth, calendarYear);
    const selectedDateObj = selectedDate ? parseDate(selectedDate) : null;
    const today = getTodayDate();

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

    // Rango actual (si existe) para pintar Sx activo - usar las props del componente padre
    const rangoActual = {
      desde: fechaDesde ? parseDate(fechaDesde) : null,
      hasta: fechaHasta ? parseDate(fechaHasta) : null,
    };

    const getWeekRange = (week) => {
      const start = new Date(week[0].getFullYear(), week[0].getMonth(), week[0].getDate()); // lunes
      const end   = new Date(week[6].getFullYear(), week[6].getMonth(), week[6].getDate()); // domingo
      // Clampea el fin al día de hoy si la semana se va al futuro
      const endClamped = end > today ? today : end;
      return { start, end: endClamped };
    };

    const isSameDay = (a, b) =>
      a && b && a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    const isSameWeekRange = (week) => {
      if (!rangoActual.desde || !rangoActual.hasta) return false;
      const { start, end } = getWeekRange(week);
      return isSameDay(rangoActual.desde, start) && isSameDay(rangoActual.hasta, end);
    };

    const onClickSemana = (week) => {
      const { start, end } = getWeekRange(week);
      // Evita futuro en el inicio (por si toda la semana está en el futuro)
      const startClamped = start > today ? today : start;
      // Establecer AMBAS fechas: inicio (lunes) y fin (domingo o hoy)
      const startString = dateToString(startClamped);
      const endString = dateToString(end);
      
      // SOLUCIÓN: Crear un evento personalizado con ambas fechas para evitar problemas con el debounce
      if (startString && endString && onFechaDesdeChange && onFechaHastaChange) {
        // Llamar ambos callbacks inmediatamente - el componente padre debe manejar esto
        onFechaDesdeChange(startString, endString); // Pasar endString como segundo parámetro
        onFechaHastaChange(endString, startString); // Pasar startString como segundo parámetro
        
        // EMITIR SEMANA (si el padre pasó el callback)
        if (onSemanaChange) {
          onSemanaChange(buildWeekPayload(startClamped, end));
        }
        
        // Cerrar el popover después de establecer el rango
        setTimeout(() => {
          close();
        }, 50);
      }
    };

    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-lg w-[22rem]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => navigateMonth('prev')} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeftIcon className="h-4 w-4" />
          </button>

          <div className="flex gap-2">
            {/* Mes */}
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

            {/* Año */}
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

          <button onClick={() => navigateMonth('next')} className="p-1 hover:bg-gray-100 rounded">
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Encabezados: columna S + 7 días */}
        <div className="grid grid-cols-8 mb-2">
          <div className="p-2 text-center text-xs font-medium text-blue-400 select-none"></div>
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
            <div key={day} className="p-2 text-center text-xs font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Filas (semanas) */}
        <div className="space-y-1">
          {weeks.map((week, wIdx) => {
            const activeRow = isSameWeekRange(week);

            return (
              <div
                key={wIdx}
                className={`
                  relative grid grid-cols-8 items-center px-1 transition-colors
                  ${activeRow ? 'bg-blue-100 ring-2 ring-blue-400 rounded-full' : 'hover:bg-blue-50 rounded-full'}
                `}
              >
                {/* Slider Semana */}
                <button
                  type="button"
                  onClick={() => onClickSemana(week)}
                  className={`
                    my-1 mx-1 px-2 py-1 text-[11px] font-bold rounded-full transition-colors
                    ${activeRow 
                      ? 'text-blue-700 bg-blue-200 border-2 border-blue-400'
                      : 'text-blue-600 hover:bg-blue-100 border border-blue-200'
                    }
                  `}
                  title={`Semana ${wIdx + 1}`}
                >
                  {`S${wIdx + 1}`}
                </button>

                {/* Días */}
                {week.map((day, idx) => {
                  const isCurrentMonth = day.getMonth() === calendarMonth;
                  const isSelected = selectedDateObj && day.getTime() === selectedDateObj.getTime();
                  const isToday = day.toDateString() === new Date().toDateString();
                  const disabled = isWeekend(day) || isFutureDate(day) || !isCurrentMonth;

                  return (
                    <button
                      key={idx}
                      onClick={() => !disabled && onSelect(day, close)}
                      disabled={disabled}
                      className={`
                        h-8 w-8 mx-auto my-1 text-sm rounded-full transition-colors
                        ${isSelected
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : isToday
                          ? 'font-bold text-blue-600 hover:bg-blue-100'
                          : disabled
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

      <div className="grid grid-cols-2 gap-3">
        {/* Fecha Inicio */}
        <div className="relative">
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Inicio</label>
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
                <div className="absolute right-2 top-1/2 -translate-y-1/2 p-1 pointer-events-none">
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
                    isFechaDesde={true}
                    fechaDesde={fechaDesde}
                    fechaHasta={fechaHasta}
                    onFechaDesdeChange={onFechaDesdeChange}
                    onFechaHastaChange={onFechaHastaChange}
                    onSemanaChange={onSemanaChange}
                    calendarMonth={fromCalendarMonth}
                    setCalendarMonth={setFromCalendarMonth}
                    calendarYear={fromCalendarYear}
                    setCalendarYear={setFromCalendarYear}
                  />
                )}
              </Popover.Panel>
            </Transition>
          </Popover>
        </div>

        {/* Fecha Fin */}
        <div className="relative">
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Fin</label>
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
                <div className="absolute right-2 top-1/2 -translate-y-1/2 p-1 pointer-events-none">
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
                    isFechaDesde={false}
                    fechaDesde={fechaDesde}
                    fechaHasta={fechaHasta}
                    onFechaDesdeChange={onFechaDesdeChange}
                    onFechaHastaChange={onFechaHastaChange}
                    onSemanaChange={onSemanaChange}
                    calendarMonth={toCalendarMonth}
                    setCalendarMonth={setToCalendarMonth}
                    calendarYear={toCalendarYear}
                    setCalendarYear={setToCalendarYear}
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
