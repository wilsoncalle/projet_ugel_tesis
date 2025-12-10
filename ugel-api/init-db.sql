-- Esquema de la base de datos para el Sistema Integral de Control de Acceso - UGEL Talara
-- Versión base (13 tablas principales)

-- ============================================
-- 1. TABLAS DE CATÁLOGO BÁSICAS
-- ============================================

CREATE TABLE IF NOT EXISTS AreasDestino (
    id SERIAL PRIMARY KEY,
    nombre_area VARCHAR(150) NOT NULL UNIQUE,
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS TiposContrato (
    id SERIAL PRIMARY KEY,
    nombre_tipo VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS TiposDocumento (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    nombre_completo VARCHAR(100) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS MotivosVisita (
    id SERIAL PRIMARY KEY,
    nombre_motivo VARCHAR(150) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS MotivosSalidaPersonal (
    id SERIAL PRIMARY KEY,
    nombre_motivo VARCHAR(150) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================
-- 2. GESTIÓN DE CARGOS
-- ============================================

CREATE TABLE IF NOT EXISTS Cargos (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_cargo VARCHAR(150) NOT NULL UNIQUE,
    descripcion TEXT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    -- Nota: ya no está vinculado directamente a AreasDestino
);

-- ============================================
-- 3. GESTIÓN DE PERSONAL INTERNO
-- ============================================

CREATE TABLE IF NOT EXISTS Personal (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_documento VARCHAR(10) NOT NULL,
    numero_documento VARCHAR(20) NOT NULL,
    nombres VARCHAR(150) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    area_destino_id INT NOT NULL,
    tipo_contrato_id INT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    cargo_id INT NULL,
    fecha_nacimiento DATE NULL,
    email VARCHAR(150) NULL,
    CONSTRAINT uq_personal_documento UNIQUE (tipo_documento, numero_documento),
    CONSTRAINT fk_personal_area_destino
        FOREIGN KEY (area_destino_id) REFERENCES AreasDestino(id),
    CONSTRAINT fk_personal_tipo_contrato
        FOREIGN KEY (tipo_contrato_id) REFERENCES TiposContrato(id),
    CONSTRAINT fk_personal_cargo
        FOREIGN KEY (cargo_id) REFERENCES Cargos(id)
);

-- ============================================
-- 4. GESTIÓN DE USUARIOS DEL SISTEMA
-- ============================================

CREATE TABLE IF NOT EXISTS Usuarios (
    id SERIAL PRIMARY KEY,
    nombre_usuario VARCHAR(100) NOT NULL UNIQUE,
    hash_contrasena VARCHAR(255) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    rol VARCHAR(20) NOT NULL, -- "Vigilante", "Administrador", "RRHH"
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    personal_id INT NULL,
    es_sistema BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    intentos_fallidos INT NOT NULL DEFAULT 0,
    bloqueado_hasta TIMESTAMP NULL,
    ultimo_intento_fallido TIMESTAMP NULL,
    CONSTRAINT fk_usuarios_personal
        FOREIGN KEY (personal_id) REFERENCES Personal(id)
        ON UPDATE CASCADE ON DELETE SET NULL
);

-- ============================================
-- 5. GESTIÓN DE VISITANTES
-- ============================================

CREATE TABLE IF NOT EXISTS Visitantes (
    id BIGSERIAL PRIMARY KEY,
    tipo_documento_id INT NOT NULL,
    numero_documento VARCHAR(20) NOT NULL,
    nombres VARCHAR(150) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    fecha_ultima_actualizacion_api TIMESTAMP NULL,
    CONSTRAINT uq_visitantes_documento UNIQUE (tipo_documento_id, numero_documento),
    CONSTRAINT fk_visitantes_tipo_documento
        FOREIGN KEY (tipo_documento_id) REFERENCES TiposDocumento(id)
);

-- ============================================
-- 6. MÓDULO DE REGISTRO DE VISITAS
-- ============================================

CREATE TABLE IF NOT EXISTS RegistrosVisitas (
    id BIGSERIAL PRIMARY KEY,
    visitante_id BIGINT NOT NULL,
    area_destino_id INT NOT NULL,
    personal_visitado_id INT NULL,
    motivo_visita_id INT NOT NULL,
    fecha_ingreso TIMESTAMP NOT NULL,
    fecha_salida TIMESTAMP NULL,
    usuario_ingreso_id INT NOT NULL,
    usuario_salida_id INT NULL,
    sync_id VARCHAR(255) NULL,
    estado_visita VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE, ACEPTADA, RECHAZADA, FINALIZADA
    fecha_aceptacion TIMESTAMP NULL,
    fecha_rechazo TIMESTAMP NULL,
    motivo_rechazo TEXT NULL,
    delegado_por_id INT NULL,
    fecha_delegacion TIMESTAMP NULL,
    fecha_limite_ingreso TIMESTAMP NULL,
    fecha_limite_salida TIMESTAMP NULL,
    fecha_fin_atencion TIMESTAMP NULL,
    CONSTRAINT uq_registrosvisitas_sync_id UNIQUE (sync_id),
    CONSTRAINT fk_registrosvisitas_visitante
        FOREIGN KEY (visitante_id) REFERENCES Visitantes(id),
    CONSTRAINT fk_registrosvisitas_area_destino
        FOREIGN KEY (area_destino_id) REFERENCES AreasDestino(id),
    CONSTRAINT fk_registrosvisitas_personal_visitado
        FOREIGN KEY (personal_visitado_id) REFERENCES Personal(id),
    CONSTRAINT fk_registrosvisitas_motivo_visita
        FOREIGN KEY (motivo_visita_id) REFERENCES MotivosVisita(id),
    CONSTRAINT fk_registrosvisitas_usuario_ingreso
        FOREIGN KEY (usuario_ingreso_id) REFERENCES Usuarios(id),
    CONSTRAINT fk_registrosvisitas_usuario_salida
        FOREIGN KEY (usuario_salida_id) REFERENCES Usuarios(id),
    CONSTRAINT fk_registrosvisitas_delegado_por
        FOREIGN KEY (delegado_por_id) REFERENCES Personal(id)
);

-- ============================================
-- 7. MÓDULO DE REGISTRO DE SALIDAS DEL PERSONAL
-- ============================================

CREATE TABLE IF NOT EXISTS RegistrosSalidaPersonal (
    id BIGSERIAL PRIMARY KEY,
    personal_id INT NOT NULL,
    motivo_salida_id INT NOT NULL,
    fecha_hora_salida TIMESTAMP NOT NULL,
    fecha_hora_retorno_estimada TIMESTAMP NULL,
    fecha_hora_retorno_real TIMESTAMP NULL,
    observacion_salida TEXT NULL,
    usuario_registro_id INT NOT NULL,
    CONSTRAINT fk_registros_salida_personal
        FOREIGN KEY (personal_id) REFERENCES Personal(id),
    CONSTRAINT fk_registros_salida_motivo
        FOREIGN KEY (motivo_salida_id) REFERENCES MotivosSalidaPersonal(id),
    CONSTRAINT fk_registros_salida_usuario
        FOREIGN KEY (usuario_registro_id) REFERENCES Usuarios(id)
);

-- ============================================
-- 8. MÓDULO DE CONTROL DE ASISTENCIA
-- ============================================

CREATE TABLE IF NOT EXISTS ControlAsistenciaPersonal (
    id BIGSERIAL PRIMARY KEY,
    personal_id INT NOT NULL,
    fecha DATE NOT NULL,
    hora_ingreso TIME NULL,
    hora_salida TIME NULL,
    estado_presencia VARCHAR(15) NOT NULL, -- PRESENTE, AUSENTE, TARDANZA, PERMISO
    usuario_registro_id INT NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    minutos_tardanza INT NOT NULL DEFAULT 0,
    observacion TEXT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_control_asistencia UNIQUE (personal_id, fecha),
    CONSTRAINT fk_control_asistencia_personal
        FOREIGN KEY (personal_id) REFERENCES Personal(id),
    CONSTRAINT fk_control_asistencia_usuario
        FOREIGN KEY (usuario_registro_id) REFERENCES Usuarios(id)
);

-- ============================================
-- 9. CONFIGURACIÓN DE PROVEEDORES RENIEC
-- ============================================

CREATE TABLE IF NOT EXISTS ReniecProveedores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    base_url TEXT NOT NULL,
    token TEXT NULL,
    notas TEXT NULL,
    activo BOOLEAN NOT NULL DEFAULT FALSE,
    usuario_creador_id INT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_activacion TIMESTAMP NULL,
    fecha_desactivacion TIMESTAMP NULL,
    CONSTRAINT fk_reniec_proveedores_usuario_creador
        FOREIGN KEY (usuario_creador_id) REFERENCES Usuarios(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reniec_proveedores_activo
    ON ReniecProveedores (activo)
    WHERE activo = TRUE;

-- ============================================
-- 10. DATOS INICIALES (SEED)
-- ============================================

-- Usuario administrador inicial
INSERT INTO Usuarios (nombre_usuario, hash_contrasena, email, rol)
SELECT 'admin', '$2a$12$tJXrqZ9KeUyVVSyHI1m.6eS.uCfXMI0JLpM8.Tz7XJMl1nnvLjrJO', 'admin@ugel.gob.pe', 'Administrador'
WHERE NOT EXISTS (SELECT 1 FROM Usuarios WHERE nombre_usuario = 'admin');

-- Áreas básicas
INSERT INTO AreasDestino (nombre_area)
SELECT 'Dirección' WHERE NOT EXISTS (SELECT 1 FROM AreasDestino WHERE nombre_area = 'Dirección');

INSERT INTO AreasDestino (nombre_area)
SELECT 'Administración' WHERE NOT EXISTS (SELECT 1 FROM AreasDestino WHERE nombre_area = 'Administración');

INSERT INTO AreasDestino (nombre_area)
SELECT 'Recursos Humanos' WHERE NOT EXISTS (SELECT 1 FROM AreasDestino WHERE nombre_area = 'Recursos Humanos');

-- Tipos de contrato básicos
INSERT INTO TiposContrato (nombre_tipo)
SELECT 'Permanente' WHERE NOT EXISTS (SELECT 1 FROM TiposContrato WHERE nombre_tipo = 'Permanente');

INSERT INTO TiposContrato (nombre_tipo)
SELECT 'Contratado' WHERE NOT EXISTS (SELECT 1 FROM TiposContrato WHERE nombre_tipo = 'Contratado');

-- Cargos básicos (sin area_destino_id)
INSERT INTO Cargos (nombre_cargo, descripcion)
SELECT 'Director', 'Director de la UGEL'
WHERE NOT EXISTS (SELECT 1 FROM Cargos WHERE nombre_cargo = 'Director');

INSERT INTO Cargos (nombre_cargo, descripcion)
SELECT 'Secretario', 'Secretario de Dirección'
WHERE NOT EXISTS (SELECT 1 FROM Cargos WHERE nombre_cargo = 'Secretario');

INSERT INTO Cargos (nombre_cargo, descripcion)
SELECT 'Jefe de Administración', 'Jefe del Área de Administración'
WHERE NOT EXISTS (SELECT 1 FROM Cargos WHERE nombre_cargo = 'Jefe de Administración');

INSERT INTO Cargos (nombre_cargo, descripcion)
SELECT 'Jefe de RRHH', 'Jefe del Área de Recursos Humanos'
WHERE NOT EXISTS (SELECT 1 FROM Cargos WHERE nombre_cargo = 'Jefe de RRHH');

-- Tipos de documento básicos
INSERT INTO TiposDocumento (codigo, nombre_completo)
SELECT 'DNI', 'Documento Nacional de Identidad'
WHERE NOT EXISTS (SELECT 1 FROM TiposDocumento WHERE codigo = 'DNI');

INSERT INTO TiposDocumento (codigo, nombre_completo)
SELECT 'CE', 'Carnet de Extranjería'
WHERE NOT EXISTS (SELECT 1 FROM TiposDocumento WHERE codigo = 'CE');

INSERT INTO TiposDocumento (codigo, nombre_completo)
SELECT 'PASS', 'Pasaporte'
WHERE NOT EXISTS (SELECT 1 FROM TiposDocumento WHERE codigo = 'PASS');

-- Motivos de visita básicos
INSERT INTO MotivosVisita (nombre_motivo)
SELECT 'Trámite Administrativo'
WHERE NOT EXISTS (SELECT 1 FROM MotivosVisita WHERE nombre_motivo = 'Trámite Administrativo');

INSERT INTO MotivosVisita (nombre_motivo)
SELECT 'Reunión'
WHERE NOT EXISTS (SELECT 1 FROM MotivosVisita WHERE nombre_motivo = 'Reunión');

INSERT INTO MotivosVisita (nombre_motivo)
SELECT 'Entrega de Documentos'
WHERE NOT EXISTS (SELECT 1 FROM MotivosVisita WHERE nombre_motivo = 'Entrega de Documentos');

-- Proveedor RENIEC inicial
INSERT INTO ReniecProveedores (nombre, base_url, token, activo, notas, fecha_activacion)
SELECT
    'APIS.net.pe',
    'https://api.apis.net.pe/v2/reniec/dni?numero={dni}',
    'apis-token-14158.uFeMfwK5k9el9LYH7077UJJuzuFqsebv',
    TRUE,
    'Proveedor inicial migrado desde código',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM ReniecProveedores WHERE activo = TRUE);
