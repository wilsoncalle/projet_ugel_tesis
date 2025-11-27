import React, { useState, useEffect, useMemo, useRef } from 'react';
import { asistenciaPersonalService } from '../services/api';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ArrowPathIcon,
  PencilSquareIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const ESTADOS = {
  'Presente': { code: 'P', color: 'bg-green-500', label: 'Presente' },
  'Tardanza': { code: 'T', color: 'bg-amber-400', label: 'Tardanza' },
  'Ausente': { code: 'F', color: 'bg-red-500', label: 'Falta' }, // Mapping Ausente to F (Falta) to match Blade
  'Permiso': { code: 'J', color: 'bg-cyan-500', label: 'Justificado' },
  'Comisión': { code: 'C', color: 'bg-purple-500', label: 'Comisión' }
};

// Reverse mapping for saving
const CODE_TO_ESTADO = {
  'P': 'Presente',
  'T': 'Tardanza',
  'F': 'Ausente',
  'J': 'Permiso',
  'C': 'Comisión'
};

const AsistenciaPersonalCalendario = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [asistencias, setAsistencias] = useState([]);
  const [mode, setMode] = useState('read'); // 'read' | 'edit'
  const [modifiedAttendance, setModifiedAttendance] = useState({}); // { personalId: { date: code } }
  const [saving, setSaving] = useState(false);

  // Popover state
  const [activeCell, setActiveCell] = useState(null); // { personalId, date, target }
  const popoverRef = useRef(null);

  // Generate calendar days (Mon-Fri)
  const { weeks, schoolDays } = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];
    
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon...
      
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Use local YYYY-MM-DD format to match backend and avoid timezone shifts
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        days.push({
          day: d,
          date: dateStr,
          dayOfWeek,
          initial: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][dayOfWeek]
        });
      }
    }

    // Group into weeks
    const weeksArr = [];
    let currentWeek = [];
    
    days.forEach((day) => {
      if (day.dayOfWeek === 1 && currentWeek.length > 0) {
        weeksArr.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    });
    if (currentWeek.length > 0) weeksArr.push(currentWeek);

    return { weeks: weeksArr, schoolDays: days };
  }, [year, month]);

  // Fetch data
  const loadData = async () => {
    setLoading(true);
    try {
      // Use local date components to avoid timezone issues
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      
      const fechaInicio = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      const fechaFin = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
      
      // Initial fetch (page 1)
      const limit = 100;
      const response = await asistenciaPersonalService.getAll({
        fechaInicio,
        fechaFin,
        page: 1,
        limit
      });
      
      let allAsistencias = response.data.data || [];
      const pagination = response.data.pagination;

      // If there are more pages, fetch them
      if (pagination && pagination.totalPages > 1) {
        const promises = [];
        for (let p = 2; p <= pagination.totalPages; p++) {
          promises.push(asistenciaPersonalService.getAll({
            fechaInicio,
            fechaFin,
            page: p,
            limit
          }));
        }
        
        const responses = await Promise.all(promises);
        responses.forEach(res => {
          if (res.data && res.data.data) {
            allAsistencias = allAsistencias.concat(res.data.data);
          }
        });
      }
      
      setAsistencias(allAsistencias);
      setModifiedAttendance({});
    } catch (error) {
      console.error("Error loading attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [year, month]);

  // Process data into rows
  const personalRows = useMemo(() => {
    const map = new Map();

    asistencias.forEach(record => {
      if (!map.has(record.personal_id)) {
        map.set(record.personal_id, {
          id: record.personal_id,
          nombre: `${record.personal_apellidos} ${record.personal_nombres}`,
          cargo: record.personal_cargo_nombre,
          area: record.area_nombre,
          attendance: {} // date -> status
        });
      }
      
      // Ensure we match the local date format used in columns
      const dateStr = record.fecha.split('T')[0];
      const code = ESTADOS[record.estado_presencia]?.code || '?';
      map.get(record.personal_id).attendance[dateStr] = code;
    });

    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [asistencias]);

  // Handle cell click
  const handleCellClick = (e, personalId, date) => {
    if (mode !== 'edit') return;
    
    // If clicking same cell, close it
    if (activeCell?.personalId === personalId && activeCell?.date === date) {
      setActiveCell(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    setActiveCell({
      personalId,
      date,
      top: rect.top + window.scrollY,
      left: rect.right + window.scrollX,
      height: rect.height
    });
  };

  // Handle option selection
  const handleOptionSelect = (code) => {
    if (!activeCell) return;
    
    setModifiedAttendance(prev => ({
      ...prev,
      [activeCell.personalId]: {
        ...prev[activeCell.personalId],
        [activeCell.date]: code
      }
    }));
    setActiveCell(null);
  };

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = [];
      
      Object.entries(modifiedAttendance).forEach(([personalId, dates]) => {
        Object.entries(dates).forEach(([date, code]) => {
          const estado = CODE_TO_ESTADO[code];
          if (estado) {
            promises.push(asistenciaPersonalService.registrarEstado(
              parseInt(personalId),
              estado
            ));
          }
        });
      });

      await Promise.all(promises);
      await loadData();
      setMode('read');
      alert('Cambios guardados correctamente');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target) && !event.target.closest('td')) {
        setActiveCell(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 p-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button 
              onClick={() => setMode('read')}
              className={`px-3 py-1.5 text-sm font-medium flex items-center gap-2 ${mode === 'read' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <EyeIcon className="w-4 h-4" />
              Modo Lectura
            </button>
            <button 
              onClick={() => setMode('edit')}
              className={`px-3 py-1.5 text-sm font-medium flex items-center gap-2 ${mode === 'edit' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <PencilSquareIcon className="w-4 h-4" />
              Modo Edición
            </button>
          </div>
          
          {mode === 'edit' && Object.keys(modifiedAttendance).length > 0 && (
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
              Guardar Cambios
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select 
            value={month} 
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {MESES.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select 
            value={year} 
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {[2023, 2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button 
            onClick={loadData}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            title="Recargar"
          >
            <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto border rounded-xl shadow-sm bg-white relative">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-white shadow-sm">
            <tr>
              <th rowSpan={3} className="bg-[#03366c] text-white font-bold p-2 border border-slate-200 w-12 text-center align-middle">
                N°
              </th>
              <th rowSpan={3} className="bg-[#054f9f] text-white font-bold p-3 border border-slate-200 text-left align-middle min-w-[250px]">
                Apellidos y Nombres
              </th>
              {weeks.map((week, idx) => (
                <th key={`week-${idx}`} colSpan={week.length} className="bg-[#1067c4] text-white font-bold p-2 border border-slate-200 text-center">
                  Semana {idx + 1}
                </th>
              ))}
              <th rowSpan={3} className="bg-[#054f9f] text-white font-bold p-2 border border-slate-200 text-center align-middle w-24">
                Totales
              </th>
            </tr>
            <tr>
              {weeks.flatMap((week) => week.map((day) => (
                <th key={`initial-${day.date}`} className="bg-[#f8f8f8] text-gray-800 font-bold p-1 border border-slate-200 text-center w-8 text-xs">
                  {day.initial}
                </th>
              )))}
            </tr>
            <tr>
              {weeks.flatMap((week) => week.map((day) => (
                <th key={`num-${day.date}`} className="bg-[#f8f8f8] text-gray-800 font-bold p-1 border border-slate-200 text-center text-xs">
                  {day.day}
                </th>
              )))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={100} className="p-8 text-center text-gray-500">
                  Cargando datos...
                </td>
              </tr>
            ) : personalRows.length === 0 ? (
              <tr>
                <td colSpan={100} className="p-8 text-center text-gray-500">
                  No se encontraron registros para este mes.
                </td>
              </tr>
            ) : (
              personalRows.map((person, idx) => {
                // Calculate totals
                const stats = { P: 0, T: 0, F: 0, J: 0 };
                
                return (
                  <tr key={person.id} className="hover:bg-gray-50">
                    <td className="border border-slate-200 text-center p-1 text-xs text-gray-600">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-200 p-2 text-xs">
                      <div className="font-medium text-gray-900">{person.nombre}</div>
                      <div className="text-[10px] text-gray-500">{person.cargo}</div>
                    </td>
                    {schoolDays.map((day) => {
                      // Check modified first, then original
                      const modifiedCode = modifiedAttendance[person.id]?.[day.date];
                      const originalCode = person.attendance[day.date];
                      const code = modifiedCode || originalCode;
                      
                      // Update stats
                      if (code === 'P') stats.P++;
                      else if (code === 'T') stats.T++;
                      else if (code === 'F') stats.F++;
                      else if (code === 'J') stats.J++;

                      let cellClass = "border border-slate-200 text-center p-0 h-8 w-8 text-xs font-bold cursor-default ";
                      if (mode === 'edit') cellClass += "cursor-pointer hover:ring-2 hover:ring-blue-400 hover:z-10 ";
                      
                      let bgClass = "";
                      if (code === 'P') bgClass = "bg-[#28a745] text-white";
                      else if (code === 'T') bgClass = "bg-[#ffc107] text-white";
                      else if (code === 'F') bgClass = "bg-[#dc3545] text-white";
                      else if (code === 'J') bgClass = "bg-[#17a2b8] text-white";
                      else bgClass = "bg-white";

                      return (
                        <td 
                          key={day.date} 
                          className={cellClass + bgClass}
                          onClick={(e) => handleCellClick(e, person.id, day.date)}
                        >
                          {code || ''}
                        </td>
                      );
                    })}
                    <td className="border border-slate-200 p-1 text-[10px] text-center font-medium bg-sky-50 text-sky-900">
                      {`P:${stats.P} T:${stats.T} F:${stats.F} J:${stats.J}`}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Popover for Quick Edit */}
      {activeCell && (
        <div 
          ref={popoverRef}
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 flex overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ 
            top: Math.min(activeCell.top - 10, window.innerHeight - 50), // Prevent going off screen
            left: Math.min(activeCell.left + 5, window.innerWidth - 180) 
          }}
        >
          <button onClick={() => handleOptionSelect('P')} className="w-10 h-10 flex items-center justify-center font-bold text-white bg-[#28a745] hover:opacity-90 transition-opacity">P</button>
          <button onClick={() => handleOptionSelect('T')} className="w-10 h-10 flex items-center justify-center font-bold text-white bg-[#ffc107] hover:opacity-90 transition-opacity">T</button>
          <button onClick={() => handleOptionSelect('F')} className="w-10 h-10 flex items-center justify-center font-bold text-white bg-[#dc3545] hover:opacity-90 transition-opacity">F</button>
          <button onClick={() => handleOptionSelect('J')} className="w-10 h-10 flex items-center justify-center font-bold text-white bg-[#17a2b8] hover:opacity-90 transition-opacity">J</button>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-[#28a745] flex items-center justify-center text-white font-bold text-[10px]">P</span>
          <span>Presente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-[#ffc107] flex items-center justify-center text-white font-bold text-[10px]">T</span>
          <span>Tardanza</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-[#dc3545] flex items-center justify-center text-white font-bold text-[10px]">F</span>
          <span>Falta</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-[#17a2b8] flex items-center justify-center text-white font-bold text-[10px]">J</span>
          <span>Justificado</span>
        </div>
      </div>
    </div>
  );
};

export default AsistenciaPersonalCalendario;
