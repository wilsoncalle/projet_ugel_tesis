-- Seed de datos para UGEL (sin incluir usuarios ni papeletassalida)

BEGIN;

-- ==========================
-- TABLA: tiposdocumento
-- ==========================
INSERT INTO public.tiposdocumento (id, codigo, nombre_completo) VALUES
  (1, 'DNI', 'Documento Nacional de Identidad'),
  (2, 'CE', 'Carné de Extranjería'),
  (3, 'PASS', 'Pasaporte'),
  (4, 'RUC', 'Registro Único de Contribuyentes');

-- ==========================
-- TABLA: tiposcontrato
-- ==========================
INSERT INTO public.tiposcontrato (id, nombre_tipo) VALUES
  (1, 'Nombrado'),
  (2, 'Contrato'),
  (3, 'CAS'),
  (4, 'Locación de servicios');

-- ==========================
-- TABLA: areasdestino
-- ==========================
INSERT INTO public.areasdestino (id, nombre_area) VALUES
  (1, 'Dirección de UGEL'),
  (2, 'Recursos Humanos'),
  (3, 'Secretaría Académica'),
  (4, 'Administración'),
  (5, 'Tesorería'),
  (6, 'Almacén'),
  (7, 'Gestión Pedagógica'),
  (8, 'Área de Personal'),
  (9, 'Mesa de Partes'),
  (10, 'Soporte Informático');

-- ==========================
-- TABLA: cargos
-- OJO: id es GENERATED ALWAYS AS IDENTITY → no se inserta
-- ==========================
INSERT INTO public.cargos (nombre_cargo, descripcion) VALUES
  ('Director de UGEL', NULL),
  ('Jefe de Recursos Humanos', NULL),
  ('Especialista en Gestión Pedagógica', NULL),
  ('Especialista Administrativo', NULL),
  ('Técnico Administrativo', NULL),
  ('Docente', NULL),
  ('Coordinador Académico', NULL),
  ('Auxiliar Administrativo', NULL),
  ('Vigilante', NULL),
  ('Recepcionista', NULL),
  ('Analista de Sistemas', NULL),
  ('Contador', NULL);

-- ==========================
-- TABLA: motivosvisita
-- ==========================
INSERT INTO public.motivosvisita (id, nombre_motivo) VALUES
  (1, 'Trámite administrativo'),
  (2, 'Entrega de documentos'),
  (3, 'Reunión con director'),
  (4, 'Reunión con especialista'),
  (5, 'Visita de proveedor'),
  (6, 'Capacitación'),
  (7, 'Mantenimiento'),
  (8, 'Visita de apoderado'),
  (9, 'Supervisión'),
  (10, 'Otros');

-- ==========================
-- TABLA: personal
-- ==========================
INSERT INTO public.personal (
  id, tipo_documento, numero_documento, nombres, apellidos,
  area_destino_id, tipo_contrato_id, cargo_id, fecha_nacimiento, email
) VALUES
  (1, 'DNI', '12345678', 'Carlos Alberto', 'Ramírez López', 1, 1, 1, '1975-03-12', 'carlos.ramirez@ugel.gob.pe'),
  (2, 'DNI', '23456789', 'María Elena', 'Quispe Huamán', 2, 1, 2, '1980-07-25', 'maria.quispe@ugel.gob.pe'),
  (3, 'DNI', '34567890', 'José Luis', 'Torres Castillo', 7, 1, 3, '1978-11-03', 'jose.torres@ugel.gob.pe'),
  (4, 'DNI', '45678901', 'Ana Patricia', 'Vega Rojas', 4, 2, 4, '1985-01-18', 'ana.vega@ugel.gob.pe'),
  (5, 'DNI', '56789012', 'Luis Alberto', 'Sánchez Paredes', 4, 2, 5, '1982-09-09', 'luis.sanchez@ugel.gob.pe'),
  (6, 'DNI', '67890123', 'Rosa Andrea', 'Salas Guerrero', 9, 2, 8, '1990-05-30', 'rosa.salas@ugel.gob.pe'),
  (7, 'DNI', '78901234', 'Miguel Ángel', 'Huamán Flores', 10, 3, 11, '1988-02-14', 'miguel.huaman@ugel.gob.pe'),
  (8, 'DNI', '89012345', 'Patricia', 'Mendoza Luján', 3, 2, 7, '1987-04-22', 'patricia.mendoza@ugel.gob.pe'),
  (9, 'DNI', '90123456', 'Juana', 'Paredes Ramos', 5, 1, 12, '1979-08-17', 'juana.paredes@ugel.gob.pe'),
  (10, 'DNI', '11223344', 'Raúl', 'Chávez Gutiérrez', 8, 4, 6, '1983-12-05', 'raul.chavez@ugel.gob.pe'),
  (11, 'DNI', '22334455', 'Elena', 'Mamani Ccapa', 6, 2, 5, '1992-06-11', 'elena.mamani@ugel.gob.pe'),
  (12, 'DNI', '33445566', 'Pedro', 'Lozano Ruiz', 1, 2, 4, '1986-10-28', 'pedro.lozano@ugel.gob.pe'),
  (13, 'DNI', '44556677', 'Sofía', 'Valdivia León', 2, 2, 4, '1991-09-03', 'sofia.valdivia@ugel.gob.pe'),
  (14, 'DNI', '55667788', 'Diego', 'Cruz Palomino', 10, 3, 11, '1993-01-21', 'diego.cruz@ugel.gob.pe'),
  (15, 'DNI', '66778899', 'Lucía', 'Gamarra Soto', 7, 2, 6, '1994-07-09', 'lucia.gamarra@ugel.gob.pe'),
  (16, 'DNI', '77889900', 'Fernando', 'Iglesias Cornejo', 9, 3, 9, '1984-03-16', 'fernando.iglesias@ugel.gob.pe');

-- ==========================
-- TABLA: visitantes
-- ==========================
INSERT INTO public.visitantes (
  id, tipo_documento_id, numero_documento, nombres, apellidos
) VALUES
  (1, 1, '40101010', 'Juan', 'Pérez Rojas'),
  (2, 1, '40202020', 'María', 'López Díaz'),
  (3, 1, '40303030', 'Luis', 'Fernández Vega'),
  (4, 1, '40404040', 'Carmen', 'Castillo Cruz'),
  (5, 1, '40505050', 'Alberto', 'Torres Prado'),
  (6, 1, '40606060', 'Patricia', 'García León'),
  (7, 1, '40707070', 'Ricardo', 'Salazar Ruiz'),
  (8, 1, '40808080', 'Claudia', 'Rivas Campos'),
  (9, 2, 'X1234567', 'Michael', 'Smith'),
  (10, 2, 'X2345678', 'Laura', 'Johnson'),
  (11, 2, 'X3456789', 'Andrés', 'Gutiérrez Silva'),
  (12, 3, 'P000111', 'Hiroshi', 'Tanaka'),
  (13, 3, 'P000222', 'Sophie', 'Dubois'),
  (14, 3, 'P000333', 'Lukas', 'Müller'),
  (15, 1, '40909090', 'Gabriela', 'Flores Medina'),
  (16, 1, '41010101', 'Felipe', 'Castro Aguilar'),
  (17, 1, '41111111', 'Rocío', 'Palacios Vera'),
  (18, 1, '41212121', 'Esteban', 'Morales Pinto'),
  (19, 1, '41313131', 'Natalia', 'Herrera Campos'),
  (20, 1, '41414141', 'Jorge', 'Chávez Lozano');

-- ==========================
-- TABLA: config_asistencia_personal
-- ==========================
INSERT INTO public.config_asistencia_personal (id, personal_id) VALUES
  (1, 1),
  (2, 2),
  (3, 3),
  (4, 4),
  (5, 5),
  (6, 6),
  (7, 7),
  (8, 8),
  (9, 9),
  (10, 10),
  (11, 11),
  (12, 12),
  (13, 13),
  (14, 14),
  (15, 15),
  (16, 16);

-- ==========================
-- TABLA: controlasistenciapersonal
-- ==========================
INSERT INTO public.controlasistenciapersonal (
  id, personal_id, fecha, hora_ingreso, hora_salida,
  estado_presencia, usuario_registro_id, minutos_tardanza, observacion
) VALUES
  (1, 1, '2025-03-03', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),
  (2, 2, '2025-03-03', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),
  (3, 3, '2025-03-03', '09:10:00', '17:00:00', 'TARDANZA', 3, 10, 'Ingreso con 10 minutos de tardanza.'),
  (4, 4, '2025-03-03', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),
  (5, 5, '2025-03-03', NULL, NULL, 'PERMISO', 3, 0, 'Permiso coordinado con RRHH.'),
  (6, 6, '2025-03-03', NULL, NULL, 'AUSENTE', 3, 0, 'No marcó asistencia.'),
  (7, 7, '2025-03-03', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),
  (8, 8, '2025-03-03', '09:10:00', '17:00:00', 'TARDANZA', 3, 10, 'Ingreso con 10 minutos de tardanza.'),
  (9, 9, '2025-03-03', '09:10:00', '17:00:00', 'TARDANZA', 3, 10, 'Ingreso con 10 minutos de tardanza.'),
  (10, 10, '2025-03-03', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),

  (11, 1, '2025-03-04', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),
  (12, 2, '2025-03-04', NULL, NULL, 'PERMISO', 3, 0, 'Permiso coordinado con RRHH.'),
  (13, 3, '2025-03-04', NULL, NULL, 'AUSENTE', 3, 0, 'No marcó asistencia.'),
  (14, 4, '2025-03-04', '09:10:00', '17:00:00', 'TARDANZA', 3, 10, 'Ingreso con 10 minutos de tardanza.'),
  (15, 5, '2025-03-04', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),
  (16, 6, '2025-03-04', '09:10:00', '17:00:00', 'TARDANZA', 3, 10, 'Ingreso con 10 minutos de tardanza.'),
  (17, 7, '2025-03-04', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),
  (18, 8, '2025-03-04', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),
  (19, 9, '2025-03-04', '09:10:00', '17:00:00', 'TARDANZA', 3, 10, 'Ingreso con 10 minutos de tardanza.'),
  (20, 10, '2025-03-04', NULL, NULL, 'PERMISO', 3, 0, 'Permiso coordinado con RRHH.'),

  (21, 1, '2025-03-05', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),
  (22, 2, '2025-03-05', '09:10:00', '17:00:00', 'TARDANZA', 3, 10, 'Ingreso con 10 minutos de tardanza.'),
  (23, 3, '2025-03-05', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),
  (24, 4, '2025-03-05', NULL, NULL, 'PERMISO', 3, 0, 'Permiso coordinado con RRHH.'),
  (25, 5, '2025-03-05', NULL, NULL, 'AUSENTE', 3, 0, 'No marcó asistencia.'),
  (26, 6, '2025-03-05', '09:10:00', '17:00:00', 'TARDANZA', 3, 10, 'Ingreso con 10 minutos de tardanza.'),
  (27, 7, '2025-03-05', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),
  (28, 8, '2025-03-05', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),
  (29, 9, '2025-03-05', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),
  (30, 10, '2025-03-05', '09:10:00', '17:00:00', 'TARDANZA', 3, 10, 'Ingreso con 10 minutos de tardanza.'),

  (31, 1, '2025-03-06', NULL, NULL, 'PERMISO', 3, 0, 'Permiso coordinado con RRHH.'),
  (32, 2, '2025-03-06', NULL, NULL, 'AUSENTE', 3, 0, 'No marcó asistencia.'),
  (33, 3, '2025-03-06', '09:10:00', '17:00:00', 'TARDANZA', 3, 10, 'Ingreso con 10 minutos de tardanza.'),
  (34, 4, '2025-03-06', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),
  (35, 5, '2025-03-06', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),
  (36, 6, '2025-03-06', '09:10:00', '17:00:00', 'TARDANZA', 3, 10, 'Ingreso con 10 minutos de tardanza.'),
  (37, 7, '2025-03-06', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),
  (38, 8, '2025-03-06', NULL, NULL, 'PERMISO', 3, 0, 'Permiso coordinado con RRHH.'),
  (39, 9, '2025-03-06', NULL, NULL, 'AUSENTE', 3, 0, 'No marcó asistencia.'),
  (40, 10, '2025-03-06', '09:10:00', '17:00:00', 'TARDANZA', 3, 10, 'Ingreso con 10 minutos de tardanza.'),

  (41, 1, '2025-03-07', '09:10:00', '17:00:00', 'TARDANZA', 3, 10, 'Ingreso con 10 minutos de tardanza.'),
  (42, 2, '2025-03-07', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),
  (43, 3, '2025-03-07', NULL, NULL, 'PERMISO', 3, 0, 'Permiso coordinado con RRHH.'),
  (44, 4, '2025-03-07', NULL, NULL, 'AUSENTE', 3, 0, 'No marcó asistencia.'),
  (45, 5, '2025-03-07', '09:10:00', '17:00:00', 'TARDANZA', 3, 10, 'Ingreso con 10 minutos de tardanza.'),
  (46, 6, '2025-03-07', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),
  (47, 7, '2025-03-07', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),
  (48, 8, '2025-03-07', '09:10:00', '17:00:00', 'TARDANZA', 3, 10, 'Ingreso con 10 minutos de tardanza.'),
  (49, 9, '2025-03-07', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL),
  (50, 10, '2025-03-07', '08:55:00', '17:00:00', 'PRESENTE', 3, 0, NULL);

-- ==========================
-- TABLA: justificaciones
-- OJO: id es IDENTITY ALWAYS → no se inserta
-- ==========================
INSERT INTO public.justificaciones (
  control_asistencia_id, motivo, evidencia_url, estado,
  fecha_solicitud, usuario_solicitante_id, fecha_respuesta,
  usuario_respuesta_id, observacion_respuesta
) VALUES
  (3, 'Llegada tarde por tráfico en la ciudad', NULL, 'PENDIENTE',
   '2025-03-08 09:15:00', 2, NULL, NULL, NULL),
  (6, 'Tardanza por cita médica programada',
   'https://evidencias.ugel.gob.pe/citas/justificacion_2.pdf',
   'APROBADA', '2025-03-08 09:30:00', 2,
   '2025-03-09 08:30:00', 1,
   'Se aprueba la justificación por sustento médico.'),
  (7, 'Inasistencia por emergencia familiar', NULL, 'APROBADA',
   '2025-03-08 10:00:00', 2,
   '2025-03-09 10:30:00', 1,
   'Se aprueba la inasistencia por emergencia, sin descuento.'),
  (9, 'Llegada tarde por problemas de transporte público', NULL,
   'RECHAZADA', '2025-03-08 11:00:00', 2,
   '2025-03-10 09:00:00', 1,
   'No se adjunta evidencia que sustente la tardanza.'),
  (5, 'Salida autorizada para trámite en banco', NULL, 'APROBADA',
   '2025-03-09 09:00:00', 1,
   '2025-03-09 09:30:00', 1,
   'Se mantiene el registro como permiso sin descuento.'),
  (12, 'Tardanza por corte de ruta en carretera', NULL, 'PENDIENTE',
   '2025-03-09 10:15:00', 2,
   NULL, NULL, NULL),
  (16, 'Inasistencia por descanso médico',
   'https://evidencias.ugel.gob.pe/citas/descanso_medico_7.pdf',
   'APROBADA', '2025-03-09 11:00:00', 2,
   '2025-03-10 10:45:00', 1,
   'Se aprueba la inasistencia con goce de remuneraciones.'),
  (10, 'Permiso por comisión de servicio en otra sede', NULL,
   'APROBADA', '2025-03-10 08:30:00', 1,
   '2025-03-10 09:15:00', 1,
   'Se valida asistencia con permiso institucional.');

-- ==========================
-- TABLA: registrosvisitas
-- ==========================
INSERT INTO public.registrosvisitas (
  id, visitante_id, area_destino_id, personal_visitado_id,
  motivo_visita_id, fecha_ingreso, fecha_salida, usuario_ingreso_id,
  usuario_salida_id, sync_id, estado_visita, fecha_aceptacion,
  fecha_rechazo, motivo_rechazo, delegado_por_id, fecha_delegacion,
  fecha_limite_ingreso, fecha_limite_salida, fecha_fin_atencion
) VALUES
  (1, 1, 1, 1, 1,
   '2025-03-03 09:15:00', '2025-03-03 10:45:00', 3, 3,
   'web-20250303-0001', 'FINALIZADA',
   '2025-03-03 09:25:00', NULL, NULL,
   NULL, NULL, NULL, NULL, '2025-03-03 10:45:00'),
  (2, 2, 2, 2, 2,
   '2025-03-03 10:30:00', '2025-03-03 12:00:00', 3, 3,
   'web-20250303-0002', 'FINALIZADA',
   '2025-03-03 10:40:00', NULL, NULL,
   NULL, NULL, NULL, NULL, '2025-03-03 12:00:00'),
  (3, 3, 3, 8, 3,
   '2025-03-03 11:45:00', '2025-03-03 13:15:00', 3, 3,
   'web-20250303-0003', 'FINALIZADA',
   '2025-03-03 11:55:00', NULL, NULL,
   NULL, NULL, NULL, NULL, '2025-03-03 13:15:00'),
  (4, 4, 4, 4, 4,
   '2025-03-03 13:00:00', '2025-03-03 14:30:00', 3, 3,
   'web-20250303-0004', 'FINALIZADA',
   '2025-03-03 13:10:00', NULL, NULL,
   2, '2025-03-03 13:00:00', NULL, NULL, '2025-03-03 14:30:00'),
  (5, 5, 5, 9, 5,
   '2025-03-03 14:15:00', '2025-03-03 15:45:00', 3, 3,
   'web-20250303-0005', 'FINALIZADA',
   '2025-03-03 14:25:00', NULL, NULL,
   NULL, NULL, NULL, NULL, '2025-03-03 15:45:00'),
  (6, 6, 6, 11, 6,
   '2025-03-03 15:30:00', '2025-03-03 17:00:00', 3, 3,
   'web-20250303-0006', 'FINALIZADA',
   '2025-03-03 15:40:00', NULL, NULL,
   NULL, NULL, NULL, NULL, '2025-03-03 17:00:00'),
  (7, 7, 7, 3, 7,
   '2025-03-04 09:45:00', '2025-03-04 11:15:00', 3, 3,
   'web-20250304-0007', 'FINALIZADA',
   '2025-03-04 09:55:00', NULL, NULL,
   NULL, NULL, NULL, NULL, '2025-03-04 11:15:00'),
  (8, 8, 8, 10, 8,
   '2025-03-04 11:00:00', '2025-03-04 12:30:00', 3, 3,
   'web-20250304-0008', 'FINALIZADA',
   '2025-03-04 11:10:00', NULL, NULL,
   2, '2025-03-04 11:00:00', NULL, NULL, '2025-03-04 12:30:00'),
  (9, 9, 9, 6, 9,
   '2025-03-04 12:15:00', '2025-03-04 13:45:00', 3, 3,
   'web-20250304-0009', 'FINALIZADA',
   '2025-03-04 12:25:00', NULL, NULL,
   NULL, NULL, NULL, NULL, '2025-03-04 13:45:00'),
  (10, 10, 10, 7, 10,
   '2025-03-04 13:30:00', '2025-03-04 15:00:00', 3, 3,
   'web-20250304-0010', 'FINALIZADA',
   '2025-03-04 13:40:00', NULL, NULL,
   NULL, NULL, NULL, NULL, '2025-03-04 15:00:00'),
  (11, 11, 1, 1, 1,
   '2025-03-04 14:45:00', '2025-03-04 16:15:00', 3, 3,
   'web-20250304-0011', 'FINALIZADA',
   '2025-03-04 14:55:00', NULL, NULL,
   NULL, NULL, NULL, NULL, '2025-03-04 16:15:00'),
  (12, 12, 2, 2, 2,
   '2025-03-04 16:00:00', '2025-03-04 17:30:00', 3, 3,
   'web-20250304-0012', 'FINALIZADA',
   '2025-03-04 16:10:00', NULL, NULL,
   2, '2025-03-04 16:00:00', NULL, NULL, '2025-03-04 17:30:00'),

  (13, 13, 3, 8, 3,
   '2025-03-05 09:15:00', NULL, 3, NULL,
   'web-20250305-0013', 'PENDIENTE',
   NULL, NULL, NULL,
   NULL, NULL, NULL, NULL),
  (14, 14, 4, 4, 4,
   '2025-03-05 10:30:00', NULL, 3, NULL,
   'web-20250305-0014', 'PENDIENTE',
   NULL, NULL, NULL,
   NULL, NULL, NULL, NULL),
  (15, 15, 5, 9, 5,
   '2025-03-05 11:45:00', NULL, 3, NULL,
   'web-20250305-0015', 'PENDIENTE',
   NULL, NULL, NULL,
   NULL, NULL, NULL, NULL),
  (16, 16, 6, 11, 6,
   '2025-03-05 13:00:00', NULL, 3, NULL,
   'web-20250305-0016', 'PENDIENTE',
   NULL, NULL, NULL,
   NULL, NULL, NULL, NULL),
  (17, 17, 7, 3, 7,
   '2025-03-05 14:15:00', NULL, 3, NULL,
   'web-20250305-0017', 'PENDIENTE',
   NULL, NULL, NULL,
   NULL, NULL, NULL, NULL),

  (18, 18, 8, 10, 8,
   '2025-03-06 09:30:00', NULL, 3, NULL,
   'web-20250306-0018', 'RECHAZADA',
   NULL, '2025-03-06 09:45:00',
   'Visita no autorizada por el área responsable.',
   NULL, NULL, NULL, NULL),
  (19, 19, 9, 6, 9,
   '2025-03-06 10:45:00', NULL, 3, NULL,
   'web-20250306-0019', 'RECHAZADA',
   NULL, '2025-03-06 11:00:00',
   'El personal solicitado no se encontraba disponible.',
   NULL, NULL, NULL, NULL),
  (20, 20, 10, 7, 10,
   '2025-03-06 08:00:00', NULL, 3, NULL,
   'web-20250306-0020', 'RECHAZADA',
   NULL, '2025-03-06 08:15:00',
   'El personal solicitado no se encontraba disponible.',
   NULL, NULL, NULL, NULL);

-- ==========================
-- TABLA: reniecproveedores
-- ==========================
INSERT INTO public.reniecproveedores (
  id, nombre, base_url, token, notas, activo, usuario_creador_id
) VALUES
  (1,
   'APIS.net.pe',
   'https://api.apis.net.pe/v2/reniec/dni?numero={dni}',
   'apis-token-14158.uFeMfwK5k9el9LYH7077UJJuzuFqsebv',
   'Proveedor principal para consultas de DNI',
   TRUE,
   1);

COMMIT;
