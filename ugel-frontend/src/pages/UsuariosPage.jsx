import React from 'react';
import CatalogoPage from '../components/CatalogoPage';
import Input from '../components/Input';
import SelectCustom from '../components/SelectCustom';
import { usuariosService } from '../services/api';
import { usuariosFormFields, getTableColumns, transformUsuarios, transformUsuariosToBackend } from '../config/formFields.jsx';

const UsuariosPage = () => {
  const tableColumns = getTableColumns('usuarios');

  // Render fields with shared components
  const renderedFields = usuariosFormFields.map(field => {
    if (['nombre_usuario', 'email', 'hash_contrasena'].includes(field.name)) {
      const labels = {
        nombre_usuario: 'Nombre de Usuario',
        email: 'Correo Electrónico',
        hash_contrasena: 'Contraseña',
      };
      const types = {
        nombre_usuario: 'text',
        email: 'email',
        hash_contrasena: 'password',
      };
      const maxLengths = {
        nombre_usuario: 150,
        email: 150,
        hash_contrasena: 150,
      };
      return {
        ...field,
        render: ({ value, onChange, error }) => (
          <Input
            label={labels[field.name]}
            type={types[field.name]}
            name={field.name}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            maxLength={maxLengths[field.name]}
            autoComplete={
              field.name === 'hash_contrasena'
                ? 'new-password'
                : field.name === 'email'
                ? 'off'
                : 'off'
            }
            error={error}
          />
        )
      };
    }

    if (field.name === 'rol') {
      return {
        ...field,
        render: ({ value, onChange, error, field: fullField }) => (
          <div>
            <SelectCustom
              label="Rol"
              value={(fullField.options || []).find(opt => opt.value === value) || null}
              onChange={(selected) => onChange(selected?.value || '')}
              options={fullField.options || []}
              placeholder="Seleccione rol"
              isSearchable={false}
            />
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>
        )
      };
    }

    return field;
  });

  return (
    <CatalogoPage
      title="Gestión de Usuarios"
      description="Cree y administre usuarios del sistema"
      service={usuariosService}
      formFields={renderedFields}
      tableColumns={tableColumns}
      moduleName="Usuario"
      transformData={transformUsuarios}
      transformDataToBackend={transformUsuariosToBackend}
      onSuccess={(operation, data) => {
        console.log(`${operation} successful:`, data);
      }}
      onError={(operation, error) => {
        console.error(`${operation} failed:`, error);
      }}
      showSoftDelete={true}
    />
  );
};

export default UsuariosPage;


