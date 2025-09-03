import CatalogoPage from '../components/CatalogoPage';
import { motivosSalidaService } from '../services/api';
import { motivosSalidaFormFields, getTableColumns, transformMotivosSalida, transformMotivosSalidaToBackend } from '../config/formFields.jsx';

const MotivosSalidaPage = () => {
  const tableColumns = getTableColumns('motivosSalida');

  return (
    <CatalogoPage
      title="Motivos de Salida"
      description="Administre los motivos de salida del personal"
      service={motivosSalidaService}
      formFields={motivosSalidaFormFields}
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
