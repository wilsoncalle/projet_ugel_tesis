import React, { useEffect, useState } from 'react';
import CatalogoPage from '../components/CatalogoPage';
import Input from '../components/Input';
import SelectCustom from '../components/SelectCustom';
import { usuariosService, personalService } from '../services/api';
import { usuariosFormFields, getTableColumns, transformUsuarios, transformUsuariosToBackend } from '../config/formFields.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const UsuariosPage = () => {
  useDocumentTitle('Gestión de Usuarios - COAC-UGEL');
  const tableColumns = getTableColumns('usuarios');

  // Estado para guardar la lista del personal
  const [personalOptions, setPersonalOptions] = useState([]);
  const [loadingPersonal, setLoadingPersonal] = useState(true);

  // Effect para cargar la lista de personal al abrir la página
  useEffect(() => {
    const loadPersonal = async () => {
      try {
        // Cargar personal igual que en RegistroForm.jsx (sin parámetros)
        const res = await personalService.getAll();
        
        // El backend devuelve: { success: true, data: [...], pagination: {...} }
        const data = res?.data?.data || res?.data || [];

        // Filtrar solo personal activo en el frontend
        const personalActivo = data.filter(p => p.activo !== false);

        const options = personalActivo.map(p => ({
          value: p.id,
          label: `${p.nombres} ${p.apellidos} (${p.numero_documento || 's/doc'})`
        }));

        setPersonalOptions(options);
      } catch (err) {
        console.error("Error cargando la lista de personal:", err);
        console.error("Error details:", err.response?.data || err.message);
      } finally {
        setLoadingPersonal(false);
      }
    };

    loadPersonal();
  }, []); // El array vacío asegura que solo se ejecute una vez

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
        hash_contrasena: 255,
      };
      
      // Para el campo de contraseña, agregar indicador de longitud
      if (field.name === 'hash_contrasena') {
        return {
          ...field,
          render: ({ value, onChange, error }) => {
            const passwordLength = (value || '').length;
            const minLength = 8;
            const maxLength = 255;
            const isValidLength = passwordLength >= minLength && passwordLength <= maxLength;
            
            return (
              <div>
                <Input
                  label={labels[field.name]}
                  type={types[field.name]}
                  name={field.name}
                  value={value || ''}
                  onChange={(e) => onChange(e.target.value)}
                  maxLength={maxLengths[field.name]}
                  placeholder={field.placeholder}
                  autoComplete="new-password"
                  error={error}
                />
                {/* Indicador de longitud de contraseña */}
                {value && (
                  <div className="mt-1 flex items-center justify-between">
                    <span className={`text-xs ${
                      passwordLength < minLength 
                        ? 'text-red-600' 
                        : passwordLength > maxLength 
                        ? 'text-red-600' 
                        : 'text-gray-600'
                    }`}>
                      {passwordLength < minLength 
                        ? `Mínimo ${minLength} caracteres (${passwordLength}/${minLength})`
                        : `${passwordLength} / ${maxLength} caracteres`
                      }
                    </span>
                    {isValidLength && passwordLength >= minLength && (
                      <span className="text-xs text-green-600">✓</span>
                    )}
                  </div>
                )}
                {/* Mensaje de ayuda */}
                {!value && (
                  <p className="mt-1 text-xs text-gray-500">
                    Mínimo {minLength} caracteres, máximo {maxLength} caracteres
                  </p>
                )}
              </div>
            );
          }
        };
      }
      
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
            placeholder={field.placeholder}
            autoComplete={
              field.name === 'email'
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

    // Renderizar el campo 'personal_id'
    if (field.name === 'personal_id') {
      return {
        ...field,
        render: ({ value, onChange, error }) => (
          <div>
            <SelectCustom
              label="Personal Vinculado"
              // Busca la opción actual en base al 'value' (que será el ID)
              value={personalOptions.find(opt => opt.value === value) || null}
              // Al cambiar, guardamos solo el 'value' (el ID)
              onChange={(selected) => onChange(selected?.value || null)}
              options={personalOptions}
              placeholder="Seleccione un trabajador..."
              isLoading={loadingPersonal}
              isSearchable={true}
              isClearable={true} // Para poder desvincular (enviar null)
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


