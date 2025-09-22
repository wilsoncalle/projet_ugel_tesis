-- Esquema de la base de datos para el Sistema Integral de Control de Acceso - UGEL Talara

-- GESTIÓN DE USUARIOS Y ESTRUCTURA
CREATE TABLE IF NOT EXISTS Usuarios (
    id SERIAL PRIMARY KEY,
    nombre_usuario VARCHAR(100) NOT NULL UNIQUE,
    hash_contrasena VARCHAR(255) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    rol VARCHAR(20) NOT NULL, -- "Vigilante", "Administrador", "RRHH"
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS AreasDestino (
    id SERIAL PRIMARY KEY,
    nombre_area VARCHAR(150) NOT NULL UNIQUE,
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

-- MÁS TABLAS DE CATÁLOGO
CREATE TABLE IF NOT EXISTS TiposContrato (
    id SERIAL PRIMARY KEY,
    nombre_tipo VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS MotivosSalidaPersonal (
    id SERIAL PRIMARY KEY,
    nombre_motivo VARCHAR(150) NOT NULL UNIQUE,
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
    nombre_motivo VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- GESTIÓN DE PERSONAL INTERNO
CREATE TABLE IF NOT EXISTS Personal (
    id SERIAL PRIMARY KEY,
    tipo_documento VARCHAR(10) NOT NULL,
    numero_documento VARCHAR(20) NOT NULL,
    nombres VARCHAR(150) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    area_destino_id INT NOT NULL,
    tipo_contrato_id INT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(tipo_documento, numero_documento),
    cargo VARCHAR(100) NOT NULL DEFAULT 'Sin asignar',
    FOREIGN KEY (area_destino_id) REFERENCES AreasDestino(id),
    FOREIGN KEY (tipo_contrato_id) REFERENCES TiposContrato(id)
);

-- GESTIÓN DE VISITANTES
CREATE TABLE IF NOT EXISTS Visitantes (
    id BIGSERIAL PRIMARY KEY,
    tipo_documento_id INT NOT NULL,
    numero_documento VARCHAR(20) NOT NULL,
    nombres VARCHAR(150) NOT NULL,
    apellidos VARCHAR(150) NOT NULL,
    fecha_ultima_actualizacion_api TIMESTAMP NULL,
    UNIQUE(tipo_documento_id, numero_documento),
    FOREIGN KEY (tipo_documento_id) REFERENCES TiposDocumento(id)
);

-- MÓDULOS TRANSACCIONALES
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
    FOREIGN KEY (visitante_id) REFERENCES Visitantes(id),
    FOREIGN KEY (area_destino_id) REFERENCES AreasDestino(id),
    FOREIGN KEY (personal_visitado_id) REFERENCES Personal(id),
    FOREIGN KEY (motivo_visita_id) REFERENCES MotivosVisita(id),
    FOREIGN KEY (usuario_ingreso_id) REFERENCES Usuarios(id),
    FOREIGN KEY (usuario_salida_id) REFERENCES Usuarios(id)
);

CREATE TABLE IF NOT EXISTS RegistrosSalidaPersonal (
    id BIGSERIAL PRIMARY KEY,
    personal_id INT NOT NULL,
    motivo_salida_id INT NOT NULL,
    fecha_hora_salida TIMESTAMP NOT NULL,
    fecha_hora_retorno_estimada TIMESTAMP NULL,
    fecha_hora_retorno_real TIMESTAMP NULL,
    observacion_salida TEXT NULL,
    usuario_registro_id INT NOT NULL,
    FOREIGN KEY (personal_id) REFERENCES Personal(id),
    FOREIGN KEY (motivo_salida_id) REFERENCES MotivosSalidaPersonal(id),
    FOREIGN KEY (usuario_registro_id) REFERENCES Usuarios(id)
);

CREATE TABLE IF NOT EXISTS ControlAsistenciaPersonal (
    id BIGSERIAL PRIMARY KEY,
    personal_id INT NOT NULL,
    fecha DATE NOT NULL,
    hora_ingreso TIME NULL,
    hora_salida TIME NULL,
    estado_presencia VARCHAR(15) NOT NULL,
    usuario_registro_id INT NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(personal_id, fecha),
    FOREIGN KEY (personal_id) REFERENCES Personal(id),
    FOREIGN KEY (usuario_registro_id) REFERENCES Usuarios(id)
);

-- Insertar datos iniciales para pruebas

-- Insertar un usuario administrador inicial si no existe
INSERT INTO Usuarios (nombre_usuario, hash_contrasena, email, rol)
SELECT 'admin', '$2a$12$tJXrqZ9KeUyVVSyHI1m.6eS.uCfXMI0JLpM8.Tz7XJMl1nnvLjrJO', 'admin@ugel.gob.pe', 'Administrador'
WHERE NOT EXISTS (SELECT 1 FROM Usuarios WHERE nombre_usuario = 'admin');

-- Insertar áreas básicas
INSERT INTO AreasDestino (nombre_area)
SELECT 'Dirección' WHERE NOT EXISTS (SELECT 1 FROM AreasDestino WHERE nombre_area = 'Dirección');

INSERT INTO AreasDestino (nombre_area)
SELECT 'Administración' WHERE NOT EXISTS (SELECT 1 FROM AreasDestino WHERE nombre_area = 'Administración');

INSERT INTO AreasDestino (nombre_area)
SELECT 'Recursos Humanos' WHERE NOT EXISTS (SELECT 1 FROM AreasDestino WHERE nombre_area = 'Recursos Humanos');

-- Insertar tipos de contrato básicos
INSERT INTO TiposContrato (nombre_tipo)
SELECT 'Permanente' WHERE NOT EXISTS (SELECT 1 FROM TiposContrato WHERE nombre_tipo = 'Permanente');

INSERT INTO TiposContrato (nombre_tipo)
SELECT 'Contratado' WHERE NOT EXISTS (SELECT 1 FROM TiposContrato WHERE nombre_tipo = 'Contratado');

-- Insertar tipos de documento básicos
INSERT INTO TiposDocumento (codigo, nombre_completo)
SELECT 'DNI', 'Documento Nacional de Identidad' 
WHERE NOT EXISTS (SELECT 1 FROM TiposDocumento WHERE codigo = 'DNI');

INSERT INTO TiposDocumento (codigo, nombre_completo)
SELECT 'CE', 'Carnet de Extranjería' 
WHERE NOT EXISTS (SELECT 1 FROM TiposDocumento WHERE codigo = 'CE');

INSERT INTO TiposDocumento (codigo, nombre_completo)
SELECT 'PASS', 'Pasaporte' 
WHERE NOT EXISTS (SELECT 1 FROM TiposDocumento WHERE codigo = 'PASS');

-- Insertar motivos de salida básicos
INSERT INTO MotivosSalidaPersonal (nombre_motivo)
SELECT 'Comisión de Servicio' 
WHERE NOT EXISTS (SELECT 1 FROM MotivosSalidaPersonal WHERE nombre_motivo = 'Comisión de Servicio');

INSERT INTO MotivosSalidaPersonal (nombre_motivo)
SELECT 'Permiso Personal' 
WHERE NOT EXISTS (SELECT 1 FROM MotivosSalidaPersonal WHERE nombre_motivo = 'Permiso Personal');

-- Insertar motivos de visita básicos
INSERT INTO MotivosVisita (nombre_motivo)
SELECT 'Trámite Administrativo' 
WHERE NOT EXISTS (SELECT 1 FROM MotivosVisita WHERE nombre_motivo = 'Trámite Administrativo');

INSERT INTO MotivosVisita (nombre_motivo)
SELECT 'Reunión' 
WHERE NOT EXISTS (SELECT 1 FROM MotivosVisita WHERE nombre_motivo = 'Reunión');

INSERT INTO MotivosVisita (nombre_motivo)
SELECT 'Entrega de Documentos' 
WHERE NOT EXISTS (SELECT 1 FROM MotivosVisita WHERE nombre_motivo = 'Entrega de Documentos');
