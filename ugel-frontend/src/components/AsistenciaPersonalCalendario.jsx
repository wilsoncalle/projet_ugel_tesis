import React, { useState, useEffect, useMemo, useRef } from 'react';

import { asistenciaPersonalService } from '../services/api';

import {
  ArrowPathIcon,
  PencilSquareIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Estados base
const ESTADOS = {
  'Presente': { code: 'P', color: 'bg-green-500', label: 'Presente' },
  'Tardanza': { code: 'T', color: 'bg-amber-400', label: 'Tardanza' },
  'Ausente': { code: 'F', color: 'bg-red-500', label: 'Falta' },
  'Permiso': { code: 'L', color: 'bg-blue-600', label: 'Permiso' },
  'Comisión': { code: 'C', color: 'bg-purple-500', label: 'Comisión' },
  'Justificada': { code: 'J', color: 'bg-cyan-500', label: 'Justificada' },
  // Compatibilidad
  'En Permiso': { code: 'L', color: 'bg-blue-600', label: 'Permiso' },
  'Falta': { code: 'F', color: 'bg-red-500', label: 'Falta' }
};

const CODE_TO_ESTADO = {
  'P': 'Presente',
  'T': 'Tardanza',
  'F': 'Ausente',
  'L': 'Permiso',
  'J': 'Justificada',
  'C': 'Comisión'
};



const AsistenciaPersonalCalendario = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [asistencias, setAsistencias] = useState([]);
  const [mode, setMode] = useState('edit'); // 'read' | 'edit'
  const [modifiedAttendance, setModifiedAttendance] = useState({});
  const [saving, setSaving] = useState(false);

  // Popover de edición de celda
  const [activeCell, setActiveCell] = useState(null);
  const popoverRef = useRef(null);

  // Popover de Estadísticas (Totales)
  const [statsPopover, setStatsPopover] = useState(null); // { top, left, personName, stats }
  const statsRef = useRef(null);

  // Días hábiles del mes
  const { weeks, schoolDays } = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      const dayOfWeek = date.getDay(); // 0=Dom,1=Lun...

      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dateStr = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        days.push({
          day: d,
          date: dateStr,
          dayOfWeek,
          initial: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][dayOfWeek]
        });
      }
    }

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

  // Carga de datos
  const loadData = async () => {
    setLoading(true);
    try {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);

      const fechaInicio = `${start.getFullYear()}-${String(
        start.getMonth() + 1
      ).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      const fechaFin = `${end.getFullYear()}-${String(
        end.getMonth() + 1
      ).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

      const limit = 100;
      const response = await asistenciaPersonalService.getAll({
        fechaInicio,
        fechaFin,
        page: 1,
        limit
      });

      let allAsistencias = response.data.data || [];
      const pagination = response.data.pagination;

      if (pagination && pagination.totalPages > 1) {
        const promises = [];
        for (let p = 2; p <= pagination.totalPages; p++) {
          promises.push(
            asistenciaPersonalService.getAll({
              fechaInicio,
              fechaFin,
              page: p,
              limit
            })
          );
        }

        const responses = await Promise.all(promises);
        responses.forEach((res) => {
          if (res.data && res.data.data) {
            allAsistencias = allAsistencias.concat(res.data.data);
          }
        });
      }

      setAsistencias(allAsistencias);
      setModifiedAttendance({});
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [year, month]);

  // Filas por persona
  const personalRows = useMemo(() => {
    const map = new Map();

    asistencias.forEach((record) => {
      if (!map.has(record.personal_id)) {
        map.set(record.personal_id, {
          id: record.personal_id,
          nombre: `${record.personal_apellidos} ${record.personal_nombres}`,
          cargo: record.personal_cargo_nombre,
          area: record.area_nombre,
          attendance: {}
        });
      }

      const dateStr = record.fecha.split('T')[0];
      let estadoNormalizado = record.estado_presencia;
      const code = ESTADOS[estadoNormalizado]?.code || '';

      if (code) {
        map.get(record.personal_id).attendance[dateStr] = code;
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre)
    );
  }, [asistencias]);

  // Totales globales del mes (no se usan aún, pero por si luego los quieres)
  const globalStats = useMemo(() => {
    const stats = { P: 0, T: 0, F: 0, L: 0, J: 0, C: 0 };
    personalRows.forEach((person) => {
      Object.values(person.attendance).forEach((code) => {
        if (stats[code] !== undefined) {
          stats[code]++;
        }
      });
    });
    return stats;
  }, [personalRows]);

  // Click en celda individual (modo edición)
  const handleCellClick = (e, personalId, date) => {
    if (mode !== 'edit') return;

    if (
      activeCell &&
      activeCell.personalId === personalId &&
      activeCell.date === date
    ) {
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

  const handleOptionSelect = (code) => {
    if (!activeCell) return;
    setModifiedAttendance((prev) => ({
      ...prev,
      [activeCell.personalId]: {
        ...prev[activeCell.personalId],
        [activeCell.date]: code
      }
    }));
    setActiveCell(null);
  };

  // Click en Totales de la persona
  const handleTotalsClick = (e, person, stats, rowIndex, totalRows) => {
    const rect = e.currentTarget.getBoundingClientRect();

    const margin = 8;
    const popWidth = 224;   // w-56 ≈ 224px
    const popHeight = 220;  // altura aproximada del popover

    const viewportTop = window.scrollY;
    const viewportBottom = viewportTop + window.innerHeight;
    const viewportLeft = window.scrollX;
    const viewportRight = viewportLeft + window.innerWidth;

    const isBottomRow = rowIndex >= totalRows - 3;

    let top;
    let left;

    if (isBottomRow) {
      // --- ÚLTIMAS 3 FILAS ---
      // Ancla: esquina inferior derecha de la celda,
      // el popover sale hacia ARRIBA y queda a la IZQUIERDA.
      left = rect.left + window.scrollX - popWidth - margin;      // siempre a la izquierda
      top = rect.bottom + window.scrollY - popHeight;              // alinear borde inferior

      // Pequeño ajuste por si se va muy arriba
      if (top < viewportTop + margin) {
        top = viewportTop + margin;
      }
      // (NO tocamos el eje X aquí, solo lo limitamos si se fuera demasiado a la izquierda)
      if (left < viewportLeft + margin) {
        left = viewportLeft + margin;
      }
    } else {
      // --- RESTO DE FILAS (lógica actual mejorada) ---
      // A la izquierda de la celda, centrado verticalmente
      top =
        rect.top +
        window.scrollY +
        rect.height / 2 -
        popHeight / 2;
      left = rect.left + window.scrollX - popWidth - margin;

      // Si no hay espacio a la izquierda, lo movemos a la derecha de la celda
      if (left < viewportLeft + margin) {
        left = rect.right + window.scrollX + margin;
      }

      // Ajuste horizontal para no salirnos del viewport
      if (left + popWidth > viewportRight - margin) {
        left = viewportRight - popWidth - margin;
      }
      if (left < viewportLeft + margin) {
        left = viewportLeft + margin;
      }

      // Ajuste vertical para no cortarse arriba/abajo
      if (top < viewportTop + margin) {
        top = viewportTop + margin;
      }
      if (top + popHeight > viewportBottom - margin) {
        top = viewportBottom - popHeight - margin;
      }
    }

    setStatsPopover({
      personName: person.nombre,
      stats,
      top,
      left,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = [];
      Object.entries(modifiedAttendance).forEach(
        ([personalId, dates]) => {
          Object.entries(dates).forEach(([date, code]) => {
            const estado = CODE_TO_ESTADO[code];
            if (estado) {
              promises.push(
                asistenciaPersonalService.registrarEstado(
                  parseInt(personalId),
                  estado
                )
              );
            }
          });
        }
      );
      await Promise.all(promises);
      await loadData();
      await loadData();
      setMode('edit');
      alert('Cambios guardados correctamente');
      alert('Cambios guardados correctamente');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  // Cerrar popovers al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;

      const insideEditPopover =
        popoverRef.current && popoverRef.current.contains(target);
      const insideStatsPopover =
        statsRef.current && statsRef.current.contains(target);

      const onEditableCell = target.closest(
        'td[data-editable-cell="true"]'
      );
      const onTotalsCell = target.closest('[data-totales-cell="true"]');

      if (!insideEditPopover && !onEditableCell) {
        setActiveCell(null);
      }
      if (!insideStatsPopover && !onTotalsCell) {
        setStatsPopover(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 px-1">
        <div className="flex items-center gap-3">
          {Object.keys(modifiedAttendance).length > 0 && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 bg-sky-600 text-white rounded-full text-xs md:text-sm font-medium hover:bg-sky-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {saving ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckIcon className="w-4 h-4" />
                )}
                Guardar
              </button>
            )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="border border-slate-200 rounded-lg text-sm px-2 py-1.5 bg-white shadow-sm focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
          >
            {MESES.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="border border-slate-200 rounded-lg text-sm px-2 py-1.5 bg-white shadow-sm focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
          >
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            onClick={loadData}
            className="p-2 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded-full transition-colors"
            title="Recargar"
          >
            <ArrowPathIcon
              className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto border border-slate-200 rounded-2xl shadow-sm bg-white relative">
        <table className="w-full border-collapse text-xs md:text-sm">
          <thead className="sticky top-0 z-10 bg-white shadow-sm">
            <tr>
              <th
                rowSpan={3}
                className="bg-slate-50 text-slate-500 font-semibold py-2 px-2 border border-slate-200 w-10 text-center align-middle text-[11px] uppercase tracking-wide"
              >
                N°
              </th>
              <th
                rowSpan={3}
                className="bg-slate-50 text-slate-700 font-semibold py-2 px-3 border border-slate-200 text-left align-middle min-w-[200px] text-[11px] uppercase tracking-wide"
              >
                Apellidos y Nombres
              </th>
              {weeks.map((week, idx) => (
                <th
                  key={`week-${idx}`}
                  colSpan={week.length}
                  className="bg-slate-50 text-slate-500 font-semibold py-2 px-2 border border-slate-200 text-center text-[11px] uppercase tracking-wide"
                >
                  Semana {idx + 1}
                </th>
              ))}
              <th
                rowSpan={3}
                className="bg-slate-50 text-slate-700 font-semibold py-2 px-1 border border-slate-200 text-center align-middle w-[60px] text-[11px] uppercase tracking-wide"
              >
                Totales
              </th>
            </tr>
            <tr>
              {weeks.flatMap((week) =>
                week.map((day) => (
                  <th
                    key={`initial-${day.date}`}
                    className="bg-white text-slate-400 font-medium py-1 border border-slate-200 text-center w-8 text-[10px]"
                  >
                    {day.initial}
                  </th>
                ))
              )}
            </tr>
            <tr>
              {weeks.flatMap((week) =>
                week.map((day) => (
                  <th
                    key={`num-${day.date}`}
                    className="bg-white text-slate-500 font-medium py-1 border border-slate-200 text-center text-[10px]"
                  >
                    {day.day}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={100}
                  className="p-8 text-center text-slate-400 text-sm"
                >
                  Cargando datos...
                </td>
              </tr>
            ) : personalRows.length === 0 ? (
              <tr>
                <td
                  colSpan={100}
                  className="p-8 text-center text-slate-400 text-sm"
                >
                  No se encontraron registros.
                </td>
              </tr>
            ) : (
              personalRows.map((person, idx) => {
                const stats = { P: 0, T: 0, F: 0, L: 0, J: 0, C: 0 };

                return (
                  <tr
                    key={person.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="border border-slate-200 text-center py-1 px-1 text-[11px] text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-200 py-2 px-3 text-xs">
                      <div className="font-medium text-[13px] text-slate-900">
                        {person.nombre}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {person.cargo}
                      </div>
                    </td>

                    {schoolDays.map((day) => {
                      const modifiedCode =
                        modifiedAttendance[person.id]?.[day.date];
                      const originalCode = person.attendance[day.date];
                      const code = modifiedCode || originalCode;

                      if (code && stats[code] !== undefined) stats[code]++;

                      let cellClass =
                        'border border-slate-200 text-center p-0 h-7 w-7 text-[11px] font-semibold ';
                      if (mode === 'edit') {
                        cellClass +=
                          'cursor-pointer hover:ring-2 hover:ring-sky-400 hover:bg-sky-50/40 relative ';
                      } else {
                        cellClass += 'cursor-default ';
                      }

                      // Colores suaves tipo Apple
                      let bgClass =
                        'bg-white text-slate-500 transition-colors';
                      if (code === 'P')
                        bgClass = 'bg-emerald-50 text-emerald-700';
                      else if (code === 'T')
                        bgClass = 'bg-amber-50 text-amber-700';
                      else if (code === 'F')
                        bgClass = 'bg-rose-50 text-rose-700';
                      else if (code === 'L')
                        bgClass = 'bg-sky-50 text-sky-700';
                      else if (code === 'J')
                        bgClass = 'bg-cyan-50 text-cyan-700';
                      else if (code === 'C')
                        bgClass = 'bg-violet-50 text-violet-700';

                      return (
                        <td
                          key={day.date}
                          className={cellClass + bgClass}
                        >
                          {code || ''}
                        </td>
                      );
                    })}

                    {/* Celda de Totales clicable: solo icono */}
                    <td className="border border-slate-200 p-0 align-middle h-full w-[44px]">
                      <button
                        type="button"
                        data-totales-cell="true"
                        onClick={(e) =>
                          handleTotalsClick(e, person, stats, idx, personalRows.length)
                        }
                        className="w-full h-full flex items-center justify-center p-1 
                                   hover:bg-slate-100 focus:outline-none 
                                   focus-visible:ring-2 focus-visible:ring-sky-500"
                        title="Ver resumen mensual"
                      >
                        <ChartBarIcon className="w-4 h-4 text-slate-400 hover:text-sky-600" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Popover de edición de celda */}


      {/* --- Popover de Estadísticas (Totales) --- */}
      {statsPopover && (
        <div
          ref={statsRef}
          className="fixed z-50 bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 p-4 w-56 
                     animate-in slide-in-from-right-2 fade-in duration-200"
          style={{ top: statsPopover.top, left: statsPopover.left }}
        >
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Resumen Mensual
            </h3>
            <button
              onClick={() => setStatsPopover(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="mb-3 text-sm font-medium text-slate-800 border-b border-slate-100 pb-2 leading-tight">
            {statsPopover.personName}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Presentes
              </span>
              <span className="font-semibold text-slate-800">
                {statsPopover.stats.P}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Tardanzas
              </span>
              <span className="font-semibold text-slate-800">
                {statsPopover.stats.T}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Faltas
              </span>
              <span className="font-semibold text-slate-800">
                {statsPopover.stats.F}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Permisos
              </span>
              <span className="font-semibold text-slate-800">
                {statsPopover.stats.L}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                Justificados
              </span>
              <span className="font-semibold text-slate-800">
                {statsPopover.stats.J}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Leyenda con look más limpio */}
      <div className="mt-4 flex flex-wrap gap-3 justify-center">
        <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-white border border-slate-200 text-[11px] shadow-sm">
          <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-[9px]">
            P
          </span>
          <span className="text-slate-600">Presente</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-white border border-slate-200 text-[11px] shadow-sm">
          <span className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-[9px]">
            T
          </span>
          <span className="text-slate-600">Tardanza</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-white border border-slate-200 text-[11px] shadow-sm">
          <span className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center text-white font-bold text-[9px]">
            F
          </span>
          <span className="text-slate-600">Falta</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-white border border-slate-200 text-[11px] shadow-sm">
          <span className="w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-[9px]">
            L
          </span>
          <span className="text-slate-600">Permiso</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-white border border-slate-200 text-[11px] shadow-sm">
          <span className="w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-[9px]">
            J
          </span>
          <span className="text-slate-600">Justificado</span>
        </div>
      </div>
    </div>
  );
};

export default AsistenciaPersonalCalendario;
