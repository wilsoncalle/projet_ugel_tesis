import CatalogoPage from '../components/CatalogoPage';
import Input from '../components/Input';
import { tiposContratoService } from '../services/api';
import { tiposContratoFormFields, getTableColumns, transformTiposContrato, transformTiposContratoToBackend } from '../config/formFields.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const TiposContratoPage = () => {
  useDocumentTitle('Tipos de Contrato - COAC-UGEL');
  const tableColumns = getTableColumns('tiposContrato');

  return (
    <CatalogoPage
      title="Tipos de Contrato"
      description="Administre los tipos de contrato del personal"
      service={tiposContratoService}
      formFields={[
        {
          ...tiposContratoFormFields[0],
          // Usar el mismo Input reutilizable de RegistroForm
          render: ({ value, onChange, error }) => (
            <div>
              <Input
                label="Tipo de Contrato"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Ingrese el tipo de contrato"
                maxLength={100}
              />
              {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
              )}
            </div>
          )
        }
      ]}
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