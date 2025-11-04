import React, { Fragment, useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Popover, Transition, Listbox } from '@headlessui/react';
import { format, parse, isValid, setHours, setMinutes, setDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const DatePicker = ({
  value, // ahora espera 'yyyy-MM-dd HH:mm'
  onChange,
  onClear,
  className = '',
  includeToday = true,
  minDate,
}) => {
  // ===== Helpers =====
  const parseDateTimeString = (dateTimeString) => {
    if (!dateTimeString) return null;
    const dt = parse(dateTimeString, 'yyyy-MM-dd HH:mm', new Date());
    return isValid(dt) ? dt : null;
  };
  const startOfLocalDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const todayLocal = useMemo(() => startOfLocalDay(new Date()), []);

  // Helper para verificar si es fin de semana
  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = domingo, 6 = sábado
  };

  const effectiveMinDate = useMemo(() => {
    if (minDate) {
      const md = parse(minDate, 'yyyy-MM-dd', new Date());
      if (isValid(md)) return startOfLocalDay(md);
    }
    const base = new Date(todayLocal);
    if (!includeToday) base.setDate(base.getDate() + 1);
    return base;
  }, [minDate, includeToday, todayLocal]);

  // ===== Estado base =====
  // El estado interno ahora maneja un objeto Date completo
  const initialDate = useMemo(() => parseDateTimeString(value) ?? todayLocal, [value, todayLocal]);

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [calMonth, setCalMonth] = useState(initialDate.getMonth());
  const [calYear, setCalYear] = useState(initialDate.getFullYear());

  useEffect(() => {
    const newDate = parseDateTimeString(value);
    if (newDate) {
      setSelectedDate(newDate);
      setCalMonth(newDate.getMonth());
      setCalYear(newDate.getFullYear());
    } else {
      // Si el valor es nulo/vacío, reseteamos al día de hoy sin seleccionar nada
      setSelectedDate(todayLocal);
      setCalMonth(todayLocal.getMonth());
      setCalYear(todayLocal.getFullYear());
    }
  }, [value]);

  // ===== Generación de Listas para UI =====
  const yearOptions = useMemo(() => {
    const start = 2020;
    const end = todayLocal.getFullYear() + 3;
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [todayLocal]);

  const monthOptions = useMemo(() => (
    Array.from({ length: 12 }, (_, m) => ({ value: m, label: format(new Date(2024, m, 1), 'MMMM', { locale: es }) }))
  ), []);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
  const hoursLoop = useMemo(() => [...hours, ...hours, ...hours], [hours]);
  const minutesLoop = useMemo(() => [...minutes, ...minutes, ...minutes], [minutes]);
  const BLOCK_HOURS = 24;
  const BLOCK_MINUTES = 60;

  // ===== Lógica del Calendario =====
  const weeks = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const start = new Date(firstDay);
    const dow = firstDay.getDay();
    start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));
    const end = new Date(lastDay);
    const dowE = lastDay.getDay();
    end.setDate(end.getDate() + (dowE === 0 ? 0 : 7 - dowE));

    const days = [];
    let cur = new Date(start);
    while (cur <= end) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    const weeksArr = [];
    for (let i = 0; i < days.length; i += 7) weeksArr.push(days.slice(i, i + 7));
    return weeksArr;
  }, [calMonth, calYear]);

  const navigateMonth = (dir) => {
    const newDate = new Date(calYear, calMonth, 1);
    newDate.setMonth(newDate.getMonth() + (dir === 'prev' ? -1 : 1));
    setCalMonth(newDate.getMonth());
    setCalYear(newDate.getFullYear());
  };

  // ===== Emisión y selección =====
  const handleSelectionChange = (newDate) => {
    if (startOfLocalDay(newDate) < effectiveMinDate) return;
    // No permitir seleccionar fines de semana
    if (isWeekend(newDate)) return;
    setSelectedDate(newDate);
    onChange?.(format(newDate, 'yyyy-MM-dd HH:mm'));
  };

  const handleSelectDay = (day) => {
    const currentHour = selectedDate.getHours();
    const currentMinute = selectedDate.getMinutes();
    let newDate = setHours(day, currentHour);
    newDate = setMinutes(newDate, currentMinute);
    handleSelectionChange(newDate);
  };
  
  const handleSelectHour = (hour) => {
    const newDate = setHours(selectedDate, hour);
    handleSelectionChange(newDate);
  };

  const handleSelectMinute = (minute) => {
    const newDate = setMinutes(selectedDate, minute);
    handleSelectionChange(newDate);
  };

  const clearDate = () => {
    onChange?.('');
    onClear?.();
  };
  
  // Referencias para auto-scroll del tiempo
  const hourListRef = useRef(null);
  const minuteListRef = useRef(null);
  const itemHourRef = useRef(null);
  const itemMinuteRef = useRef(null);
  const anchorRef = useRef(null);
  
  // Inicializa el scroll al bloque central con la hora/minuto seleccionados
  useEffect(() => {
    const hourContainer = hourListRef.current;
    const minuteContainer = minuteListRef.current;
    const hourItemH = itemHourRef.current?.offsetHeight || 32;
    const minuteItemH = itemMinuteRef.current?.offsetHeight || 32;
    if (hourContainer) {
      const idx = selectedDate.getHours();
      hourContainer.scrollTop = (BLOCK_HOURS + idx) * hourItemH;
    }
    if (minuteContainer) {
      const idx = selectedDate.getMinutes();
      minuteContainer.scrollTop = (BLOCK_MINUTES + idx) * minuteItemH;
    }
  }, [selectedDate]);

  // Recentrado para efecto infinito
  const onScrollHours = () => {
    const el = hourListRef.current;
    if (!el) return;
    const itemH = itemHourRef.current?.offsetHeight || 32;
    const blockSize = BLOCK_HOURS * itemH;
    if (el.scrollTop < blockSize) {
      el.scrollTop += blockSize;
    } else if (el.scrollTop >= blockSize * 2) {
      el.scrollTop -= blockSize;
    }
  };
  const onScrollMinutes = () => {
    const el = minuteListRef.current;
    if (!el) return;
    const itemH = itemMinuteRef.current?.offsetHeight || 32;
    const blockSize = BLOCK_MINUTES * itemH;
    if (el.scrollTop < blockSize) {
      el.scrollTop += blockSize;
    } else if (el.scrollTop >= blockSize * 2) {
      el.scrollTop -= blockSize;
    }
  };


  // ===== Subcomponente del Panel =====
  const CalendarPanel = ({ close }) => {
    const selectedDay = parseDateTimeString(value); // El valor real que está "guardado"
    const currentHour = selectedDate.getHours();
    const currentMinute = selectedDate.getMinutes();

    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-lg w-auto flex">
        {/* Columna Izquierda: Calendario */}
        <div className="pr-3">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 w-[18rem]">
            <button onClick={() => navigateMonth('prev')} className="p-1 hover:bg-gray-100 rounded" aria-label="Mes anterior">
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <div className="flex gap-2">
              <Listbox value={calMonth} onChange={setCalMonth}>
                <div className="relative">
                  <Listbox.Button className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-100 transition-colors min-w-[100px] text-center capitalize">
                    {monthOptions[calMonth].label}
                  </Listbox.Button>
                  <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-36 overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      {monthOptions.map((m) => (
                        <Listbox.Option key={m.value} value={m.value} className={({ active }) => `cursor-default select-none relative py-2 px-3 ${active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}`}>
                          {m.label}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
              <Listbox value={calYear} onChange={setCalYear}>
                <div className="relative">
                  <Listbox.Button className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-100 transition-colors min-w-[70px] text-center">
                    {calYear}
                  </Listbox.Button>
                  <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-24 overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      {yearOptions.map((y) => (
                        <Listbox.Option key={y} value={y} className={({ active }) => `cursor-default select-none relative py-2 px-3 text-center ${active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}`}>
                          {y}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
            </div>
            <button onClick={() => navigateMonth('next')} className="p-1 hover:bg-gray-100 rounded" aria-label="Mes siguiente">
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 mb-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <div key={d} className="p-2 text-center text-xs font-medium text-gray-500">{d}</div>
            ))}
          </div>

          {/* Grilla de días */}
          <div className="space-y-1">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-cols-7 gap-y-1">
                {week.map((day, idx) => {
                  const isCurrentMonth = day.getMonth() === calMonth;
                  const isSelected = selectedDay && startOfLocalDay(day).getTime() === startOfLocalDay(selectedDay).getTime();
                  const isToday = day.getTime() === todayLocal.getTime();
                  const isDisabled = startOfLocalDay(day) < effectiveMinDate || isWeekend(day);
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectDay(day)}
                      disabled={isDisabled}
                      className={`
                        h-8 w-8 mx-auto text-sm rounded-full transition-colors
                        ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' :
                        isToday ? 'font-bold text-blue-600 hover:bg-blue-100' :
                        isDisabled ? 'text-gray-300 cursor-not-allowed bg-gray-50' :
                        isCurrentMonth ? 'hover:bg-gray-100 cursor-pointer' :
                        'text-gray-300'}
                      `}
                      title={format(day, "EEEE d 'de' MMMM yyyy", { locale: es })}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Separador Vertical */}
        <div className="border-l border-gray-200 mx-1"></div>

        {/* Columna Derecha: Selector de Tiempo */}
        <div className="pl-3 flex flex-col">
            <div className="grid grid-cols-2 gap-x-3 mb-2 text-center">
                <div className="text-xs font-medium text-gray-500">H</div>
                <div className="text-xs font-medium text-gray-500">M</div>
            </div>
           <div className="flex-grow flex gap-x-3 overflow-hidden">
                {/* Horas */}
             <div ref={hourListRef} onScroll={onScrollHours} className="overflow-y-auto max-h-[224px] pr-1 dp-no-scrollbar">
                     {hoursLoop.map((h, idx) => {
                         const isSelected = value && h === currentHour;
                         return (
                             <button
                               key={`h-${idx}`}
                               ref={idx === BLOCK_HOURS + currentHour ? itemHourRef : null}
                               onClick={() => handleSelectHour(h)}
                               className={`w-8 h-8 rounded-full text-sm flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                             >
                               {h}
                             </button>
                         );
                     })}
                 </div>
                {/* Minutos */}
             <div ref={minuteListRef} onScroll={onScrollMinutes} className="overflow-y-auto max-h-[224px] pr-1 dp-no-scrollbar">
                     {minutesLoop.map((m, idx) => {
                         const isSelected = value && m === currentMinute;
                         return (
                             <button
                               key={`m-${idx}`}
                               ref={idx === BLOCK_MINUTES + currentMinute ? itemMinuteRef : null}
                               onClick={() => handleSelectMinute(m)}
                               className={`w-8 h-8 rounded-full text-sm flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                             >
                               {m}
                             </button>
                         );
                     })}
                 </div>
            </div>
        </div>
      </div>
    );
  };

  // ===== Estado para controlar el renderizado del portal =====
  const [isPortalVisible, setIsPortalVisible] = useState(false);

  // ===== Render principal =====
  return (
    <div className={`${className}`}>
      <style>{`
        .dp-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .dp-no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
      <Popover className="relative">
        {({ open, close }) => {
          // Sincronizar el estado del portal con el estado del Popover
          useEffect(() => {
            if (open) {
              setIsPortalVisible(true);
            } else {
              // Cerrar inmediatamente cuando open es false
              setIsPortalVisible(false);
            }
          }, [open]);

          const rect = anchorRef.current?.getBoundingClientRect();
          const left = rect ? rect.left : 0;
          const top = rect ? rect.bottom + 4 : 0;
          
          return (
            <>
              <Popover.Button as="div" className="w-full" ref={anchorRef}>
                <input
                  type="text"
                  value={value ? format(parseDateTimeString(value), 'dd/MM/yyyy HH:mm') : ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-10 cursor-pointer"
                  placeholder="DD/MM/AAAA HH:mm"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 p-1 pointer-events-none">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                </div>
              </Popover.Button>

              {isPortalVisible && createPortal(
                <Transition
                  as={Fragment}
                  show={open}
                  enter="transition ease-out duration-200"
                  enterFrom="opacity-0 translate-y-1"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition ease-in duration-150"
                  leaveFrom="opacity-100 translate-y-0"
                  leaveTo="opacity-0 translate-y-1"
                  afterLeave={() => {
                    setIsPortalVisible(false);
                  }}
                >
                  <div 
                    className="z-[1001]" 
                    style={{ position: 'fixed', left, top }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Popover.Panel static>
                      <CalendarPanel close={close} />
                    </Popover.Panel>
                  </div>
                </Transition>,
                document.body
              )}
            </>
          );
        }}
      </Popover>
    </div>
  );
};

export default DatePicker;