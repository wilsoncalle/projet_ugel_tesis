import CatalogoPage from '../components/CatalogoPage';
import Input from '../components/Input';
import { motivosVisitaService } from '../services/api';
import { motivosVisitaFormFields, getTableColumns, transformMotivosVisita, transformMotivosVisitaToBackend } from '../config/formFields.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const MotivosVisitaPage = () => {
  useDocumentTitle('Motivos de Visita - COAC-UGEL');
  const tableColumns = getTableColumns('motivosVisita');

  return (
    <CatalogoPage
      title="Motivos de Visita"
      description="Administre los motivos de visita a la institución"
      service={motivosVisitaService}
      formFields={[
        {
          ...motivosVisitaFormFields[0],
          // Usar el mismo Input reutilizable de RegistroForm
          render: ({ value, onChange, error }) => (
            <div>
              <Input
                label="Motivo de Visita"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Ingrese el motivo de visita"
                maxLength={150}
              />
              {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
              )}
            </div>
          )
        }
      ]}
      tableColumns={tableColumns}
      moduleName="Motivo de Visita"
      transformData={transformMotivosVisita}
      transformDataToBackend={transformMotivosVisitaToBackend}
      onSuccess={(operation, data) => {
        console.log(`${operation} successful:`, data);
      }}
      onError={(operation, error) => {
        console.error(`${operation} failed:`, error);
      }}
    />
  );
};

export default MotivosVisitaPage;