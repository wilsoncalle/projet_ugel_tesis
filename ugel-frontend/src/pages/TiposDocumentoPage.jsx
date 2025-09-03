import CatalogoPage from '../components/CatalogoPage';
import { tiposDocumentoService } from '../services/api';
import { tiposDocumentoFormFields, getTableColumns, transformTiposDocumento, transformTiposDocumentoToBackend } from '../config/formFields.jsx';

const TiposDocumentoPage = () => {
  const tableColumns = getTableColumns('tiposDocumento');

  return (
    <CatalogoPage
      title="Tipos de Documento"
      description="Administre los tipos de documento de identificación"
      service={tiposDocumentoService}
      formFields={tiposDocumentoFormFields}
      tableColumns={tableColumns}
      moduleName="Tipo de Documento"
      transformData={transformTiposDocumento}
      transformDataToBackend={transformTiposDocumentoToBackend}
      onSuccess={(operation, data) => {
        console.log(`${operation} successful:`, data);
      }}
      onError={(operation, error) => {
        console.error(`${operation} failed:`, error);
      }}
    />
  );
};

export default TiposDocumentoPage;
