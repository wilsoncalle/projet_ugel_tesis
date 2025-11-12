import CatalogoPage from '../components/CatalogoPage';
import Input from '../components/Input';
import { motivosSalidaService } from '../services/api';
import { motivosSalidaFormFields, getTableColumns, transformMotivosSalida, transformMotivosSalidaToBackend } from '../config/formFields.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const MotivosSalidaPage = () => {
  useDocumentTitle('Motivos de Salida - COAC-UGEL');
  const tableColumns = getTableColumns('motivosSalida');

  return (
    <CatalogoPage
      title="Motivos de Salida"
      description="Administre los motivos de salida del personal"
      service={motivosSalidaService}
      formFields={[
        {
          ...motivosSalidaFormFields[0],
          // Usar el mismo Input reutilizable de RegistroForm
          render: ({ value, onChange, error }) => (
            <div>
              <Input
                label="Motivo de Salida"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Ingrese el motivo de salida"
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
      moduleName="Motivo de Salida"
      transformData={transformMotivosSalida}
      transformDataToBackend={transformMotivosSalidaToBackend}
      onSuccess={(operation, data) => {
        console.log(`${operation} successful:`, data);
      }}
      onError={(operation, error) => {
        console.error(`${operation} failed:`, error);
      }}
    />
  );
};

export default MotivosSalidaPage;