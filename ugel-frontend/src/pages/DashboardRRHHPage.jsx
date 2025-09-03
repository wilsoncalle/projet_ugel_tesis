import { useState, useEffect } from 'react';
import Card from '../components/Card';
import TableGenerica from '../components/TableGenerica';
import Button from '../components/Button';
import { personalService, papeletasSalidaService } from '../services/api';

const DashboardRRHHPage = () => {
  const [stats, setStats] = useState({
    totalPersonal: 0,
    papeletasPendientes: 0,
    papeletasAprobadas: 0,
    papeletasRechazadas: 0,
    loading: true,
  });

  const [recentPapeletas, setRecentPapeletas] = useState([]);
  const [loadingPapeletas, setLoadingPapeletas] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch data in parallel
        const [personalResponse, papeletasResponse] = await Promise.all([
          personalService.getAll(),
          papeletasSalidaService.getAll(),
        ]);

        // Calculate stats
        const pendientes = papeletasResponse.data.filter(p => p.estado === 'pendiente').length;
        const aprobadas = papeletasResponse.data.filter(p => p.estado === 'aprobada').length;
        const rechazadas = papeletasResponse.data.filter(p => p.estado === 'rechazada').length;

        setStats({
          totalPersonal: personalResponse.data.length,
          papeletasPendientes: pendientes,
          papeletasAprobadas: aprobadas,
          papeletasRechazadas: rechazadas,
          loading: false,
        });

        // Get recent papeletas
        const recent = papeletasResponse.data
          .sort((a, b) => new Date(b.fecha_solicitud) - new Date(a.fecha_solicitud))
          .slice(0, 5);
        
        setRecentPapeletas(recent);
        setLoadingPapeletas(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setStats((prev) => ({ ...prev, loading: false }));
        setLoadingPapeletas(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Stat card component
  const StatCard = ({ title, value, icon, loading, color = 'primary' }) => (
    <Card className="flex items-center">
      <div className={`p-3 rounded-full bg-${color}-100 text-${color}-800`}>
        {icon}
      </div>
      <div className="ml-5">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <p className="mt-1 text-3xl font-semibold text-gray-900">
          {loading ? (
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            value
          )}
        </p>
      </div>
    </Card>
  );

  // Table columns for recent papeletas
  const papeletasColumns = [
    {
      key: 'id',
      title: 'ID',
      className: 'w-16',
    },
    {
      key: 'personal_nombre',
      title: 'Personal',
      render: (_, row) => `${row.personal_nombre || 'Usuario'} ${row.personal_apellido || ''}`,
    },
    {
      key: 'fecha_solicitud',
      title: 'Fecha Solicitud',
      render: (fecha) => new Date(fecha).toLocaleDateString(),
    },
    {
      key: 'motivo',
      title: 'Motivo',
    },
    {
      key: 'estado',
      title: 'Estado',
      render: (estado) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            estado === 'pendiente'
              ? 'bg-yellow-100 text-yellow-800'
              : estado === 'aprobada'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {estado.charAt(0).toUpperCase() + estado.slice(1)}
        </span>
      ),
    },
    {
      key: 'acciones',
      title: 'Acciones',
      render: () => (
        <Button size="sm" variant="outline">
          Ver detalles
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard RRHH</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bienvenido al panel de Recursos Humanos del Sistema de Control de Acceso UGEL
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Personal"
          value={stats.totalPersonal}
          loading={stats.loading}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          }
        />

        <StatCard
          title="Papeletas Pendientes"
          value={stats.papeletasPendientes}
          loading={stats.loading}
          color="yellow"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        <StatCard
          title="Papeletas Aprobadas"
          value={stats.papeletasAprobadas}
          loading={stats.loading}
          color="green"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        <StatCard
          title="Papeletas Rechazadas"
          value={stats.papeletasRechazadas}
          loading={stats.loading}
          color="red"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
      </div>

      <Card title="Papeletas Recientes">
        <TableGenerica
          columns={papeletasColumns}
          data={recentPapeletas}
          isLoading={loadingPapeletas}
          emptyMessage="No hay papeletas de salida recientes"
        />
        <div className="mt-4 flex justify-end">
          <Button variant="outline">Ver todas las papeletas</Button>
        </div>
      </Card>
    </div>
  );
};

export default DashboardRRHHPage;
