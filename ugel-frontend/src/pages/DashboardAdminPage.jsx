import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { areasService, personalService, visitasService } from '../services/api';

// Componente de tarjeta para catálogos
const CatalogCard = ({ title, description, icon, link, count, highlight = false }) => (
  <Link to={link} className="block h-full">
    <Card className={`h-full transition-all duration-200 ${highlight ? 'ring-2 ring-primary-500 hover:ring-4' : 'hover:shadow-lg'}`}>
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-center mb-4">
          <div className="bg-primary-100 text-primary-800 p-3 rounded-full">
            {icon}
          </div>
          {count !== undefined && (
            <span className="ml-auto bg-gray-100 text-gray-700 py-1 px-3 rounded-full text-sm font-medium">
              {count}
            </span>
          )}
        </div>
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-500 flex-grow">{description}</p>
        <div className="mt-4 flex items-center text-primary-600 text-sm font-medium">
          <span>Ver catálogo</span>
          <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Card>
  </Link>
);

const DashboardAdminPage = () => {
  const [stats, setStats] = useState({
    totalAreas: 0,
    totalPersonal: 0,
    totalVisitas: 0,
    visitasHoy: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch data in parallel
        const [areasResponse, personalResponse, visitasResponse] = await Promise.all([
          areasService.getAll(),
          personalService.getAll(),
          visitasService.getAll(),
        ]);

        // Ensure data is an array before using array methods
        const areasData = Array.isArray(areasResponse.data) ? areasResponse.data : [];
        const personalData = Array.isArray(personalResponse.data) ? personalResponse.data : [];
        const visitasData = Array.isArray(visitasResponse.data) ? visitasResponse.data : [];
        
        // Calculate stats
        const today = new Date().toISOString().split('T')[0];
        const visitasHoy = visitasData.filter(
          (visita) => visita.fecha_entrada?.startsWith(today)
        );

        setStats({
          totalAreas: areasData.length,
          totalPersonal: personalData.length,
          totalVisitas: visitasData.length,
          visitasHoy: visitasHoy.length,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchDashboardData();
  }, []);

  // Stat card component
  const StatCard = ({ title, value, icon, loading }) => (
    <Card className="flex items-center">
      <div className="p-3 rounded-full bg-primary-100 text-primary-800">
        {icon}
      </div>
      <div className="ml-5">
        <div className="text-sm font-medium text-gray-500 truncate">{title}</div>
        <div className="mt-1 text-3xl font-semibold text-gray-900">
          {loading ? (
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            value
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Administrativo</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bienvenido al panel de administración del Sistema de Control de Acceso UGEL
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Áreas"
          value={stats.totalAreas}
          loading={stats.loading}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          }
        />

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
          title="Visitas Totales"
          value={stats.totalVisitas}
          loading={stats.loading}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
        />

        <StatCard
          title="Visitas Hoy"
          value={stats.visitasHoy}
          loading={stats.loading}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
        />
      </div>

      {/* Quick access catalogs */}
      <h2 className="text-xl font-semibold mt-8 mb-4">Acceso Rápido a Catálogos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <CatalogCard 
          title="Áreas" 
          description="Gestione las áreas de la institución"
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          link="/admin/areas"
          count={stats.totalAreas}
        />
        
        <CatalogCard 
          title="Tipos de Documento" 
          description="Configure los tipos de documentos de identidad"
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
          }
          link="/admin/tipos-documento"
        />
        
        <CatalogCard 
          title="Motivos de Visita" 
          description="Administre los motivos de visita"
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          link="/admin/motivos-visita"
        />
        
        <CatalogCard 
          title="Tipos de Contrato" 
          description="Gestione los tipos de contrato de personal"
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          link="/admin/tipos-contrato"
        />
        
        <CatalogCard 
          title="Motivos de Salida" 
          description="Configure motivos de salida para papeletas"
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          }
          link="/admin/motivos-salida"
        />
        
        <CatalogCard 
          title="Catálogos Unificados" 
          description="Acceda a todos los catálogos en una sola página"
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          }
          link="/admin/catalogos"
          highlight={true}
        />
      </div>
      
      {/* Access to other role views */}
      <h2 className="text-xl font-semibold mt-8 mb-4">Pruebas y Supervisión</h2>
      <Card className="border-l-4 border-orange-500 bg-orange-50">
        <div className="p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Vistas de Otros Roles</h3>
          <p className="text-gray-600 mb-4">
            Accede a las vistas de otros roles para verificar su funcionamiento sin necesidad de cambiar de usuario.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/vigilante">
              <Button
                variant="warning"
                leftIcon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
              >
                Ver como Vigilante
              </Button>
            </Link>
            
            <Link to="/rrhh">
              <Button
                variant="outline"
                leftIcon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
              >
                Ver como RRHH
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Additional dashboard content */}
      <h2 className="text-xl font-semibold mt-8 mb-4">Actividad del Sistema</h2>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Actividad Reciente">
          <p className="text-gray-500 p-4">
            Aquí se mostrará un resumen de la actividad reciente en el sistema.
          </p>
        </Card>
        
        <Card title="Estadísticas del Sistema">
          <p className="text-gray-500 p-4">
            Aquí se mostrarán gráficos y estadísticas del uso del sistema.
          </p>
        </Card>
      </div>
    </div>


  );
};

export default DashboardAdminPage;
