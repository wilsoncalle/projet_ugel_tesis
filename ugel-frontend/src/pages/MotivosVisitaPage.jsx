import CatalogoPage from '../components/CatalogoPage';
import { motivosVisitaService } from '../services/api';
import { motivosVisitaFormFields, getTableColumns, transformMotivosVisita, transformMotivosVisitaToBackend } from '../config/formFields.jsx';

const MotivosVisitaPage = () => {
  const tableColumns = getTableColumns('motivosVisita');

  return (
    <CatalogoPage
      title="Motivos de Visita"
      description="Administre los motivos de visita a la institución"
      service={motivosVisitaService}
      formFields={motivosVisitaFormFields}
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
