import CatalogoPage from '../components/CatalogoPage';
import { areasService } from '../services/api';
import { areasFormFields, getTableColumns, transformAreas, transformAreasToBackend } from '../config/formFields.jsx';

const AreasPage = () => {
  const tableColumns = getTableColumns('areas');

  return (
    <CatalogoPage
      title="Áreas"
      description="Administre las áreas de la institución"
      service={areasService}
      formFields={areasFormFields}
      tableColumns={tableColumns}
      moduleName="Área"
      transformData={transformAreas}
      transformDataToBackend={transformAreasToBackend}
      onSuccess={(operation, data) => {
        console.log(`${operation} successful:`, data);
      }}
      onError={(operation, error) => {
        console.error(`${operation} failed:`, error);
      }}
    />
  );
};

export default AreasPage;
