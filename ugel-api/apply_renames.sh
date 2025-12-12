
# Define replacements
find src -type f -name "*.js" -print0 | xargs -0 sed -i 's/ControlAsistenciaPersonal/controlasistenciapersonal/g'
find src -type f -name "*.js" -print0 | xargs -0 sed -i 's/RegistrosSalidaPersonal/registrosalidapersonal/g'
find src -type f -name "*.js" -print0 | xargs -0 sed -i 's/MotivosSalidaPersonal/motivosalidapersonal/g'
find src -type f -name "*.js" -print0 | xargs -0 sed -i 's/PapeletasExternas/papeletaexterna/g'
find src -type f -name "*.js" -print0 | xargs -0 sed -i 's/ReniecProveedores/reniecproveedor/g'
find src -type f -name "*.js" -print0 | xargs -0 sed -i 's/AreasDestino/areadestino/g'
find src -type f -name "*.js" -print0 | xargs -0 sed -i 's/TiposContrato/tipocontrato/g'
find src -type f -name "*.js" -print0 | xargs -0 sed -i 's/TiposDocumento/tipodocumento/g'
find src -type f -name "*.js" -print0 | xargs -0 sed -i 's/MotivosVisita/motivovisita/g'
find src -type f -name "*.js" -print0 | xargs -0 sed -i 's/RegistrosVisitas/registrovisita/g'
find src -type f -name "*.js" -print0 | xargs -0 sed -i 's/Cargos/cargo/g'
find src -type f -name "*.js" -print0 | xargs -0 sed -i 's/Usuarios/usuario/g'
find src -type f -name "*.js" -print0 | xargs -0 sed -i 's/Visitantes/visitante/g'
find src -type f -name "*.js" -print0 | xargs -0 sed -i 's/Personal/personal/g'

echo "Replacements complete."
