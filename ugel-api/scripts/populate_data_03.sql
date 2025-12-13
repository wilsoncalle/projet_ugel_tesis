-- ============================================================
-- SEED OPERATIVO (2010-01-01 a 2025-12-10) - UGEL Control Acceso
-- - Solo días laborables (L-V) excluyendo feriados (fijos + Semana Santa)
-- - Volumen aprox: 40 asistencias/día + 100 visitas/día
-- - Horario partido: 09:00 (ingreso) / Refrigerio 13:00-14:00 / Reingreso 14:00
--
-- IMPORTANTES CAMBIOS (pedido):
-- 1) hora_entrada_tarde = 14:00:00 (2pm)
-- 2) NO insertar ni truncar public.reniecproveedor
-- 3) NO insertar ni truncar public.usuario (se usan usuarios existentes)
--
-- Tablas que se pueblan: personal (hasta completar 40 activos), visitante,
-- controlasistenciapersonal, movimiento_asistencia, justificacion,
-- registrovisita, papeletaexterna.
--
-- Este script asume que YA existen los catálogos: areadestino, tipodocumento,
-- tipocontrato, motivovisita, cargo. También asume que YA existen usuarios
-- en public.usuario (para las FK usuario_registro_id / usuario_ingreso_id).
-- ============================================================

BEGIN;

SET TIME ZONE 'America/Lima';
SELECT setseed(0.424242); -- random relativamente reproducible por corrida

-- ------------------------------------------------------------
-- 0) LIMPIEZA (solo operativo + visitantes)
--    (NO tocar usuario, NO tocar reniecproveedor, NO tocar config_asistencia_personal)
-- ------------------------------------------------------------
TRUNCATE TABLE
  public.movimiento_asistencia,
  public.justificacion,
  public.registrovisita,
  public.controlasistenciapersonal,
  public.visitante
RESTART IDENTITY;

-- ------------------------------------------------------------
-- 1) CONFIG ASISTENCIA GLOBAL (id=1) -> hora_entrada_tarde = 14:00
--    (Si ya existe, solo actualiza horario/tolerancias)
-- ------------------------------------------------------------
INSERT INTO public.config_asistencia_personal (
  id, personal_id, activo, aplica_desde,
  hora_entrada, hora_entrada_tarde,
  minutos_tolerancia_por_dia, dias_tolerancia_por_mes,
  created_at, updated_at
) VALUES (
  1, NULL, TRUE, DATE '2010-01-01',
  TIME '09:00', TIME '14:00',
  10, 10,
  TIMESTAMPTZ '2010-01-01 08:00:00-05', CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
  activo = EXCLUDED.activo,
  -- NO obligamos a cambiar personal_id si el tuyo es distinto
  hora_entrada = EXCLUDED.hora_entrada,
  hora_entrada_tarde = EXCLUDED.hora_entrada_tarde,
  minutos_tolerancia_por_dia = EXCLUDED.minutos_tolerancia_por_dia,
  dias_tolerancia_por_mes = EXCLUDED.dias_tolerancia_por_mes,
  updated_at = EXCLUDED.updated_at;

-- ------------------------------------------------------------
-- 2) USUARIOS EXISTENTES (para FK)
--    Busca por rol o nombre_usuario; si no encuentra, usa MIN(id)
-- ------------------------------------------------------------
CREATE TEMP TABLE tmp_ids AS
SELECT
  COALESCE(
    (SELECT id FROM public.usuario WHERE rol = 'ADMIN' ORDER BY id LIMIT 1),
    (SELECT id FROM public.usuario WHERE nombre_usuario ILIKE 'admin' ORDER BY id LIMIT 1),
    (SELECT MIN(id) FROM public.usuario)
  ) AS admin_id,
  COALESCE(
    (SELECT id FROM public.usuario WHERE rol = 'RRHH' ORDER BY id LIMIT 1),
    (SELECT id FROM public.usuario WHERE nombre_usuario ILIKE 'rrhh' ORDER BY id LIMIT 1),
    (SELECT MIN(id) FROM public.usuario)
  ) AS rrhh_id,
  COALESCE(
    (SELECT id FROM public.usuario WHERE rol = 'VIGILANTE' ORDER BY id LIMIT 1),
    (SELECT id FROM public.usuario WHERE nombre_usuario ILIKE 'vigilante' ORDER BY id LIMIT 1),
    (SELECT MIN(id) FROM public.usuario)
  ) AS vigilante_id;

-- Si NO hay usuarios, este script fallará por FK (usuario_registro_id / usuario_ingreso_id).
-- Asegúrate de tener al menos 1 usuario en public.usuario.

-- ------------------------------------------------------------
-- 3) PERSONAL (completa hasta 40 activos, sin borrar lo que ya tengas)
-- ------------------------------------------------------------
WITH cnt AS (
  SELECT GREATEST(0, 40 - (SELECT COUNT(*) FROM public.personal WHERE activo = TRUE))::int AS n
),
data AS (
  SELECT
    ARRAY['Luis','Jorge','Miguel','Fernando','César','Ricardo','Héctor','Eduardo','Sergio','Bruno','Diego','Kevin','Andrés','Julio','Omar','Raúl','Manuel','Arturo','Gustavo','Piero',
          'Ana','Carmen','Patricia','Lucía','Elena','Milagros','Karla','Vanessa','Mariana','Sofía','Diana','Paola','Ruth','Mónica','Claudia','Beatriz','Lorena','Esther']::text[] AS nombres,
    ARRAY['Vargas','Ríos','Benites','Cabrera','Solis','Espinoza','Carrillo','Vega','Campos','Navarro','Aguilar','Pacheco','Bustamante','Córdova','Ibáñez','Ochoa','Zúñiga','Guerra','Hidalgo','Farro',
          'López','García','Sánchez','Rodríguez','Flores','Díaz','Torres','Ramírez','Castillo','Salazar','Reyes','Mendoza','Paredes','Quispe','Valdivia','Chávez']::text[] AS apellidos
),
ins AS (
  SELECT
    1 AS tipo_documento_id, -- DNI
    (70200000 + gs)::text AS numero_documento,
    d.nombres[1 + floor(random()*array_length(d.nombres,1))::int] AS nombres,
    d.apellidos[1 + floor(random()*array_length(d.apellidos,1))::int]
      || ' ' ||
    d.apellidos[1 + floor(random()*array_length(d.apellidos,1))::int] AS apellidos,
    (DATE '1966-01-01' + (floor(random()*13500)) * INTERVAL '1 day')::date AS fecha_nacimiento,
    (1 + floor(random()*15))::int AS area_destino_id,
    (1 + floor(random()*17))::int AS cargo_id,        -- hay cargos 1..17 en tu seed
    (1 + floor(random()*8))::int  AS tipo_contrato_id, -- hay tipos 1..8 en tu seed
    TRUE AS activo
  FROM generate_series(1, (SELECT n FROM cnt)) gs
  CROSS JOIN data d
)
INSERT INTO public.personal
(tipo_documento_id, numero_documento, nombres, apellidos, fecha_nacimiento, email, area_destino_id, cargo_id, tipo_contrato_id, activo)
SELECT
  i.tipo_documento_id,
  i.numero_documento,
  i.nombres,
  i.apellidos,
  i.fecha_nacimiento,
  lower(regexp_replace(i.nombres,'\s+','', 'g')) || '.' || lower(split_part(i.apellidos,' ',1)) || '.' || right(i.numero_documento,3) || '@ugel-talara.gob.pe' AS email,
  i.area_destino_id,
  i.cargo_id,
  i.tipo_contrato_id,
  i.activo
FROM ins i
ON CONFLICT (tipo_documento_id, numero_documento) DO NOTHING;

-- Trabajaremos SIEMPRE con 40 personales activos para el seed (aunque tengas más en la tabla)
CREATE TEMP TABLE tmp_personal_fixed ON COMMIT DROP AS
SELECT
  row_number() OVER (ORDER BY id) AS idx,
  id
FROM public.personal
WHERE activo = TRUE
ORDER BY id
LIMIT 40;

CREATE TEMP TABLE tmp_personal_cnt ON COMMIT DROP AS
SELECT COUNT(*)::int AS cnt FROM tmp_personal_fixed;

-- ------------------------------------------------------------
-- 4) VISITANTES (pool grande para 15 años)
-- ------------------------------------------------------------
WITH data AS (
  SELECT
    ARRAY['Juan','Pedro','Carlos','José','Luis','Jorge','Ricardo','Héctor','Eduardo','Víctor','Manuel','Raúl','Óscar','Santiago','Diego','Bruno','Andrés','Alonso','Renzo','Pablo',
          'Ana','María','Rosa','Carmen','Patricia','Lucía','Elena','Milagros','Karla','Vanessa','Mariana','Sofía','Diana','Paola','Ruth','Mónica','Claudia','Beatriz','Lorena','Esther']::text[] AS nombres,
    ARRAY['Vargas','Ríos','Benites','Cabrera','Solis','Espinoza','Carrillo','Vega','Campos','Navarro','Aguilar','Pacheco','Bustamante','Córdova','Ibáñez','Ochoa','Zúñiga','Guerra','Hidalgo','Farro',
          'López','García','Sánchez','Rodríguez','Flores','Díaz','Torres','Ramírez','Castillo','Salazar','Reyes','Mendoza','Paredes','Quispe','Valdivia','Chávez']::text[] AS apellidos,
    ARRAY['SAC','EIRL','SRL','S.A.C.','S.A.A.','S.A.']::text[] AS suf_emp
),
base AS (
  SELECT
    gs,
    random() AS r_tipo,
    random() AS r_n1,
    random() AS r_a1,
    random() AS r_a2
  FROM generate_series(1,25000) gs
),
calc AS (
  SELECT
    CASE
      WHEN r_tipo < 0.85 THEN 1 -- DNI
      WHEN r_tipo < 0.95 THEN 2 -- CE
      ELSE 4                    -- RUC
    END AS tipo_documento_id,
    CASE
      WHEN r_tipo < 0.85 THEN lpad((40000000 + gs)::text, 8, '0')
      WHEN r_tipo < 0.95 THEN lpad((9000000 + gs)::text, 9, '0')
      ELSE (20000000000 + gs)::text
    END AS numero_documento,
    CASE
      WHEN r_tipo < 0.95 THEN (SELECT nombres[1 + floor(r_n1*array_length(nombres,1))::int] FROM data)
      ELSE 'EMPRESA ' || (SELECT apellidos[1 + floor(r_a1*array_length(apellidos,1))::int] FROM data)
    END AS nombres,
    CASE
      WHEN r_tipo < 0.95 THEN
        (SELECT apellidos[1 + floor(r_a1*array_length(apellidos,1))::int] FROM data)
        || ' ' ||
        (SELECT apellidos[1 + floor(r_a2*array_length(apellidos,1))::int] FROM data)
      ELSE (SELECT suf_emp[1 + floor(random()*array_length(suf_emp,1))::int] FROM data)
    END AS apellidos
  FROM base
)
INSERT INTO public.visitante (tipo_documento_id, numero_documento, nombres, apellidos, fecha_ultima_actualizacion_api)
SELECT
  c.tipo_documento_id,
  c.numero_documento,
  c.nombres,
  c.apellidos,
  (TIMESTAMPTZ '2025-12-10 10:00:00-05' - (random() * INTERVAL '365 days'))
FROM calc c
ON CONFLICT (tipo_documento_id, numero_documento) DO NOTHING;

-- ------------------------------------------------------------
-- 5) DÍAS HÁBILES (temp) = L-V y NO feriados
-- ------------------------------------------------------------

-- Función temporal para calcular Pascua (Meeus/Jones/Butcher)
CREATE OR REPLACE FUNCTION public._seed_easter_date(p_year int)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  a int; b int; c int; d int; e int; f int; g int; h int; i int; k int; l int; m int;
  month int; day int;
BEGIN
  a := p_year % 19;
  b := p_year / 100;
  c := p_year % 100;
  d := b / 4;
  e := b % 4;
  f := (b + 8) / 25;
  g := (b - f + 1) / 3;
  h := (19*a + b - d - g + 15) % 30;
  i := c / 4;
  k := c % 4;
  l := (32 + 2*e + 2*i - h - k) % 7;
  m := (a + 11*h + 22*l) / 451;
  month := (h + l - 7*m + 114) / 31;
  day   := ((h + l - 7*m + 114) % 31) + 1;
  RETURN make_date(p_year, month, day);
END;
$$;

CREATE TEMP TABLE tmp_feriados (fecha date PRIMARY KEY) ON COMMIT DROP;

DO $$
DECLARE
  y int;
  pascua date;
BEGIN
  FOR y IN 2010..2025 LOOP
    -- Fijos (Perú)
    INSERT INTO tmp_feriados(fecha) VALUES
      (make_date(y,1,1)),
      (make_date(y,5,1)),
      (make_date(y,6,29)),
      (make_date(y,7,28)),
      (make_date(y,7,29)),
      (make_date(y,8,30)),
      (make_date(y,10,8)),
      (make_date(y,11,1)),
      (make_date(y,12,8)),
      (make_date(y,12,25))
    ON CONFLICT DO NOTHING;

    -- Batalla de Ayacucho (festivo 2022+)
    IF y >= 2022 THEN
      INSERT INTO tmp_feriados(fecha) VALUES (make_date(y,12,9)) ON CONFLICT DO NOTHING;
    END IF;

    -- Semana Santa (Jueves y Viernes Santo)
    pascua := public._seed_easter_date(y);
    INSERT INTO tmp_feriados(fecha) VALUES (pascua - 3), (pascua - 2) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

CREATE TEMP TABLE tmp_dias_habiles (dia date PRIMARY KEY) ON COMMIT DROP;

INSERT INTO tmp_dias_habiles(dia)
SELECT d::date
FROM generate_series(DATE '2010-01-01', DATE '2025-12-10', INTERVAL '1 day') d
WHERE EXTRACT(ISODOW FROM d) BETWEEN 1 AND 5
  AND NOT EXISTS (SELECT 1 FROM tmp_feriados f WHERE f.fecha = d::date);

-- ------------------------------------------------------------
-- 6) ASISTENCIA (40 por día) + MOVIMIENTOS + JUSTIFICACIONES
--    Estados: PRESENTE, TARDANZA, PERMISO, AUSENTE
-- ------------------------------------------------------------
WITH rr AS (SELECT rrhh_id FROM tmp_ids),
base AS (
  SELECT
    p.id AS personal_id,
    d.dia AS dia,
    random() AS r_estado,
    random() AS r_tiempo,
    random() AS r_salida,
    random() AS r_misc
  FROM tmp_personal_fixed p
  CROSS JOIN tmp_dias_habiles d
),
calc AS (
  SELECT
    b.personal_id,
    b.dia,
    CASE
      WHEN b.r_estado < 0.82 THEN 'Presente'
      WHEN b.r_estado < 0.92 THEN 'Tardanza'
      WHEN b.r_estado < 0.97 THEN 'Permiso'
      ELSE 'Ausente'
    END AS estado_presencia,

    -- ingreso SIEMPRE (NOT NULL en tabla)
    CASE
      WHEN b.r_estado < 0.82 THEN (b.dia::timestamptz + TIME '08:45' + (b.r_tiempo * INTERVAL '20 minutes'))
      WHEN b.r_estado < 0.92 THEN (b.dia::timestamptz + TIME '09:01' + (b.r_tiempo * INTERVAL '69 minutes'))
      ELSE (b.dia::timestamptz + TIME '09:00')
    END AS ingreso_ts,

    -- salida solo si PRESENTE/TARDANZA
    CASE
      WHEN b.r_estado < 0.92 THEN (b.dia::timestamptz + TIME '17:00' + (b.r_salida * INTERVAL '40 minutes'))
      ELSE NULL::timestamptz
    END AS salida_ts,

    CASE
      WHEN b.r_estado >= 0.82 AND b.r_estado < 0.92
        THEN GREATEST(0, floor(EXTRACT(EPOCH FROM (
          (b.dia::timestamptz + TIME '09:01' + (b.r_tiempo * INTERVAL '69 minutes')) - (b.dia::timestamptz + TIME '09:00')
        )) / 60)::int)
      ELSE 0
    END AS minutos_tardanza,

    CASE
      WHEN b.r_estado < 0.82 THEN NULL
      WHEN b.r_estado < 0.92 THEN (CASE WHEN b.r_misc < 0.5 THEN 'Retraso transporte.' ELSE 'Tráfico pesado.' END)
      WHEN b.r_estado < 0.97 THEN 'Permiso salud/personal.'
      ELSE 'Sin justificación.'
    END AS observacion
  FROM base b
),
ins AS (
  INSERT INTO public.controlasistenciapersonal
    (personal_id, ingreso, salida, estado_presencia, minutos_tardanza, observacion,
     usuario_registro_id, fecha_registro, updated_at)
  SELECT
    c.personal_id,
    c.ingreso_ts,
    c.salida_ts,
    c.estado_presencia,
    c.minutos_tardanza,
    c.observacion,
    (SELECT rrhh_id FROM rr),
    c.dia::timestamptz + TIME '17:30',
    c.dia::timestamptz + TIME '17:30'
  FROM calc c
  RETURNING id, personal_id, (ingreso::date) AS dia, estado_presencia, ingreso, salida, minutos_tardanza
),
mov AS (
  -- Movimientos solo cuando hubo jornada (PRESENTE o TARDANZA)
  INSERT INTO public.movimiento_asistencia (control_asistencia_id, tipo, fecha_hora, observacion, usuario_registro_id)
  SELECT id, 'INGRESO', ingreso, NULL, (SELECT rrhh_id FROM tmp_ids)
  FROM ins WHERE estado_presencia IN ('Presente','Tardanza')
  UNION ALL
  SELECT id, 'SALIDA_REFRIGERIO',
         (dia::timestamptz + TIME '13:00' + (random() * INTERVAL '10 minutes')),
         'Refrigerio', (SELECT rrhh_id FROM tmp_ids)
  FROM ins WHERE estado_presencia IN ('Presente','Tardanza')
  UNION ALL
  SELECT id, 'RETORNO_REFRIGERIO',
         (dia::timestamptz + TIME '14:00' + (random() * INTERVAL '10 minutes')),
         'Retorno refrigerio', (SELECT rrhh_id FROM tmp_ids)
  FROM ins WHERE estado_presencia IN ('Presente','Tardanza')
  UNION ALL
  SELECT id, 'SALIDA', salida, NULL, (SELECT rrhh_id FROM tmp_ids)
  FROM ins
  WHERE estado_presencia IN ('Presente','Tardanza') AND salida IS NOT NULL
  RETURNING 1
),
jus AS (
  INSERT INTO public.justificacion
    (control_asistencia_id, estado, motivo, evidencia_url,
     usuario_solicitante_id, fecha_solicitud,
     usuario_respuesta_id, fecha_respuesta, observacion_respuesta)
  SELECT
    x.id AS control_asistencia_id,

    -- 60% APROBADA, 39.8% RECHAZADA, 0.2% PENDIENTE
    CASE
      WHEN x.r < 0.60  THEN 'APROBADA'
      WHEN x.r < 0.998 THEN 'RECHAZADA'
      ELSE 'PENDIENTE'
    END AS estado,

    x.motivo,
    NULL AS evidencia_url,

    -- Si existe usuario ligado a ese personal, úsalo; si no, cae a RRHH
    COALESCE(u_personal.id, (SELECT rrhh_id FROM tmp_ids)) AS usuario_solicitante_id,

    -- PENDIENTE: SOLO noviembre y diciembre 2025 (realista)
    CASE
      WHEN x.r >= 0.998 THEN
        (DATE '2025-11-01' + floor(random()*61)::int)::timestamptz
        + TIME '08:00'
        + (random() * INTERVAL '9 hours')
      ELSE
        (x.dia::timestamptz + TIME '09:10')
    END AS fecha_solicitud,

    -- Respuesta solo si NO está pendiente
    CASE
      WHEN x.r < 0.998 THEN (SELECT admin_id FROM tmp_ids)
      ELSE NULL
    END AS usuario_respuesta_id,

    CASE
      WHEN x.r < 0.998 THEN
        (COALESCE(x.dia::timestamptz + TIME '09:10', CURRENT_TIMESTAMP)
         + INTERVAL '10 minutes'
         + random()*INTERVAL '3 hours')
      ELSE NULL
    END AS fecha_respuesta,

    CASE
      WHEN x.r < 0.60  THEN 'Aprobación RRHH (seed)'
      WHEN x.r < 0.998 THEN 'Rechazo RRHH (seed)'
      ELSE NULL
    END AS observacion_respuesta

  FROM (
    -- Misma lógica de "cuándo crear justificación" que ya tenías
    SELECT
      i.*,
      random() AS r,
      CASE
        WHEN i.estado_presencia = 'Permiso' THEN
          CASE
            WHEN random() < 0.33 THEN 'Cita médica ESSALUD'
            WHEN random() < 0.66 THEN 'Comisión de servicio'
            ELSE 'Trámite personal'
          END
        WHEN i.estado_presencia = 'Tardanza' THEN
          CASE WHEN random() < 0.5 THEN 'Tráfico pesado' ELSE 'Falla de movilidad' END
        ELSE
          'Inasistencia no sustentada'
      END AS motivo
    FROM ins i
    WHERE
      (i.estado_presencia = 'Permiso')
      OR (i.estado_presencia = 'Tardanza' AND i.minutos_tardanza >= 20 AND random() < 0.35)
      OR (i.estado_presencia = 'Ausente' AND random() < 0.12)
  ) x
  LEFT JOIN public.usuario u_personal ON u_personal.personal_id = x.personal_id
  RETURNING 1
)


-- ------------------------------------------------------------
-- 7) VISITAS (100 por día hábil)
--    Estados: FINALIZADA, RECHAZADA, DELEGADO
--    fecha_salida SIEMPRE llena (evita choque de "visita activa")
-- ------------------------------------------------------------
CREATE TEMP TABLE tmp_areas ON COMMIT DROP AS
SELECT row_number() OVER (ORDER BY id) AS idx, id
FROM public.areadestino
WHERE activa = TRUE
ORDER BY id;

CREATE TEMP TABLE tmp_areas_cnt ON COMMIT DROP AS
SELECT COUNT(*)::int AS cnt FROM tmp_areas;

CREATE TEMP TABLE tmp_motivos ON COMMIT DROP AS
SELECT row_number() OVER (ORDER BY id) AS idx, id
FROM public.motivovisita
WHERE activo = TRUE
ORDER BY id;

CREATE TEMP TABLE tmp_motivos_cnt ON COMMIT DROP AS
SELECT COUNT(*)::int AS cnt FROM tmp_motivos;

WITH vmax AS (SELECT MAX(id)::int AS max_id FROM public.visitante),
dias AS (SELECT dia FROM tmp_dias_habiles),
base AS (
  SELECT
    d.dia,
    gs AS n,
    random() AS r_estado,
    random() AS r_time,
    random() AS r_vist,
    random() AS r_area,
    random() AS r_motivo,
    random() AS r_p1,
    random() AS r_p2,
    random() AS r_dur
  FROM dias d
  CROSS JOIN generate_series(1,100) gs
),
idxs AS (
  SELECT
    b.*,
    (1 + floor(b.r_area   * (SELECT cnt FROM tmp_areas_cnt))::int)   AS area_idx,
    (1 + floor(b.r_motivo * (SELECT cnt FROM tmp_motivos_cnt))::int) AS motivo_idx,
    (1 + floor(b.r_p1     * (SELECT cnt FROM tmp_personal_cnt))::int) AS p1_idx_raw,
    (1 + floor(b.r_p2     * (SELECT cnt FROM tmp_personal_cnt))::int) AS p2_idx_raw
  FROM base b
),
calc AS (
  SELECT
    -- visitante_id: 1..max_id (porque truncamos + RESTART IDENTITY)
    (SELECT 1 + floor(i.r_vist * (SELECT max_id FROM vmax))::int FROM vmax) AS visitante_id,
    a.id AS area_destino_id,
    m.id AS motivo_visita_id,
    p1.id AS personal_base_id,
    p2.id AS personal_alt_id,
    (i.dia::timestamptz + TIME '08:00' + (i.r_time * INTERVAL '540 minutes')) AS fecha_ingreso,
    i.r_estado,
    i.r_dur,
    i.n,
    i.dia
  FROM idxs i
  JOIN tmp_areas   a  ON a.idx = i.area_idx
  JOIN tmp_motivos m  ON m.idx = i.motivo_idx
  JOIN tmp_personal_fixed p1 ON p1.idx = i.p1_idx_raw
  JOIN tmp_personal_fixed p2 ON p2.idx = CASE WHEN i.p2_idx_raw = i.p1_idx_raw THEN ((i.p2_idx_raw % (SELECT cnt FROM tmp_personal_cnt)) + 1) ELSE i.p2_idx_raw END
),
prep AS (
  SELECT
    c.*,
    CASE
      WHEN c.r_estado < 0.76 THEN 'FINALIZADA'
      WHEN c.r_estado < 0.91 THEN 'RECHAZADA'
      ELSE 'DELEGADO'
    END AS estado_visita,
    (c.fecha_ingreso + (INTERVAL '1 minute' * (2 + floor(random()*8)::int)))  AS fecha_aceptacion,
    (c.fecha_ingreso + (INTERVAL '1 minute' * (2 + floor(random()*10)::int))) AS fecha_rechazo,
    (c.fecha_ingreso + (INTERVAL '1 minute' * (5 + floor(random()*20)::int))) AS fecha_delegacion
  FROM calc c
)
INSERT INTO public.registrovisita (
  sync_id, estado_visita,
  visitante_id, area_destino_id, motivo_visita_id,
  personal_visitado_id, delegado_por_id,
  usuario_ingreso_id, usuario_salida_id,
  fecha_ingreso, fecha_salida, fecha_aceptacion, fecha_rechazo,
  motivo_rechazo, fecha_delegacion,
  fecha_limite_ingreso, fecha_limite_salida, fecha_fin_atencion
)
SELECT
  'seed-' || to_char(p.fecha_ingreso, 'YYYYMMDDHH24MISSMS') || '-' || p.visitante_id::text || '-' || p.n::text,
  p.estado_visita,

  p.visitante_id,
  p.area_destino_id,
  p.motivo_visita_id,

  CASE WHEN p.estado_visita = 'DELEGADO' THEN p.personal_alt_id ELSE p.personal_base_id END,
  CASE WHEN p.estado_visita = 'DELEGADO' THEN p.personal_base_id ELSE NULL END,

  (SELECT vigilante_id FROM tmp_ids),
  CASE WHEN p.estado_visita IN ('FINALIZADA','RECHAZADA','DELEGADO') THEN (SELECT vigilante_id FROM tmp_ids) ELSE NULL END,

  p.fecha_ingreso,

  CASE
    WHEN p.estado_visita = 'FINALIZADA' THEN (p.fecha_aceptacion + (INTERVAL '1 minute' * (10 + floor(p.r_dur*90)::int)))
    WHEN p.estado_visita = 'RECHAZADA'  THEN p.fecha_rechazo
    ELSE (p.fecha_delegacion + (INTERVAL '1 minute' * (10 + floor(p.r_dur*50)::int)))
  END AS fecha_salida,

  CASE WHEN p.estado_visita IN ('FINALIZADA','DELEGADO') THEN p.fecha_aceptacion ELSE NULL END,
  CASE WHEN p.estado_visita = 'RECHAZADA' THEN p.fecha_rechazo ELSE NULL END,

  CASE WHEN p.estado_visita = 'RECHAZADA' THEN 'No cumple requisitos / No disponible' ELSE NULL END,
  CASE WHEN p.estado_visita = 'DELEGADO' THEN p.fecha_delegacion ELSE NULL END,

  NULL, NULL,

  CASE
    WHEN p.estado_visita = 'FINALIZADA' THEN (p.fecha_aceptacion + (INTERVAL '1 minute' * (10 + floor(p.r_dur*90)::int)))
    WHEN p.estado_visita = 'RECHAZADA'  THEN p.fecha_rechazo
    ELSE (p.fecha_delegacion + (INTERVAL '1 minute' * (10 + floor(p.r_dur*50)::int)))
  END
FROM prep p
ON CONFLICT DO NOTHING;

/*-- ------------------------------------------------------------
-- 8) PAPELETA EXTERNA (simulación)
--    ~2% de cruces (día hábil x personal) => varios miles
-- ------------------------------------------------------------
WITH d AS (SELECT dia FROM tmp_dias_habiles),
p AS (
  SELECT p.id AS id, p.numero_documento, p.nombres, p.apellidos, p.area_destino_id
  FROM tmp_personal_fixed pf
  JOIN public.personal p ON p.id = pf.id
),
a AS (SELECT id, nombre_area FROM public.areadestino),
base AS (
  SELECT
    d.dia,
    p.*,
    random() AS r,
    row_number() OVER () AS rn
  FROM d
  JOIN p ON TRUE
  WHERE random() < 0.02
)
INSERT INTO public.papeletaexterna (
  external_id, codigo_papeleta,
  solicitante_dni, solicitante_nombres, solicitante_apellidos, solicitante_area,
  motivo, motivo_detalle,
  fecha_salida, fecha_retorno,
  estado_original, estado_virtual,
  fecha_sincronizacion
)
SELECT
  'PEX-' || to_char(b.dia, 'YYYYMMDD') || '-' || lpad(b.rn::text, 6, '0'),
  'PAP-' || to_char(b.dia, 'YYYYMMDD') || '-' || right(b.numero_documento, 4),
  b.numero_documento,
  b.nombres,
  b.apellidos,
  (SELECT nombre_area FROM a WHERE a.id = b.area_destino_id),
  CASE
    WHEN b.r < 0.40 THEN 'COMISION'
    WHEN b.r < 0.70 THEN 'SALUD'
    ELSE 'TRAMITE'
  END,
  CASE
    WHEN b.r < 0.40 THEN 'Comisión de servicio externa'
    WHEN b.r < 0.70 THEN 'Atención médica / ESSALUD'
    ELSE 'Trámite personal'
  END,
  (b.dia::timestamptz + TIME '11:00' + random()*INTERVAL '90 minutes'),
  (b.dia::timestamptz + TIME '14:00' + random()*INTERVAL '120 minutes'),
  CASE
    WHEN b.r < 0.85 THEN 'APROBADA'
    WHEN b.r < 0.95 THEN 'PENDIENTE'
    ELSE 'RECHAZADA'
  END,
  CASE
    WHEN b.r < 0.85 THEN 'APROBADA'
    WHEN b.r < 0.95 THEN 'PENDIENTE'
    ELSE 'RECHAZADA'
  END,
  (b.dia::timestamptz + TIME '18:00')
FROM base b
ON CONFLICT DO NOTHING;
*/

-- Limpieza de función auxiliar
DROP FUNCTION IF EXISTS public._seed_easter_date(int);

COMMIT;

-- ============================================================
-- FIN SEED OPERATIVO
-- ============================================================
