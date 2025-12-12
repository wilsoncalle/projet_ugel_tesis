-- ============================================================
-- SEED DEMO (Catálogos) - UGEL Control Acceso
-- - Solo catálogos (NO usuario, NO tablas operativas)
-- - Simula “10 años”: catálogos con items activos/inactivos
-- - RENIEC proveedor: APIS.net.pe (activo)
-- - Config asistencia: 1 registro GLOBAL (personal_id NULL)
-- ============================================================

BEGIN;

SET TIME ZONE 'America/Lima';

-- ------------------------------------------------------------
-- Limpieza (solo catálogos que vamos a poblar)
-- ------------------------------------------------------------
TRUNCATE TABLE public.config_asistencia_personal RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.reniecproveedor          RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.cargo                   RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.motivovisita            RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.tipocontrato            RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.tipodocumento           RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.areadestino             RESTART IDENTITY CASCADE;

-- ------------------------------------------------------------
-- 1) ÁREAS (con cambios históricos: algunas inactivas)
-- ------------------------------------------------------------
INSERT INTO public.areadestino (id, nombre_area, activa) VALUES
(1,  'Dirección', true),
(2,  'Administración', true),
(3,  'Recursos Humanos', true),
(4,  'Mesa de Partes', true),
(5,  'Tesorería', true),
(6,  'Contabilidad', true),
(7,  'Logística', true),
(8,  'Gestión Pedagógica', true),
(9,  'Gestión Institucional', true),
(10, 'Asesoría Jurídica', true),
(11, 'Tecnologías de la Información', true),
(12, 'Archivo Central', true),
(13, 'Infraestructura y Mantenimiento', true),
(14, 'Atención al Usuario', true),
(15, 'Control Interno', true),
-- “áreas antiguas” que ya no existen / se fusionaron
(16, 'Planificación y Presupuesto (Ant.)', false),
(17, 'Acciones de Personal (Ant.)', false),
(18, 'Unidad de Estadística (Ant.)', false);

-- ------------------------------------------------------------
-- 2) TIPOS DE DOCUMENTO (Perú)
--    codigo_sunat: valores comunes (si no los usas, igual sirve)
-- ------------------------------------------------------------
INSERT INTO public.tipodocumento (id, codigo, codigo_sunat, nombre_completo, activo) VALUES
(1, 'DNI',  '1', 'Documento Nacional de Identidad', true),
(2, 'CE',   '4', 'Carné de Extranjería', true),
(3, 'PAS',  '7', 'Pasaporte', true),
(4, 'RUC',  '6', 'Registro Único de Contribuyentes', true),
(5, 'OTRO', '0', 'Otro / No especificado', true);

-- ------------------------------------------------------------
-- 3) TIPOS DE CONTRATO (con uno “antiguo” inactivo)
-- ------------------------------------------------------------
INSERT INTO public.tipocontrato (id, nombre_tipo, activo) VALUES
(1, 'CAS', true),
(2, 'D. LEG. 276', true),
(3, 'D. LEG. 728', true),
(4, 'Locación de Servicios', true),
(5, 'Terceros', true),
(6, 'Practicante Preprofesional', true),
(7, 'Practicante Profesional', true),
(8, 'Servicios No Personales (Ant.)', false);

-- ------------------------------------------------------------
-- 4) MOTIVOS DE VISITA (típicos de UGEL)
-- ------------------------------------------------------------
INSERT INTO public.motivovisita (id, nombre_motivo, activo) VALUES
(1,  'Mesa de Partes - Trámite documentario', true),
(2,  'Entrega / Recojo de documentos', true),
(3,  'Consulta / Información', true),
(4,  'Reunión programada', true),
(5,  'Asuntos de Personal (RRHH)', true),
(6,  'Tesorería / Pagos', true),
(7,  'Logística / Proveedor', true),
(8,  'Soporte TI / Sistemas', true),
(9,  'Gestión Pedagógica / Especialista', true),
(10, 'Asesoría Jurídica', true),
(11, 'Mantenimiento / Infraestructura', true),
(12, 'Auditoría / Control', true),
(13, 'Capacitación / Taller', true),
(14, 'Dirección / Coordinación', true);

-- ------------------------------------------------------------
-- 5) CARGOS (algunos antiguos inactivos)
-- ------------------------------------------------------------
INSERT INTO public.cargo (id, nombre_cargo, descripcion, activo, fecha_creacion) VALUES
(1,  'Director(a) UGEL', 'Máxima autoridad administrativa', true,  '2015-02-10 09:30:00'),
(2,  'Administrador(a)', 'Gestión administrativa general', true,    '2015-04-12 10:15:00'),
(3,  'Jefe(a) de RRHH', 'Gestión de personal y asistencias', true,  '2016-01-05 08:45:00'),
(4,  'Especialista Pedagógico', 'Asistencia técnica pedagógica', true,'2016-03-20 11:10:00'),
(5,  'Especialista Institucional', 'Gestión institucional', true,  '2017-06-14 14:20:00'),
(6,  'Tesorero(a)', 'Pagos, caja y conciliaciones', true,          '2017-08-02 09:00:00'),
(7,  'Contador(a)', 'Contabilidad y reportes', true,               '2018-01-18 09:40:00'),
(8,  'Asistente Administrativo', 'Apoyo a áreas administrativas', true,'2018-05-09 10:00:00'),
(9,  'Responsable de Mesa de Partes', 'Recepción y derivación de documentos', true,'2019-02-11 08:30:00'),
(10, 'Técnico de Soporte TI', 'Soporte a usuarios y equipos', true,'2019-09-01 13:15:00'),
(11, 'Vigilante', 'Control de accesos y seguridad', true,          '2020-01-10 07:50:00'),
(12, 'Archivista', 'Gestión documental y archivo central', true,   '2020-07-22 09:05:00'),
(13, 'Logístico(a)', 'Compras, almacén y bienes', true,            '2021-03-03 10:35:00'),
(14, 'Abogado(a)', 'Asesoría legal', true,                         '2022-04-15 11:25:00'),
(15, 'Conserje', 'Apoyo en mantenimiento menor', true,             '2023-01-08 08:10:00'),
-- cargos “antiguos”
(16, 'Digitador(a) (Ant.)', 'Rol antiguo, reemplazado por procesos digitales', false, '2015-06-01 09:00:00'),
(17, 'Mensajero(a) (Ant.)', 'Rol antiguo, ahora tercerizado/optimizado', false, '2016-07-01 09:00:00');

-- ------------------------------------------------------------
-- 6) RENIEC PROVEEDOR (exacto como pediste)
--    Nota: usuario_creador_id = NULL porque NO habrá usuarios
-- ------------------------------------------------------------
INSERT INTO public.reniecproveedor (
  id, nombre, base_url, token, activo, notas,
  usuario_creador_id,
  fecha_creacion, fecha_actualizacion, fecha_activacion, fecha_desactivacion
) VALUES (
  1,
  'APIS.net.pe',
  'https://api.apis.net.pe/v2/reniec/dni?numero={dni}',
  'apis-token-14158.uFeMfwK5k9el9LYH7077UJJuzuFqsebv',
  TRUE,
  'Proveedor principal para consultas de DNI',
  NULL,
  '2018-03-15 10:00:00',
  '2025-11-20 15:30:00',
  '2025-11-20 15:30:00',
  NULL
);

-- ------------------------------------------------------------
-- 7) CONFIG ASISTENCIA (solo 1 dato GLOBAL)
--    personal_id = NULL (configuración general)
-- ------------------------------------------------------------
INSERT INTO public.config_asistencia_personal (
  id, personal_id, activo, aplica_desde, hora_entrada,
  minutos_tolerancia_por_dia, dias_tolerancia_por_mes,
  created_at, updated_at
) VALUES (
  1, NULL, TRUE, '2016-01-01', '09:00:00',
  10, 10,
  '2016-01-01 08:00:00-05', '2025-12-12 14:00:00-05'
);

-- ------------------------------------------------------------
-- Ajuste de secuencias (por si insertaste IDs manuales)
-- ------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('public.areadestino','id'), (SELECT COALESCE(MAX(id),1) FROM public.areadestino), true);
SELECT setval(pg_get_serial_sequence('public.tipodocumento','id'), (SELECT COALESCE(MAX(id),1) FROM public.tipodocumento), true);
SELECT setval(pg_get_serial_sequence('public.tipocontrato','id'), (SELECT COALESCE(MAX(id),1) FROM public.tipocontrato), true);
SELECT setval(pg_get_serial_sequence('public.motivovisita','id'), (SELECT COALESCE(MAX(id),1) FROM public.motivovisita), true);
SELECT setval(pg_get_serial_sequence('public.cargo','id'), (SELECT COALESCE(MAX(id),1) FROM public.cargo), true);
SELECT setval(pg_get_serial_sequence('public.reniecproveedor','id'), (SELECT COALESCE(MAX(id),1) FROM public.reniecproveedor), true);
SELECT setval(pg_get_serial_sequence('public.config_asistencia_personal','id'), (SELECT COALESCE(MAX(id),1) FROM public.config_asistencia_personal), true);

COMMIT;
