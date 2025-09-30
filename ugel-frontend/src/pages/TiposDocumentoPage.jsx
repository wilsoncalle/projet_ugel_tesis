import CatalogoPage from '../components/CatalogoPage';
import Input from '../components/Input';
import { tiposDocumentoService } from '../services/api';
import { tiposDocumentoFormFields, getTableColumns, transformTiposDocumento, transformTiposDocumentoToBackend } from '../config/formFields.jsx';

const TiposDocumentoPage = () => {
  const tableColumns = getTableColumns('tiposDocumento');

  return (
    <CatalogoPage
      title="Tipos de Documento"
      description="Administre los tipos de documento de identificación"
      service={tiposDocumentoService}
      formFields={[
        {
          ...tiposDocumentoFormFields[0],
          render: ({ value, onChange, error }) => (
            <div>
              <Input
                label="Código"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Ingrese el código del tipo de documento"
                maxLength={10}
              />
              {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
              )}
            </div>
          )
        },
        {
          ...tiposDocumentoFormFields[1],
          render: ({ value, onChange, error }) => (
            <div>
              <Input
                label="Nombre Completo"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Ingrese el nombre completo del tipo de documento"
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
