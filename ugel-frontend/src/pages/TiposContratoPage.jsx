import CatalogoPage from '../components/CatalogoPage';
import { tiposContratoService } from '../services/api';
import { tiposContratoFormFields, getTableColumns, transformTiposContrato, transformTiposContratoToBackend } from '../config/formFields.jsx';

const TiposContratoPage = () => {
  const tableColumns = getTableColumns('tiposContrato');

  return (
    <CatalogoPage
      title="Tipos de Contrato"
      description="Administre los tipos de contrato del personal"
      service={tiposContratoService}
      formFields={tiposContratoFormFields}
      tableColumns={tableColumns}
      moduleName="Tipo de Contrato"
      transformData={transformTiposContrato}
      transformDataToBackend={transformTiposContratoToBackend}
      onSuccess={(operation, data) => {
        console.log(`${operation} successful:`, data);
      }}
      onError={(operation, error) => {
        console.error(`${operation} failed:`, error);
      }}
    />
  );
};

export default TiposContratoPage;
