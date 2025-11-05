import { useState, Fragment } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWeekend } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeftIcon, ChevronRightIcon, UserIcon, MapPinIcon, ClockIcon, CheckCircleIcon, XCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { Listbox, Transition } from '@headlessui/react';

const CalendarioAsistencias = ({ asistenciasPorFecha = [] }) => {
  const [mesActual, setMesActual] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState(null);

  // --- Generadores de opciones ---
  const meses = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2024, i, 1), 'MMMM', { locale: es }),
  }));
  const años = Array.from({ length: 6 }, (_, i) => {
    const year = new Date().getFullYear() - 3 + i;
    return { value: year, label: year.toString() };
  });

  const cambiarMes = (direccion) => {
    const nuevoMes = new Date(mesActual);
    nuevoMes.setMonth(mesActual.getMonth() + (direccion === 'siguiente' ? 1 : -1));
    setMesActual(nuevoMes);
  };

  const getDiasDelMes = () => {
    const inicio = startOfMonth(mesActual);
    const fin = endOfMonth(mesActual);

    const primerDia = inicio.getDay();
    const ajuste = primerDia === 0 ? 6 : primerDia - 1;

    const inicioAjustado = new Date(inicio);
    inicioAjustado.setDate(inicio.getDate() - ajuste);

    const finAjustado = new Date(fin);
    const ultimoDia = fin.getDay();
    const ajusteFin = ultimoDia === 0 ? 0 : 7 - ultimoDia;
    finAjustado.setDate(fin.getDate() + ajusteFin);

    return eachDayOfInterval({ start: inicioAjustado, end: finAjustado });
  };

  const getAsistenciasDelDia = (fecha) => {
    return asistenciasPorFecha.find(a => isSameDay(new Date(a.fecha), fecha));
  };

  const getColorEstado = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'presente':
        return 'bg-green-100 text-green-700 hover:bg-green-200';
      case 'tardanza':
        return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200';
      case 'ausente':
      case 'falta':
        return 'bg-red-100 text-red-700 hover:bg-red-200';
      case 'permiso':
      case 'en permiso':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
      case 'comisión':
        return 'bg-purple-100 text-purple-700 hover:bg-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    }
  };

  const getIconoEstado = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'presente':
        return <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />;
      case 'tardanza':
        return <ExclamationCircleIcon className="w-3.5 h-3.5 text-yellow-500" />;
      case 'ausente':
      case 'falta':
        return <XCircleIcon className="w-3.5 h-3.5 text-red-500" />;
      default:
        return <ClockIcon className="w-3.5 h-3.5 text-gray-500" />;
    }
  };

  const diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const dias = getDiasDelMes();

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      {/* --- Encabezado con mes/año --- */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => cambiarMes('anterior')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
        </button>

        <div className="flex items-center gap-3">
          <Listbox value={mesActual.getMonth()} onChange={(val) => setMesActual(new Date(mesActual.getFullYear(), val))}>
            <div className="relative">
              <Listbox.Button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 transition-colors capitalize">
                {meses[mesActual.getMonth()].label}
              </Listbox.Button>
              <Transition as={Fragment}>
                <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-32 overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5">
                  {meses.map((m) => (
                    <Listbox.Option key={m.value} value={m.value} className={({ active }) => `px-3 py-2 cursor-pointer rounded-md ${active ? 'bg-blue-100 text-blue-900' : 'text-gray-800'}`}>
                      {m.label}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>

          <Listbox value={mesActual.getFullYear()} onChange={(val) => setMesActual(new Date(val, mesActual.getMonth()))}>
            <div className="relative">
              <Listbox.Button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 transition-colors">
                {mesActual.getFullYear()}
              </Listbox.Button>
              <Transition as={Fragment}>
                <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-28 overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5">
                  {años.map((a) => (
                    <Listbox.Option key={a.value} value={a.value} className={({ active }) => `px-3 py-2 cursor-pointer rounded-md ${active ? 'bg-blue-100 text-blue-900' : 'text-gray-800'}`}>
                      {a.label}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>
        </div>

        <button
          onClick={() => cambiarMes('siguiente')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronRightIcon className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* --- Días de la semana --- */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {diasSemana.map((d, i) => (
          <div key={i} className="text-center text-xs font-semibold text-gray-500 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* --- Días del mes --- */}
      <div className="grid grid-cols-7 gap-1">
        {dias.map((dia, idx) => {
          const asistencias = getAsistenciasDelDia(dia);
          const esDelMesActual = dia.getMonth() === mesActual.getMonth();
          const numAsistencias = asistencias?.asistencias_dia || 0;
          const tieneAsistencias = numAsistencias > 0;
          const esFinDeSemana = isWeekend(dia);
          const estadoPrincipal = asistencias?.detalles?.[0]?.estado_presencia;

          return (
            <div
              key={idx}
              className="relative group"
              onMouseEnter={() => tieneAsistencias && setHoveredDay(dia)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <div
                className={`
                  aspect-[2/1] flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200
                  ${esDelMesActual ? 'text-gray-900' : 'text-gray-300'}
                  ${tieneAsistencias ? getColorEstado(estadoPrincipal) + ' hover:shadow-md' : esFinDeSemana ? 'bg-gray-50 text-gray-400' : 'hover:bg-gray-50'}
                  cursor-pointer
                `}
              >
                {format(dia, 'd')}
              </div>

              {tieneAsistencias && numAsistencias > 1 && (
                <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-semibold shadow">
                  {numAsistencias}
                </div>
              )}

              {/* Tooltip */}
              {hoveredDay && isSameDay(hoveredDay, dia) && (
                <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white rounded-xl shadow-2xl p-4">
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-gray-900"></div>

                  <div className="text-sm font-semibold text-blue-300 mb-2">
                    {format(dia, "d 'de' MMMM", { locale: es })}
                  </div>

                  <div className="text-xs text-gray-300 mb-3">
                    {numAsistencias} {numAsistencias === 1 ? 'registro' : 'registros'}
                  </div>

                  {asistencias?.detalles?.slice(0, 3).map((detalle, i) => (
                    <div key={i} className="border-b border-gray-700 pb-2 mb-2 last:mb-0 last:border-0">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <div className="flex items-center gap-1 text-gray-300">
                          {getIconoEstado(detalle.estado_presencia)}
                          <span className="font-medium">{detalle.estado_presencia}</span>
                        </div>
                        {detalle.hora_ingreso && (
                          <div className="flex items-center gap-1 text-gray-300">
                            <ClockIcon className="w-3.5 h-3.5 text-blue-400" />
                            {detalle.hora_ingreso}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 text-gray-400 text-xs">
                        <div className="flex items-center gap-1">
                          <UserIcon className="w-3.5 h-3.5" /> 
                          {detalle.personal || 'Sin asignar'}
                        </div>
                        {detalle.area && (
                          <div className="flex items-center gap-1">
                            <MapPinIcon className="w-3.5 h-3.5" /> 
                            {detalle.area}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {asistencias?.detalles?.length > 3 && (
                    <div className="text-center text-xs text-gray-500 mt-2">
                      + {asistencias.detalles.length - 3} más
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-600 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-400 rounded"></div>
          <span>Presente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 border border-yellow-400 rounded"></div>
          <span>Tardanza</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-400 rounded"></div>
          <span>Ausente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
          <span>Fin de semana</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarioAsistencias;
