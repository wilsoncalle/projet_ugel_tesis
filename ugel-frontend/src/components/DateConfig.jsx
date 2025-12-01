// src/components/BirthdatePicker.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useCalendarMatrix } from '../hooks/useCalendarMatrix';

// === Helpers de fecha ===
const parseDate = (dateString) => {
  if (!dateString) return null;

  if (typeof dateString === 'string' && dateString.includes('-')) {
    const [year, month, day] = dateString.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return isValid(d) ? d : null;
  }

  if (dateString instanceof Date) {
    return isValid(dateString) ? dateString : null;
  }

  return null;
};

const dateToString = (date) => {
  if (!date || !isValid(date)) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getTodayDate = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
};

// 🔹 AHORA: solo se permiten HOY y FUTURO → bloqueamos fechas PASADAS
const isPastDate = (date) => {
  const today = getTodayDate();
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return d < today; // true si es antes de hoy
};

const generateMonthOptions = () => {
  const months = [];
  for (let month = 0; month < 12; month++) {
    const date = new Date(2024, month, 1);
    months.push({
      value: month,
      label: format(date, 'MMMM', { locale: es }),
    });
  }
  return months;
};

const generateYearOptions = (minYear, maxYear) => {
  const years = [];
  for (let y = maxYear; y >= minYear; y--) {
    years.push({ value: y, label: y.toString() });
  }
  return years;
};

// === Componente de selector de mes/año ===
const MonthYearSelector = ({ value, options, onChange, label }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsDropdownOpen(!isDropdownOpen);
        }}
        className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-100 transition-colors min-w-[100px] text-center"
      >
        {label}
      </button>
      
      {isDropdownOpen && (
        <div className="absolute z-[1002] mt-1 max-h-60 w-36 overflow-auto rounded-lg bg-white py-1 text-base shadow-lg border border-gray-200">
          {options.map((option) => (
            <div
              key={option.value}
              onClick={(e) => {
                e.stopPropagation();
                onChange(option.value);
                setIsDropdownOpen(false);
              }}
              className={`
                relative cursor-pointer select-none py-2 px-3 rounded-md mx-1 text-center
                ${value === option.value ? 'bg-blue-500 text-white' : 'text-gray-900 hover:bg-blue-100'}
              `}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// === Calendario ===
const CalendarComponent = ({
  selectedDate,
  onSelect,
  calendarMonth,
  setCalendarMonth,
  calendarYear,
  setCalendarYear,
  minYear,
  maxYear,
  position,
}) => {
  const selectedDateObj = selectedDate ? parseDate(selectedDate) : null;
  const monthOptions = generateMonthOptions();
  const yearOptions = generateYearOptions(minYear, maxYear);
  const today = getTodayDate();

  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      if (calendarMonth === 0) {
        setCalendarMonth(11);
        setCalendarYear((prev) => prev - 1);
      } else {
        setCalendarMonth((prev) => prev - 1);
      }
    } else {
      if (calendarMonth === 11) {
        setCalendarMonth(0);
        setCalendarYear((prev) => prev + 1);
      } else {
        setCalendarMonth((prev) => prev + 1);
      }
    }
  };

  const weeks = useCalendarMatrix(calendarMonth, calendarYear, 1);

  const isSameDay = (a, b) =>
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  return (
    <div 
      className="p-4 bg-white border border-gray-200 rounded-lg shadow-lg w-[22rem] z-[1001]"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <button
          type="button"
          onClick={() => navigateMonth('prev')}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>

        <div className="flex gap-2">
          <MonthYearSelector
            value={calendarMonth}
            options={monthOptions}
            onChange={setCalendarMonth}
            label={monthOptions[calendarMonth].label}
          />
          
          <MonthYearSelector
            value={calendarYear}
            options={yearOptions}
            onChange={setCalendarYear}
            label={calendarYear.toString()}
          />
        </div>

        <button
          type="button"
          onClick={() => navigateMonth('next')}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 mb-2">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
          <div
            key={d}
            className="p-2 text-center text-xs font-medium text-gray-500"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Días del mes */}
      <div className="space-y-1">
        {weeks.map((week, wIdx) => (
          <div key={wIdx} className="grid grid-cols-7 gap-1">
            {week.map((day, dIdx) => {
              const inCurrentMonth = day.getMonth() === calendarMonth;

              // 🔹 Deshabilitar años fuera de rango + FECHAS PASADAS
              const disabled =
                day.getFullYear() < minYear ||
                day.getFullYear() > maxYear ||
                isPastDate(day);

              const isSelected =
                selectedDateObj && isSameDay(day, selectedDateObj);
              const isToday = isSameDay(day, today);

              return (
                <button
                  key={dIdx}
                  type="button"
                  onClick={() => !disabled && onSelect(day)}
                  disabled={disabled}
                  className={`
                    h-8 w-8 mx-auto text-sm rounded-full transition-colors
                    ${
                      disabled
                        ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                        : isSelected
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : isToday
                        ? 'font-bold text-blue-600 hover:bg-blue-100'
                        : inCurrentMonth
                        ? 'hover:bg-gray-100 cursor-pointer text-gray-900'
                        : 'text-gray-300'
                    }
                  `}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// === DateConfig (antes BirthdatePicker) ===
const DateConfig = ({
  label = 'Aplicar desde',            // 🔹 más acorde a config
  id,
  name,
  value,
  onChange,
  error,
  className = '',
  labelClassName = '',
  inputClassName = '',
  minYear = new Date().getFullYear(), // para config normalmente desde este año
  maxYear = new Date().getFullYear() + 5,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
  const today = getTodayDate();
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  
  const containerRef = useRef(null);
  const calendarRef = useRef(null);

  const inputId =
    id || name || `birthdate-${Math.random().toString(36).substring(2, 9)}`;

  const calculatePosition = useCallback(() => {
    if (!containerRef.current) return { top: 0, left: 0 };
    
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const calendarHeight = 400;
    const calendarWidth = 352;
    
    const spaceBelow = viewportHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUpwards = spaceBelow < calendarHeight && spaceAbove > spaceBelow;
    
    let top = openUpwards
      ? Math.max(rect.top - calendarHeight - 4, 8)
      : Math.min(rect.bottom + 4, viewportHeight - calendarHeight - 8);
    
    let left = Math.max(rect.left, 8);
    if (left + calendarWidth > viewportWidth - 8) {
      left = Math.max(viewportWidth - calendarWidth - 8, 8);
    }
    
    return { top, left };
  }, []);

  useEffect(() => {
    if (value) {
      const d = parseDate(value);
      if (d) {
        setInputValue(format(d, 'dd/MM/yyyy'));
        setCalendarMonth(d.getMonth());
        setCalendarYear(d.getFullYear());
        return;
      }
    }
    setInputValue('');
    setCalendarMonth(today.getMonth());
    setCalendarYear(today.getFullYear());
  }, [value]);

  // 🔹 Reposicionar cuando está abierto y hay scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    
    const recalc = () => {
      setCalendarPosition(calculatePosition());
    };
    
    window.addEventListener('scroll', recalc, true);
    window.addEventListener('resize', recalc);
    
    return () => {
      window.removeEventListener('scroll', recalc, true);
      window.removeEventListener('resize', recalc);
    };
  }, [isOpen, calculatePosition]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        calendarRef.current &&
        !calendarRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (date) => {
    if (!date || !isValid(date)) return;
    if (isPastDate(date)) return;   // 🔹 bloquear pasado, solo hoy/futuro

    const normalized = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const isoValue = dateToString(normalized);

    setInputValue(format(normalized, 'dd/MM/yyyy'));
    if (onChange) onChange(isoValue);
    setIsOpen(false);
  };

  // 🔹 Evitar “salto”: calcular posición ANTES de abrir el calendario
  const handleInputClick = () => {
    if (!isOpen) {
      const pos = calculatePosition();
      setCalendarPosition(pos);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div className={`w-full space-y-1 ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={inputId}
          className={`block text-sm font-medium text-gray-700 mb-2 ${labelClassName}`}
        >
          {label}
        </label>
      )}

      <div className="relative">
        <div
          className={`
            relative w-full cursor-pointer rounded-lg border h-10 flex items-center
            transition-all duration-200
            ${
              error
                ? 'border-red-500'
                : isOpen
                ? 'border-blue-500 ring-2 ring-blue-100'
                : 'border-gray-300 hover:border-gray-400'
            }
            bg-white
          `}
          onClick={handleInputClick}
        >
          <input
            id={inputId}
            name={name}
            type="text"
            readOnly
            value={inputValue}
            placeholder="DD/MM/AAAA"
            className={`
              w-full h-full px-3 pr-10 text-sm bg-transparent border-none outline-none cursor-pointer
              ${error ? 'text-red-900' : 'text-gray-900'}
              ${inputClassName}
            `}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {isOpen &&
        createPortal(
          <div ref={calendarRef}>
            <CalendarComponent
              selectedDate={value}
              onSelect={handleSelect}
              calendarMonth={calendarMonth}
              setCalendarMonth={setCalendarMonth}
              calendarYear={calendarYear}
              setCalendarYear={setCalendarYear}
              minYear={minYear}
              maxYear={maxYear}
              position={calendarPosition}
            />
          </div>,
          document.body
        )}  
    </div>
  );
};

export default DateConfig;
