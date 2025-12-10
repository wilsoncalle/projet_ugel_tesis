import React, { useEffect, useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet, FileText, Loader2, PieChart as PieChartIcon, Users, AlertTriangle, Clock3, Calendar, ChevronDown } from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { asistenciaConfigService, asistenciaPersonalService, areasService, visitasService, motivosVisitaService } from '../services/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import TabView from '../components/TabView';
import SelectCustom from '../components/SelectCustom';
import { KPICard } from '../components/dashboard';
import TableGenerica from '../components/TableGenerica';
import { formatFechaReporte } from '../utils/exportHelpers';

const meses = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

const estados = [
  { value: 'todos', label: 'Todos' },
  { value: 'Presente', label: 'Presente' },
  { value: 'Tardanza', label: 'Tardanza' },
  { value: 'Permiso', label: 'Permiso' },
  { value: 'Ausente', label: 'Ausente' },
];

const periodos = [
  { value: 'semana', label: 'Semanal' },
  { value: 'mes', label: 'Mensual' },
  { value: 'anio', label: 'Anual' },
];

const formatDateParam = (date) => dayjs(date).format('YYYY-MM-DD');
const formatHumanDate = (date) => dayjs(date).format('DD/MM/YYYY');

const normalizeTime = (time) => {
  if (!time) return null;
  if (typeof time === 'string' && time.includes(':')) return time.slice(0, 5);
  return null;
};

const calcularHorasTrabajadas = (entrada, salida) => {
  const hEntrada = normalizeTime(entrada);
  const hSalida = normalizeTime(salida);
  if (!hEntrada || !hSalida) return null;
  const start = dayjs(`2000-01-01T${hEntrada}`);
  const end = dayjs(`2000-01-01T${hSalida}`);
  if (!start.isValid() || !end.isValid()) return null;
  let diff = end.diff(start, 'minute');
  if (diff < 0) return null;
  // Restar 1 hora de refrigerio
  diff = Math.max(diff - 60, 0);
  return diff;
};

const formatHoursFromMinutes = (minutes) => {
  if (minutes === null || minutes === undefined) return '-';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hrs}h ${String(mins).padStart(2, '0')}m`;
};

const formatHHMM = (minutes) => {
  if (!minutes || Number.isNaN(minutes)) return '-';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const colorTardanza = (minutos) => {
  if (!minutos) return 'bg-gray-50 text-gray-700 border-gray-200';
  if (minutos >= 120) return 'bg-red-50 text-red-700 border-red-200';
  if (minutos >= 45) return 'bg-orange-50 text-orange-700 border-orange-200';
  return 'bg-yellow-50 text-yellow-700 border-yellow-200';
};

const colorPromedioHoras = (horas) => {
  if (!horas) return 'bg-gray-50 text-gray-700 border-gray-200';
  if (horas > 7) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (Math.abs(horas - 7) < 0.05) return 'bg-green-50 text-green-700 border-green-200';
  return 'bg-red-50 text-red-700 border-red-200';
};

const calcularRango = (periodo, anio, mes) => {
  const hoy = dayjs();
  const year = anio || hoy.year();
  const month = mes || hoy.month() + 1;

  if (periodo === 'anio') {
    const inicio = dayjs(`${year}-01-01`);
    const fin = dayjs(`${year}-12-31`);
    return {
      fechaInicio: formatDateParam(inicio),
      fechaFin: formatDateParam(fin),
      etiqueta: 'anual',
      rangoTexto: `${formatHumanDate(inicio)} - ${formatHumanDate(fin)}`
    };
  }

  if (periodo === 'semana') {
    const diaReferencia = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(Math.min(hoy.date(), 28)).padStart(2, '0')}`);
    const dayOfWeek = diaReferencia.day(); // 0 domingo, 1 lunes
    const inicio = diaReferencia.subtract((dayOfWeek + 6) % 7, 'day');
    const fin = inicio.add(6, 'day');
    return {
      fechaInicio: formatDateParam(inicio),
      fechaFin: formatDateParam(fin),
      etiqueta: 'semanal',
      rangoTexto: `${formatHumanDate(inicio)} - ${formatHumanDate(fin)}`
    };
  }

  const inicioMes = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
  const finMes = inicioMes.endOf('month');
  return {
    fechaInicio: formatDateParam(inicioMes),
    fechaFin: formatDateParam(finMes),
    etiqueta: 'mensual',
    rangoTexto: `${formatHumanDate(inicioMes)} - ${formatHumanDate(finMes)}`
  };
};

const ExportButton = ({ onExportExcel, onExportPdf }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border-2 border-amber-500 text-amber-600 rounded-full hover:bg-amber-50 transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <FileDown className="h-5 w-5" />
        <span className="text-sm font-semibold">Exportar</span>
        <ChevronDown 
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-20 animate-fadeIn">
            <div className="py-1">
              <button
                onClick={() => {
                  onExportExcel();
                  setIsOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-green-50 transition-colors group"
              >
                <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-green-700">Excel</div>
                  <div className="text-xs text-green-600">Formato .xlsx</div>
                </div>
              </button>

              <div className="border-t border-gray-100 mx-2" />

              <button
                onClick={() => {
                  onExportPdf();
                  setIsOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-red-50 transition-colors group"
              >
                <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                  <FileDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-red-700">PDF</div>
                  <div className="text-xs text-red-600">Formato .pdf</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const ReportesRRHHPage = () => {
  useDocumentTitle('Reportes RRHH - COAC-UGEL');
  const anioActual = new Date().getFullYear();
  const [tabActiva, setTabActiva] = useState('personal');
  const [periodo, setPeriodo] = useState('mes');
  const [anio, setAnio] = useState(anioActual);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [area, setArea] = useState(null);
  const [estado, setEstado] = useState(estados[0]);
  const [areasOptions, setAreasOptions] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [visitas, setVisitas] = useState([]);
  const [motivosOptions, setMotivosOptions] = useState([]);
  const [motivoVisita, setMotivoVisita] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [horaEntradaConfig, setHoraEntradaConfig] = useState('09:00');

  const rango = useMemo(() => calcularRango(periodo, anio, mes), [periodo, anio, mes]);

  useEffect(() => {
    const cargarAreas = async () => {
      try {
        let page = 1;
        const pageSize = 100;
        let all = [];
        let totalPages = 1;

        while (page <= totalPages) {
          const res = await areasService.getAll({ limit: pageSize, page });
          const chunk = res.data?.data || [];
          const pagination = res.data?.pagination;
          totalPages = pagination?.totalPages || 1;
          all = all.concat(chunk);
          page += 1;
          if (!pagination) break;
        }

        const opts = all.map((a) => ({
          value: a.id,
          label: a.nombre_area,
        }));
        setAreasOptions(opts);
      } catch (e) {
        console.error('Error al cargar áreas', e);
      }
    };
    cargarAreas();

    const cargarMotivos = async () => {
      try {
        const res = await motivosVisitaService.getAll({ limit: 100 });
        const opts = (res.data?.data || []).map((m) => ({
          value: m.id,
          label: m.nombre_motivo,
        }));
        setMotivosOptions(opts);
      } catch (e) {
        console.error('Error al cargar motivos de visita', e);
      }
    };
    cargarMotivos();
  }, []);

  useEffect(() => {
    const cargarConfig = async () => {
      try {
        const res = await asistenciaConfigService.getGlobal();
        const entrada = res.data?.data?.hora_entrada || '09:00';
        setHoraEntradaConfig(normalizeTime(entrada) || '09:00');
      } catch (e) {
        console.warn('No se pudo obtener la configuración global de asistencia, usando 09:00');
        setHoraEntradaConfig('09:00');
      }
    };
    cargarConfig();
  }, []);

  useEffect(() => {
    const cargarAsistencias = async () => {
      setLoading(true);
      setError(null);
      try {
        const pageSize = 100;
        let page = 1;
        let totalPages = 1;
        let acumulado = [];

        do {
          const response = await asistenciaPersonalService.getAll({
            page,
            limit: pageSize,
            fechaInicio: rango.fechaInicio,
            fechaFin: rango.fechaFin,
            areaId: area?.value,
            estadoPresencia: estado?.value !== 'todos' ? estado?.value : undefined,
          });

          const data = response.data?.data || [];
          const pagination = response.data?.pagination;
          totalPages = pagination?.totalPages || 1;
          acumulado = acumulado.concat(data);
          page += 1;
          if (!pagination) break;
        } while (page <= totalPages);

        const filtrado = acumulado.filter((item) => item.estado_presencia);
        setAsistencias(filtrado);
      } catch (e) {
        console.error('Error al cargar asistencias', e);
        setError('No se pudieron cargar los datos de asistencia');
      } finally {
        setLoading(false);
      }
    };

    const cargarVisitas = async () => {
      setLoading(true);
      setError(null);
      try {
        const pageSize = 100;
        let page = 1;
        let totalPages = 1;
        let acumulado = [];

        do {
          const response = await visitasService.getAll({
            page,
            limit: pageSize,
            fechaInicio: rango.fechaInicio,
            fechaFin: rango.fechaFin,
            areaId: area?.value,
            motivoVisitaId: motivoVisita?.value,
          });
          const data = response.data?.data || [];
          const pagination = response.data?.pagination;
          totalPages = pagination?.totalPages || 1;
          acumulado = acumulado.concat(data);
          page += 1;
          if (!pagination) break;
        } while (page <= totalPages);

        setVisitas(acumulado);
      } catch (e) {
        console.error('Error al cargar visitas', e);
        setError('No se pudieron cargar los datos de visitas');
      } finally {
        setLoading(false);
      }
    };

    if (tabActiva === 'personal') {
      cargarAsistencias();
    } else {
      cargarVisitas();
    }
  }, [rango.fechaInicio, rango.fechaFin, area, estado, tabActiva, motivoVisita]);

  const horasAsignadasMin = useMemo(() => {
    const horaEntrada = normalizeTime(horaEntradaConfig) || '09:00';
    const entrada = dayjs(`2000-01-01T${horaEntrada}`);
    const salidaProgramada = dayjs(`2000-01-01T17:00`);
    const diff = salidaProgramada.diff(entrada, 'minute');
    return Math.max(diff - 60, 0); // descansa 1h
  }, [horaEntradaConfig]);

  const {
    filasTabla,
    resumen,
    areaChart,
    registrosPorPersonal,
  } = useMemo(() => {
    const personas = new Map();
    const areasAgg = new Map();
    let totalRegistros = 0;
    let presentes = 0;
    let tardanzas = 0;
    let ausentes = 0;
    let permisos = 0;
    let minutosTardanzaTotal = 0;
    const ingresosGlobal = [];
    const salidasGlobal = [];

    asistencias.forEach((item) => {
      const estadoValor = (item.estado_presencia || '').toLowerCase();
      if (!estadoValor) return;

      const personaId = item.personal_id;
      if (!personas.has(personaId)) {
        personas.set(personaId, {
          personalId: personaId,
          nombre: `${item.personal_nombres || ''} ${item.personal_apellidos || ''}`.trim(),
          documento: `${item.personal_tipo_documento || ''} ${item.personal_numero_documento || ''}`.trim(),
          area: item.area_nombre || 'Sin área',
          presentes: 0,
          tardanzas: 0,
          ausencias: 0,
          permisos: 0,
          minutosTardanza: 0,
          horasTrabajadasMin: 0,
          diasConHoras: 0,
          ingresos: [],
          salidas: [],
          registros: [],
        });
      }

      const persona = personas.get(personaId);
      persona.registros.push(item);
      totalRegistros += 1;

      if (estadoValor === 'presente') {
        persona.presentes += 1;
        presentes += 1;
      } else if (estadoValor === 'tardanza') {
        persona.tardanzas += 1;
        tardanzas += 1;
      } else if (estadoValor === 'permiso') {
        persona.permisos += 1;
        permisos += 1;
      } else {
        persona.ausencias += 1;
        ausentes += 1;
      }

      const minutosT = parseInt(item.minutos_tardanza || 0, 10);
      persona.minutosTardanza += minutosT;
      minutosTardanzaTotal += minutosT;

      const trabajado = calcularHorasTrabajadas(item.hora_ingreso, item.hora_salida);
      if (trabajado !== null) {
        persona.horasTrabajadasMin += trabajado;
        persona.diasConHoras += 1;
      }

      const ingreso = normalizeTime(item.hora_ingreso);
      const salida = normalizeTime(item.hora_salida);
      if (ingreso) {
        const mins = dayjs(`2000-01-01T${ingreso}`).diff(dayjs(`2000-01-01T00:00`), 'minute');
        persona.ingresos.push(mins);
        ingresosGlobal.push(mins);
      }
      if (salida) {
        const mins = dayjs(`2000-01-01T${salida}`).diff(dayjs(`2000-01-01T00:00`), 'minute');
        persona.salidas.push(mins);
        salidasGlobal.push(mins);
      }

      const areaNombre = item.area_nombre || 'Sin área';
      if (!areasAgg.has(areaNombre)) {
        areasAgg.set(areaNombre, { area: areaNombre, presente: 0, tardanza: 0, ausente: 0, permiso: 0 });
      }
      const areaItem = areasAgg.get(areaNombre);
      if (estadoValor === 'presente') areaItem.presente += 1;
      else if (estadoValor === 'tardanza') areaItem.tardanza += 1;
      else if (estadoValor === 'permiso') areaItem.permiso += 1;
      else areaItem.ausente += 1;
    });

    const filas = Array.from(personas.values()).map((p) => {
      const totalDias = p.presentes + p.tardanzas + p.ausencias + p.permisos;
      const asistencia =
        totalDias > 0
          ? ((p.presentes + p.tardanzas + p.permisos) / totalDias) * 100
          : 0;
      const promedioHoras =
        p.diasConHoras > 0 ? p.horasTrabajadasMin / 60 / p.diasConHoras : 0;
      const promedioEntrada =
        p.ingresos.length > 0
          ? formatHHMM(p.ingresos.reduce((a, b) => a + b, 0) / p.ingresos.length)
          : '-';
      const promedioSalida =
        p.salidas.length > 0
          ? formatHHMM(p.salidas.reduce((a, b) => a + b, 0) / p.salidas.length)
          : '-';

      return {
        ...p,
        porcentajeAsistencia: asistencia,
        promedioHoras,
        promedioEntrada,
        promedioSalida,
      };
    }).sort((a, b) => a.nombre.localeCompare(b.nombre));

    const areaData = Array.from(areasAgg.values());
    const resumenData = {
      totalRegistros,
      presentes,
      tardanzas,
      ausentes,
      permisos,
      minutosTardanzaTotal,
      promedioEntradaGlobal: ingresosGlobal.length > 0 ? formatHHMM(ingresosGlobal.reduce((a, b) => a + b, 0) / ingresosGlobal.length) : '-',
      promedioSalidaGlobal: salidasGlobal.length > 0 ? formatHHMM(salidasGlobal.reduce((a, b) => a + b, 0) / salidasGlobal.length) : '-',
    };

    return {
      filasTabla: filas,
      resumen: resumenData,
      areaChart: areaData,
      registrosPorPersonal: personas,
    };
  }, [asistencias]);

  const horasTardanza = useMemo(
    () => Number((((resumen?.minutosTardanzaTotal || 0) / 60)).toFixed(1)),
    [resumen?.minutosTardanzaTotal]
  );

  const exportarDetallePersonal = async (row) => {
    const registros = registrosPorPersonal.get(row.personalId)?.registros || [];
    if (!registros.length) {
      toast.error('No hay datos para exportar este personal');
      return;
    }

    try {
      const { default: ExcelJS } = await import('exceljs');
      const { saveAs } = await import('file-saver');
      const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Detalle diario');
      const periodoTexto = rango.etiqueta;
      const fechaGeneracion = formatFechaReporte();

      const columnasDetalle = [
        { header: 'N°', key: 'n', width: 6 },
        { header: 'Fecha', key: 'fecha', width: 12 },
        { header: 'Día', key: 'dia', width: 14 },
        { header: 'Hora entrada (config)', key: 'horaConfig', width: 22 },
        { header: 'Salida programada', key: 'salidaProg', width: 20 },
        { header: 'Entrada real', key: 'entradaReal', width: 16 },
        { header: 'Salida real', key: 'salidaReal', width: 16 },
        { header: 'Horas asignadas', key: 'horasAsignadas', width: 18 },
        { header: 'Horas trabajadas', key: 'horasTrabajadas', width: 18 },
        { header: 'Min. retraso', key: 'minRetraso', width: 14 },
        { header: 'Estado', key: 'estado', width: 14 },
      ];

      // Define columns first WITHOUT headers to avoid overwriting row 1
      sheet.columns = columnasDetalle.map(c => ({ key: c.key, width: c.width }));

      sheet.mergeCells('A1:K1');
      sheet.getCell('A1').value = `Resumen de asistencia (${periodoTexto}) - ${row.nombre}`;
      sheet.getCell('A1').font = { size: 16, bold: true };

      sheet.mergeCells('A2:K2');
      sheet.getCell('A2').value = `Periodo comprendido: ${rango.rangoTexto}`;
      sheet.getCell('A3').value = `Generado: ${fechaGeneracion}`;
      sheet.getCell('A3').font = { italic: true };
      sheet.addRow([]);

      // Cabecera visible y con estilos
      const headerRow = sheet.addRow(columnasDetalle.map((c) => c.header));
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2563EB' },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      const registrosOrdenados = [...registros].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      const horasAsignadasTxt = formatHoursFromMinutes(horasAsignadasMin);

      let totalHorasTrabajadas = 0;
      let totalMinRetraso = 0;
      let diasAsistidos = 0;
      let diasTarde = 0;
      let diasAusente = 0;
      let diasPermiso = 0;
      const entradasMin = [];
      const salidasMin = [];

      const dataRows = registrosOrdenados.map((registro, idx) => {
        const fecha = dayjs(registro.fecha);
        const worked = calcularHorasTrabajadas(registro.hora_ingreso, registro.hora_salida);
        const estadoTexto = registro.estado_presencia || '';
        const minutosRetraso = registro.minutos_tardanza || 0;
        totalMinRetraso += minutosRetraso;
        if (worked !== null) totalHorasTrabajadas += worked;

        if (estadoTexto.toLowerCase() === 'tardanza') diasTarde += 1;
        else if (estadoTexto.toLowerCase() === 'permiso') diasPermiso += 1;
        else if (estadoTexto.toLowerCase() === 'ausente') diasAusente += 1;
        else if (estadoTexto.toLowerCase() === 'presente') diasAsistidos += 1;

        const ingreso = normalizeTime(registro.hora_ingreso);
        const salida = normalizeTime(registro.hora_salida);
        if (ingreso) entradasMin.push(dayjs(`2000-01-01T${ingreso}`).diff(dayjs('2000-01-01T00:00'), 'minute'));
        if (salida) salidasMin.push(dayjs(`2000-01-01T${salida}`).diff(dayjs('2000-01-01T00:00'), 'minute'));

        return {
          n: idx + 1,
          fecha: fecha.format('DD/MM/YYYY'),
          dia: diasSemana[fecha.day()],
          horaConfig: horaEntradaConfig,
          salidaProg: '17:00',
          entradaReal: ingreso || '-',
          salidaReal: salida || '-',
          horasAsignadas: horasAsignadasTxt,
          horasTrabajadas: worked !== null ? formatHoursFromMinutes(worked) : '-',
          minRetraso: minutosRetraso,
          estado: estadoTexto,
        };
      });

      const excelRows = dataRows.map((r) => sheet.addRow(r));
      excelRows.forEach((row, idx) => {
        const isEven = idx % 2 === 0;
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isEven ? 'FFF8FAFF' : 'FFFFFFFF' },
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          };
        });
      });

      sheet.addRow([]);
      const tablaTotales = sheet.addTable({
        name: 'ResumenTotales',
        ref: `A${sheet.lastRow.number + 1}`,
        columns: [
          { name: 'Concepto' },
          { name: 'Valor' },
        ],
        rows: [
          ['Minutos asignados', `${horasAsignadasMin * registrosOrdenados.length} min`],
          ['Horas/min trabajados', formatHoursFromMinutes(totalHorasTrabajadas)],
          ['Horas/min de atraso', formatHoursFromMinutes(totalMinRetraso)],
          ['Días asistencia', diasAsistidos],
          ['Días tardanza', diasTarde],
          ['Días ausente', diasAusente],
          ['Días permiso', diasPermiso],
          ['Porcentaje de Asistencia', `${row.porcentajeAsistencia.toFixed(1)}%`],
          ['Hora promedio entrada', entradasMin.length ? formatHHMM(entradasMin.reduce((a, b) => a + b, 0) / entradasMin.length) : '-'],
          ['Hora promedio salida', salidasMin.length ? formatHHMM(salidasMin.reduce((a, b) => a + b, 0) / salidasMin.length) : '-'],
        ],
      });
      tablaTotales.style = {
        theme: 'TableStyleLight9',
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const nombreArchivo = `Resumen de asistencia (${rango.etiqueta}) - ${row.nombre}.xlsx`;
      saveAs(blob, nombreArchivo);
      toast.success('Excel generado');
    } catch (e) {
      console.error('Error exportando detalle', e);
      toast.error('No se pudo exportar el detalle');
    }
  };

  const columnas = useMemo(() => [
    {
      key: 'nombre',
      label: 'Nombre',
      minWidth: '220px',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900">{row.nombre || 'Sin nombre'}</span>
          <span className="text-xs text-gray-500">{row.area}</span>
        </div>
      ),
    },
    {
      key: 'documento',
      label: 'Documento',
      minWidth: '120px',
    },
    {
      key: 'porcentajeAsistencia',
      label: '% Asistencia',
      minWidth: '140px',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${Math.min(row.porcentajeAsistencia, 100)}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-gray-800">
            {row.porcentajeAsistencia.toFixed(1)}%
          </span>
        </div>
      ),
    },
    {
      key: 'tardanzas',
      label: 'Tardanzas',
      minWidth: '100px',
      render: (row) => <span className="text-orange-700 font-semibold">{row.tardanzas || 0}</span>,
    },
    {
      key: 'permisos',
      label: 'Permisos',
      minWidth: '90px',
      render: (row) => <span className="text-blue-700 font-semibold">{row.permisos || 0}</span>,
    },
    {
      key: 'ausencias',
      label: 'Ausencias',
      minWidth: '90px',
      render: (row) => <span className="text-red-700 font-semibold">{row.ausencias || 0}</span>,
    },
    {
      key: 'minutosTardanza',
      label: 'Minutos tardanza',
      minWidth: '150px',
      render: (row) => (
        <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${colorTardanza(row.minutosTardanza)}`}>
          {row.minutosTardanza} min
        </span>
      ),
    },
    {
      key: 'promedioHoras',
      label: 'Horas promedio/día',
      minWidth: '170px',
      render: (row) => (
        <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${colorPromedioHoras(row.promedioHoras)}`}>
          {row.promedioHoras ? row.promedioHoras.toFixed(2) : '0.00'} h
        </span>
      ),
    },
    {
      key: 'acciones',
      label: 'Exportar',
      minWidth: '100px',
      render: (row) => (
        <div className="flex justify-start">
          <button
            onClick={() => exportarDetallePersonal(row)}
            className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
            title="Exportar detalle individual"
          >
            <FileSpreadsheet className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ], [exportarDetallePersonal]);

  const exportarVisitaIndividual = async (row) => {
    const registros = (row?.visitas || []).sort((a, b) => new Date(a.fecha_ingreso) - new Date(b.fecha_ingreso));
    if (!registros.length) {
      toast.error('No hay datos de visita para este ciudadano');
      return;
    }
    try {
      const { default: ExcelJS } = await import('exceljs');
      const { saveAs } = await import('file-saver');

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Historial de visitas');

      const cols = [
        { header: 'Fecha', key: 'fecha', width: 14 },
        { header: 'Hora ingreso', key: 'ingreso', width: 16 },
        { header: 'Hora salida', key: 'salida', width: 16 },
        { header: 'Duración', key: 'duracion', width: 14 },
        { header: 'Área visitada', key: 'area', width: 22 },
        { header: 'Personal visitado', key: 'personal', width: 24 },
        { header: 'Motivo', key: 'motivo', width: 20 },
        { header: 'Estado', key: 'estado', width: 16 },
      ];

      // Define columns first WITHOUT headers to avoid overwriting row 1
      sheet.columns = cols.map(c => ({ key: c.key, width: c.width }));

      sheet.mergeCells('A1:H1');
      sheet.getCell('A1').value = `Historial de Visitas - ${row.nombre}`;
      sheet.getCell('A1').font = { size: 16, bold: true };
      sheet.mergeCells('A2:H2');
      sheet.getCell('A2').value = `Documento: ${row.tipoDocumento} ${row.numeroDocumento}`;
      sheet.mergeCells('A3:H3');
      sheet.getCell('A3').value = `Periodo: ${rango.rangoTexto}`;
      
      const head = sheet.addRow(cols.map((c) => c.header));
      head.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        cell.border = { top: { style: 'thin', color: { argb: 'FFCCCCCC' } }, left: { style: 'thin', color: { argb: 'FFCCCCCC' } }, bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } }, right: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      let totalMinutos = 0;
      const rows = registros.map((v) => {
        const ingreso = v.fecha_ingreso ? dayjs(v.fecha_ingreso) : null;
        const salida = v.fecha_salida ? dayjs(v.fecha_salida) : null;
        const duracionMin = ingreso && salida ? salida.diff(ingreso, 'minute') : 0;
        totalMinutos += duracionMin;
        return {
          fecha: ingreso ? ingreso.format('DD/MM/YYYY') : '-',
          ingreso: ingreso ? ingreso.format('HH:mm') : '-',
          salida: salida ? salida.format('HH:mm') : 'En curso',
          duracion: duracionMin ? formatHoursFromMinutes(duracionMin) : '-',
          area: v.nombre_area || 'Sin área',
          personal: `${v.personal_nombres || ''} ${v.personal_apellidos || ''}`.trim() || 'No especificado',
          motivo: v.nombre_motivo || 'Sin motivo',
          estado: v.estado_visita || v.estado || 'Pendiente',
        };
      });
      const excelRows = rows.map((r) => sheet.addRow(r));
      excelRows.forEach((r, idx) => {
        const isEven = idx % 2 === 0;
        r.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFF8FAFF' : 'FFFFFFFF' } };
          cell.border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
        });
      });

      sheet.addRow([]);
      sheet.addTable({
        name: 'ResumenVisitas',
        ref: `A${sheet.lastRow.number + 1}`,
        columns: [{ name: 'Concepto' }, { name: 'Valor' }],
        rows: [
          ['Total de visitas', registros.length],
          ['Horas totales dentro', formatHoursFromMinutes(totalMinutos)],
        ],
        style: { theme: 'TableStyleLight9' },
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Historial de Visitas - ${row.nombre}.xlsx`);
      toast.success('Excel generado');
    } catch (e) {
      console.error('Error exportando historial', e);
      toast.error('No se pudo exportar el historial');
    }
  };

  const exportarVisitasGlobal = async (formato) => {
    if (!visitas.length) {
      toast.error('No hay datos para exportar');
      return;
    }
    if (formato === 'excel') {
      try {
        const { default: ExcelJS } = await import('exceljs');
        const { saveAs } = await import('file-saver');
        const wb = new ExcelJS.Workbook();
        const resumenSheet = wb.addWorksheet('Resumen');
        resumenSheet.addRow([`Reporte de visitas (${rango.etiqueta})`]).font = { bold: true, size: 14 };
        resumenSheet.addRow([`Periodo: ${rango.rangoTexto}`]);
        resumenSheet.addRow([`Generado: ${formatFechaReporte()}`]);
        resumenSheet.addRow([]);
        resumenSheet.addTable({
          name: 'ResumenVisitasGlobal',
          ref: `A${resumenSheet.lastRow.number + 1}`,
          columns: [{ name: 'Concepto' }, { name: 'Valor' }],
          rows: [
            ['Visitantes distintos', visitasMetricas.visitantesDistintos],
            ['Total visitas', visitasMetricas.totalVisitas],
            ['Visitas rechazadas', visitasMetricas.rechazadas],
            ['Visitas delegadas', visitasMetricas.delegadas],
            ['Visitas finalizadas', visitasMetricas.finalizadas],
            ['Tiempo promedio visita', formatHoursFromMinutes(
              (() => {
                const sum = visitasAgrupadas.reduce((acc, v) => acc + (v.promedioMin || 0), 0);
                return visitasAgrupadas.length ? sum / visitasAgrupadas.length : 0;
              })()
            )],
          ],
          style: { theme: 'TableStyleMedium9' },
        });

        const detalleSheet = wb.addWorksheet('Resumen por visitante');
        const cols = [
          { header: 'Visitante', key: 'visitante', width: 28 },
          { header: 'Total visitas', key: 'total', width: 14 },
          { header: 'Área más visitada', key: 'area', width: 22 },
          { header: 'Último ingreso', key: 'ultimo', width: 18 },
          { header: 'Rechazadas', key: 'rechazadas', width: 14 },
          { header: 'Delegadas', key: 'delegadas', width: 14 },
          { header: 'Finalizadas', key: 'finalizadas', width: 14 },
          { header: 'Promedio tiempo visita', key: 'promedio', width: 20 },
        ];
        detalleSheet.columns = cols;
        const head = detalleSheet.getRow(1);
        head.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
          cell.border = { top: { style: 'thin', color: { argb: 'FFCCCCCC' } }, left: { style: 'thin', color: { argb: 'FFCCCCCC' } }, bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } }, right: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        visitasAgrupadas.forEach((v, idx) => {
          const row = detalleSheet.addRow({
            visitante: v.nombre,
            total: v.total,
            area: v.areaMasVisitada,
            ultimo: v.ultimoIngreso ? dayjs(v.ultimoIngreso).format('DD/MM/YYYY HH:mm') : '-',
            rechazadas: v.rechazadas || 0,
            delegadas: v.delegadas || 0,
            finalizadas: v.finalizadas || 0,
            promedio: formatHoursFromMinutes(v.promedioMin || 0),
          });
          const isEven = idx % 2 === 0;
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFF8FAFF' : 'FFFFFFFF' } };
            cell.border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
          });
        });

        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `reporte_visitas_${rango.etiqueta}.xlsx`);
        toast.success('Excel generado');
      } catch (e) {
        console.error('Error exportando visitas', e);
        toast.error('No se pudo exportar el reporte');
      }
    } else {
      try {
        const { jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const doc = new jsPDF('p', 'mm', 'a4');
        doc.setFontSize(14);
        doc.text(`Reporte de visitas (${rango.etiqueta})`, 14, 18);
        doc.setFontSize(10);
        doc.text(`Periodo: ${rango.rangoTexto}`, 14, 24);
        doc.text(`Generado: ${formatFechaReporte()}`, 14, 30);

        autoTable(doc, {
          startY: 36,
          head: [['Visitantes distintos', 'Total visitas', 'Rechazadas', 'Delegadas', 'Finalizadas', 'Prom. tiempo visita']],
          body: [[
            visitasMetricas.visitantesDistintos,
            visitasMetricas.totalVisitas,
            visitasMetricas.rechazadas,
            visitasMetricas.delegadas,
            visitasMetricas.finalizadas,
            (() => {
              const sum = visitasAgrupadas.reduce((acc, v) => acc + (v.promedioMin || 0), 0);
              return visitasAgrupadas.length ? formatHoursFromMinutes(sum / visitasAgrupadas.length) : '-';
            })()
          ]],
        });

        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 8,
          head: [['Visitante', 'Total visitas', 'Área más visitada', 'Último ingreso', 'Rechazadas', 'Delegadas', 'Finalizadas', 'Prom. tiempo visita']],
          body: visitasAgrupadas.map((v) => [
            v.nombre,
            v.total,
            v.areaMasVisitada,
            v.ultimoIngreso ? dayjs(v.ultimoIngreso).format('DD/MM/YYYY HH:mm') : '-',
            v.rechazadas || 0,
            v.delegadas || 0,
            v.finalizadas || 0,
            formatHoursFromMinutes(v.promedioMin || 0),
          ]),
          styles: { fontSize: 8 },
        });
        doc.save(`reporte_visitas_${rango.etiqueta}.pdf`);
        toast.success('PDF generado');
      } catch (e) {
        console.error('Error exportando visitas', e);
        toast.error('No se pudo exportar el PDF');
      }
    }
  };

  const exportarTabla = async (formato) => {
    if (!filasTabla.length) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      if (formato === 'excel') {
        const { default: ExcelJS } = await import('exceljs');
        const { saveAs } = await import('file-saver');

        const workbook = new ExcelJS.Workbook();
        const resumenSheet = workbook.addWorksheet('Resumen');
        resumenSheet.addRow([`Reporte de asistencia (${rango.etiqueta})`]).font = { bold: true, size: 14 };
        resumenSheet.addRow([`Periodo: ${rango.rangoTexto}`]);
        resumenSheet.addRow([`Generado: ${formatFechaReporte()}`]);
        resumenSheet.addRow([]);

        const resumenTableStart = resumenSheet.lastRow.number + 1;
        resumenSheet.addTable({
          name: 'ResumenGlobal',
          ref: `A${resumenTableStart}`,
          columns: [
            { name: 'Concepto' },
            { name: 'Valor' },
          ],
          rows: [
            ['Total registros', resumen.totalRegistros],
            ['Presentes', resumen.presentes],
            ['Tardanzas', resumen.tardanzas],
            ['Ausentes', resumen.ausentes],
            ['Permisos', resumen.permisos],
            ['Horas totales de tardanza', formatHoursFromMinutes(resumen.minutosTardanzaTotal)],
            ['Hora promedio entrada', resumen.promedioEntradaGlobal],
            ['Hora promedio salida', resumen.promedioSalidaGlobal],
          ],
          style: { theme: 'TableStyleMedium9' },
        });

        const areaTableRef = `A${resumenSheet.lastRow.number + 3}`;
        resumenSheet.addTable({
          name: 'DistribucionArea',
          ref: areaTableRef,
          columns: [
            { name: 'Área' },
            { name: 'Presente' },
            { name: 'Tardanza' },
            { name: 'Ausente' },
            { name: 'Permiso' },
            { name: 'Total' },
          ],
          rows: areaChart.map((a) => [
            a.area,
            a.presente,
            a.tardanza,
            a.ausente,
            a.permiso,
            a.presente + a.tardanza + a.ausente + a.permiso,
          ]),
          style: { theme: 'TableStyleLight10' },
        });

        const detalleSheet = workbook.addWorksheet('Detalle personal');
        const detalleCols = [
          { header: 'Nombre', key: 'nombre', width: 28 },
          { header: 'Documento', key: 'documento', width: 18 },
          { header: 'Área', key: 'area', width: 18 },
          { header: '% Asistencia', key: 'asistencia', width: 14 },
          { header: 'Tardanzas', key: 'tardanzas', width: 12 },
          { header: 'Permisos', key: 'permisos', width: 12 },
          { header: 'Ausencias', key: 'ausencias', width: 12 },
          { header: 'Minutos tardanza', key: 'minutos', width: 16 },
          { header: 'Horas promedio', key: 'horas', width: 14 },
        ];
        detalleSheet.columns = detalleCols;
        const headerDetalle = detalleSheet.getRow(1);
        headerDetalle.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        const rowsDetalle = filasTabla.map((f) => detalleSheet.addRow({
          nombre: f.nombre,
          documento: f.documento,
          area: f.area,
          asistencia: `${f.porcentajeAsistencia.toFixed(1)}%`,
          tardanzas: f.tardanzas,
          permisos: f.permisos,
          ausencias: f.ausencias,
          minutos: f.minutosTardanza,
          horas: `${f.promedioHoras.toFixed(2)} h`,
        }));

        rowsDetalle.forEach((r, idx) => {
          const isEven = idx % 2 === 0;
          r.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: isEven ? 'FFF8FAFF' : 'FFFFFFFF' },
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            };
          });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `reporte_asistencia_${rango.etiqueta}.xlsx`);
      } else {
        const { jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const doc = new jsPDF('p', 'mm', 'a4');
        doc.setFontSize(14);
        doc.text(`Reporte de asistencia (${rango.etiqueta})`, 14, 18);
        doc.setFontSize(10);
        doc.text(`Periodo: ${rango.rangoTexto}`, 14, 24);
        doc.text(`Generado: ${formatFechaReporte()}`, 14, 30);

        autoTable(doc, {
          startY: 36,
          head: [['Total', 'Presentes', 'Tardanzas', 'Ausentes', 'Permisos', 'Horas tardanza']],
          body: [[
            resumen.totalRegistros,
            resumen.presentes,
            resumen.tardanzas,
            resumen.ausentes,
            resumen.permisos,
            formatHoursFromMinutes(resumen.minutosTardanzaTotal),
          ]],
        });

        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 6,
          head: [['Área', 'Presente', 'Tardanza', 'Ausente', 'Permiso', 'Total']],
          body: areaChart.map((a) => [a.area, a.presente, a.tardanza, a.ausente, a.permiso, a.presente + a.tardanza + a.ausente + a.permiso]),
        });

        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 8,
          head: [['Nombre', 'Documento', 'Área', '% Asist.', 'Tard.', 'Perm.', 'Aus.', 'Min. tardanza', 'Horas prom.']],
          body: filasTabla.map((f) => [
            f.nombre,
            f.documento,
            f.area,
            `${f.porcentajeAsistencia.toFixed(1)}%`,
            f.tardanzas,
            f.permisos,
            f.ausencias,
            f.minutosTardanza,
            `${f.promedioHoras.toFixed(2)} h`,
          ]),
          styles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 22 },
            2: { cellWidth: 25 },
          },
        });

        doc.save(`reporte_asistencia_${rango.etiqueta}.pdf`);
      }
      toast.success('Exportación lista');
    } catch (e) {
      console.error('Error exportando reporte', e);
      toast.error('No se pudo exportar el reporte');
    }
  };

  const renderFiltros = () => {
    const anios = Array.from({ length: 5 }).map((_, idx) => {
      const year = anioActual - idx;
      return { value: year, label: `${year}` };
    });

    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Periodo</span>
          </div>
          <div className="w-28">
            <SelectCustom
              options={periodos}
              value={periodos.find((p) => p.value === periodo)}
              onChange={(val) => setPeriodo(val?.value || 'mes')}
              minMenuWidth="140px"
              menuWidth="auto"
              hideLabel
            />
          </div>

          <div className="w-px h-8 bg-gray-200" />
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Año</span>
            <div className="w-28">
              <SelectCustom
                options={anios}
                value={anios.find((a) => a.value === anio)}
                onChange={(val) => setAnio(val?.value || anioActual)}
                minMenuWidth="120px"
                menuWidth="auto"
                hideLabel
              />
            </div>
          </div>
          
          {periodo !== 'anio' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Mes</span>
              <div className="w-40">
                <SelectCustom
                  options={meses}
                  value={meses.find((m) => m.value === mes)}
                  onChange={(val) => setMes(val?.value || mes)}
                  minMenuWidth="160px"
                  menuWidth="auto"
                  hideLabel
                />
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Área</span>
            <div className="min-w-[200px]">
              <SelectCustom
                options={areasOptions}
                value={area}
                onChange={setArea}
                placeholder="Todas"
                minMenuWidth="200px"
                menuWidth="auto"
                hideLabel
                isClearable
              />
            </div>
          </div>

          {tabActiva === 'visitas' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Motivo visita</span>
              <div className="min-w-[200px]">
                <SelectCustom
                  options={motivosOptions}
                  value={motivoVisita}
                  onChange={setMotivoVisita}
                  placeholder="Todos"
                  minMenuWidth="200px"
                  menuWidth="auto"
                  hideLabel
                  isClearable
                />
              </div>
            </div>
          )}
          
          {tabActiva === 'personal' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Estado</span>
              <div className="w-28">
                <SelectCustom
                  options={estados}
                  value={estado}
                  onChange={setEstado}
                  minMenuWidth="120px"
                  menuWidth="auto"
                  hideLabel
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMetricas = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <KPICard title="Total registros" value={resumen.totalRegistros || 0} icon={Users} loading={loading} colorScheme="blue" />
      <KPICard title="Presente" value={resumen.presentes || 0} icon={FileText} loading={loading} colorScheme="green" />
      <KPICard title="Tardanza" value={resumen.tardanzas || 0} icon={AlertTriangle} loading={loading} colorScheme="orange" />
      <KPICard title="Ausente" value={resumen.ausentes || 0} icon={FileText} loading={loading} colorScheme="purple" />
      <KPICard title="Permisos" value={resumen.permisos || 0} icon={FileText} loading={loading} colorScheme="blue" />
      <KPICard title="Horas tardanza" value={horasTardanza} subtitle="Total de horas acumuladas" icon={Clock3} loading={loading} colorScheme="green" />
    </div>
  );

  const renderMetricasVisitas = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      <KPICard title="Visitantes" value={visitasMetricas.visitantesDistintos} icon={Users} loading={loading} colorScheme="blue" />
      <KPICard title="Visitas" value={visitasMetricas.totalVisitas} icon={FileText} loading={loading} colorScheme="green" />
      <KPICard title="Rechazadas" value={visitasMetricas.rechazadas} icon={AlertTriangle} loading={loading} colorScheme="orange" />
      <KPICard title="Delegadas" value={visitasMetricas.delegadas} icon={Clock3} loading={loading} colorScheme="purple" />
      <KPICard title="Finalizadas" value={visitasMetricas.finalizadas} icon={FileText} loading={loading} colorScheme="green" />
    </div>
  );

  const renderGraficoAreas = () => (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">Estado por área</p>
          <p className="text-xs text-gray-500">Distribución de presencia, tardanza, permisos y ausencias</p>
        </div>
        <PieChartIcon className="h-5 w-5 text-blue-600" />
      </div>
      <div className="w-full" style={{ height: 320 }}>
        {areaChart.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            No hay datos para el rango seleccionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={areaChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="area" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip formatter={(value, name) => [value, name]} />
              <Legend />
              <Bar dataKey="presente" stackId="a" fill="#22c55e" name="Presente" />
              <Bar dataKey="tardanza" stackId="a" fill="#f97316" name="Tardanza" />
              <Bar dataKey="permiso" stackId="a" fill="#3b82f6" name="Permiso" />
              <Bar dataKey="ausente" stackId="a" fill="#ef4444" name="Ausente" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );

  const renderGraficosVisitas = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">Visitas por motivo</p>
            <p className="text-xs text-gray-500">Distribución de motivos en el periodo seleccionado</p>
          </div>
          <PieChartIcon className="h-5 w-5 text-blue-600" />
        </div>
        <div style={{ height: 320 }}>
          {visitasPorMotivo.labels.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={visitasPorMotivo.labels.map((l, i) => ({ name: l, value: visitasPorMotivo.data[i] }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120}>
                  {visitasPorMotivo.labels.map((_, idx) => (
                    <Cell key={idx} fill={['#2563EB', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'][idx % 5]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">Afluencia por área de destino</p>
            <p className="text-xs text-gray-500">Volumen de visitas por área</p>
          </div>
          <PieChartIcon className="h-5 w-5 text-blue-600" />
        </div>
        <div style={{ height: 320 }}>
          {visitasPorArea.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitasPorArea}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="area" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#2563EB" name="Visitas" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );

  const renderTablaPersonal = () => (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Reporte del personal</h3>
          <p className="text-sm text-gray-500">Filtro activo: {rango.rangoTexto}</p>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            onExportExcel={() => exportarTabla('excel')}
            onExportPdf={() => exportarTabla('pdf')}
          />
        </div>
      </div>
      <TableGenerica
        columns={columnas}
        data={filasTabla}
        isLoading={loading}
        emptyMessage="No hay datos para los filtros seleccionados"
        pagination
        itemsPerPage={10}
        minTableWidth="1200px"
        searchable
        searchPlaceholder="Buscar personal..."
      />
    </div>
  );

  const renderTablaVisitas = () => (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Reporte de visitas</h3>
          <p className="text-sm text-gray-500">Filtro activo: {rango.rangoTexto}</p>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            onExportExcel={() => exportarVisitasGlobal('excel')}
            onExportPdf={() => exportarVisitasGlobal('pdf')}
          />
        </div>
      </div>
      <TableGenerica
        columns={visitasColumns}
        data={visitasAgrupadas}
        isLoading={loading}
        emptyMessage="No hay visitas para los filtros seleccionados"
        pagination
        itemsPerPage={10}
        minTableWidth="1200px"
        searchable
        searchPlaceholder="Buscar visitante..."
      />
    </div>
  );

  // ---- VISITAS ----
  const visitasAgrupadas = useMemo(() => {
    const mapa = new Map();
    visitas.forEach((v) => {
      const id = v.visitante_id || v.id_visitante || v.id;
      if (!id) return;
      if (!mapa.has(id)) {
        mapa.set(id, {
          visitanteId: id,
          nombre: `${v.visitante_nombres || ''} ${v.visitante_apellidos || ''}`.trim() || 'Sin nombre',
          tipoDocumento: v.tipo_documento_codigo || v.tipo_documento || 'DNI',
      numeroDocumento: v.numero_documento || v.visitante_numero_documento || '',
      visitas: [],
      areasContador: {},
      rechazadas: 0,
      delegadas: 0,
      finalizadas: 0,
      acumuladoDuracion: 0,
      conteoDuracion: 0,
    });
  }
  const ref = mapa.get(id);
  ref.visitas.push(v);
  const area = v.nombre_area || v.area_destino || 'Sin área';
  ref.areasContador[area] = (ref.areasContador[area] || 0) + 1;

  const estadoTexto = (v.estado_visita || v.estado || '').toLowerCase();
  if (estadoTexto.includes('rechaz')) ref.rechazadas += 1;
  if (estadoTexto.includes('deleg')) ref.delegadas += 1;
  if (estadoTexto.includes('final')) ref.finalizadas += 1;

  const ingreso = v.fecha_ingreso ? dayjs(v.fecha_ingreso) : null;
  const salida = v.fecha_salida ? dayjs(v.fecha_salida) : null;
  if (ingreso && salida) {
    const dur = salida.diff(ingreso, 'minute');
    if (dur >= 0) {
      ref.acumuladoDuracion += dur;
      ref.conteoDuracion += 1;
    }
  }
});

return Array.from(mapa.values()).map((p) => {
  const total = p.visitas.length;
const areaMasVisitada = Object.entries(p.areasContador).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sin área';
const ultimoIngreso = p.visitas
  .map((v) => v.fecha_ingreso)
  .filter(Boolean)
  .sort((a, b) => new Date(b) - new Date(a))[0];
const promedioMin = p.conteoDuracion > 0 ? p.acumuladoDuracion / p.conteoDuracion : 0;
return {
  ...p,
  total,
  areaMasVisitada,
  ultimoIngreso,
  promedioMin,
};
}).sort((a, b) => a.nombre.localeCompare(b.nombre));
}, [visitas]);

const visitasMetricas = useMemo(() => {
  const totalVisitas = visitas.length;
  const visitantesDistintos = new Set(visitas.map((v) => v.visitante_id || v.id_visitante || v.id)).size;
  const rechazadas = visitas.filter((v) => {
    const est = (v.estado_visita || v.estado || '').toLowerCase();
    return est.includes('rechaz');
  }).length;
  const delegadas = visitas.filter((v) => {
    const est = (v.estado_visita || v.estado || '').toLowerCase();
    return est.includes('deleg');
  }).length;
  const finalizadas = visitas.filter((v) => {
    const est = (v.estado_visita || v.estado || '').toLowerCase();
    return est.includes('final');
  }).length;
  return { totalVisitas, visitantesDistintos, rechazadas, delegadas, finalizadas };
}, [visitas]);

  const visitasPorMotivo = useMemo(() => {
    const counts = {};
    visitas.forEach((v) => {
      const key = v.nombre_motivo || 'Sin motivo';
      counts[key] = (counts[key] || 0) + 1;
    });
    const labels = Object.keys(counts);
    const data = labels.map((k) => counts[k]);
    return { labels, data };
  }, [visitas]);

  const visitasPorArea = useMemo(() => {
    const counts = {};
    visitas.forEach((v) => {
      const key = v.nombre_area || 'Sin área';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([area, total]) => ({ area, total }));
  }, [visitas]);

  const colorFrecuencia = (total) => {
    if (total <= 1) return 'bg-green-50 text-green-700 border-green-200';
    if (total <= 4) return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  const visitasColumns = [
    {
      key: 'nombre',
      label: 'Visitante',
      minWidth: '220px',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900">{row.nombre}</span>
          <span className="text-xs text-gray-500">{row.tipoDocumento}: {row.numeroDocumento}</span>
        </div>
      ),
    },
    {
      key: 'total',
      label: 'Total visitas',
      minWidth: '100px',
      render: (row) => (
        <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${colorFrecuencia(row.total)}`}>
          {row.total} visita{row.total !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      key: 'areaMasVisitada',
      label: 'Área más visitada',
      minWidth: '180px',
    },
    {
      key: 'ultimoIngreso',
      label: 'Último ingreso',
      minWidth: '160px',
      render: (row) => row.ultimoIngreso ? dayjs(row.ultimoIngreso).format('DD/MM/YYYY HH:mm') : '-',
    },
    {
      key: 'promedioMin',
      label: 'Promedio tiempo visita',
      minWidth: '150px',
      render: (row) => formatHoursFromMinutes(row.promedioMin || 0),
    },
    
    {
      key: 'rechazadas',
      label: 'Rechazadas',
      minWidth: '100px',
      render: (row) => <span className="text-red-700 font-semibold">{row.rechazadas || 0}</span>,
    },
    {
      key: 'delegadas',
      label: 'Delegadas',
      minWidth: '100px',
      render: (row) => <span className="text-blue-700 font-semibold">{row.delegadas || 0}</span>,
    },
    {
      key: 'acciones',
      label: 'Exportar',
      minWidth: '100px',
      render: (row) => (
        <div className="flex justify-start">
          <button
            onClick={() => exportarVisitaIndividual(row)}
            className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
            title="Exportar historial individual"
          >
            <FileSpreadsheet className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const contenidoPersonal = (
    <>
      {renderFiltros()}
      {renderMetricas()}
      {renderGraficoAreas()}
      {renderTablaPersonal()}
    </>
  );

  const contenidoVisitas = (
    <>
      {renderFiltros()}
      {renderMetricasVisitas()}
      {renderGraficosVisitas()}
      {renderTablaVisitas()}
    </>
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes de personal y visitas</h1>
          <p className="text-sm text-gray-500">Revisa el rendimiento por estado, exporta tablas y descarga el detalle individual.</p>
        </div>
        {loading && (
          <div className="inline-flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando datos...
          </div>
        )}
      </div>

      <TabView
        tabs={[
          { key: 'personal', label: 'Reportes de personal' },
          { key: 'visitas', label: 'Reportes de visitas' },
        ]}
        activeTab={tabActiva}
        onTabChange={setTabActiva}
      >
        {{
          personal: error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          ) : contenidoPersonal,
          visitas: contenidoVisitas,
        }}
      </TabView>
    </div>
  );
};

export default ReportesRRHHPage;
