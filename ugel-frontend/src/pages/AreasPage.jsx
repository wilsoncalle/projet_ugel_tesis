import CatalogoPage from '../components/CatalogoPage';
import Input from '../components/Input';
import { areasService } from '../services/api';
import { areasFormFields, getTableColumns, transformAreas, transformAreasToBackend } from '../config/formFields.jsx';

const AreasPage = () => {
  const tableColumns = getTableColumns('areas');

  return (
    <CatalogoPage
      title="Áreas"
      description="Administre las áreas de la institución"
      service={areasService}
      formFields={[
        {
          ...areasFormFields[0],
          // Usar el mismo Input reutilizable de RegistroForm
          render: ({ value, onChange, error }) => (
            <div>
              <Input
                label="Nombre del Área"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Ingrese el nombre del área"
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
