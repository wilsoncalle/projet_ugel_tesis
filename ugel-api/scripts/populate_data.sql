-- =================================================================================
-- SCRIPT FINAL BLINDADO (UGEL) - SIN ERRORES DE DUPLICADOS
-- FECHA: 01/09/2025 AL 10/12/2025
-- CORRECCIÓN: Manejo de fecha_salida en rechazados y ON CONFLICT para ignorar duplicados
-- =================================================================================

BEGIN;

-- 1. SINCRONIZAR SECUENCIAS
SELECT setval('public.visitantes_id_seq', COALESCE((SELECT MAX(id) FROM public.visitantes), 1));
SELECT setval('public.controlasistenciapersonal_id_seq', COALESCE((SELECT MAX(id) FROM public.controlasistenciapersonal), 1));
SELECT setval('public.registrosvisitas_id_seq', COALESCE((SELECT MAX(id) FROM public.registrosvisitas), 1));
ALTER TABLE public.justificaciones ALTER COLUMN id RESTART WITH 100;

-- =================================================================================
-- BLOQUE ANÓNIMO
-- =================================================================================
DO $$
DECLARE
    -- Rango de fechas
    fecha_inicio DATE := '2025-09-01';
    fecha_fin DATE := '2025-12-10';
    dia_actual DATE;
    dia_semana INTEGER;
    es_feriado BOOLEAN;
    
    -- Variables generales
    rec_personal RECORD;
    asistencia_id BIGINT;
    
    -- Variables Asistencia
    rand_situacion INTEGER;
    v_hora_ingreso TIME;
    v_hora_salida TIME;
    v_estado_asistencia VARCHAR;
    v_minutos_tarde INTEGER;
    v_observacion TEXT;
    
    -- Variables Visitas
    i INTEGER;
    num_visitas_dia INTEGER;
    v_visitante_id BIGINT;
    v_area_id INTEGER;
    v_personal_id INTEGER;
    v_motivo_id INTEGER;
    v_hora_ingreso_visita TIMESTAMP;
    v_duracion INTERVAL;
    v_estado_visita VARCHAR;
    v_rand_estado INTEGER;
    v_fecha_rechazo TIMESTAMP;
    v_motivo_rechazo TEXT;
    v_delegado_por INTEGER;
    v_fecha_delegacion TIMESTAMP;
    v_fecha_salida_visita TIMESTAMP;
    v_fecha_fin_atencion TIMESTAMP;
    
    -- Arrays de nombres extra
    nombres_nuevos TEXT[] := ARRAY['Roberto', 'Daniel', 'Esther', 'Martha', 'Julio', 'Cesar', 'Vanessa', 'Monica', 'Eduardo', 'Hector', 'Beatriz', 'Lorena', 'Gustavo', 'Adolfo', 'Pilar', 'Cecilia', 'Raquel', 'Enrique', 'Salvador', 'Gloria'];
    apellidos_nuevos TEXT[] := ARRAY['Vargas', 'Rios', 'Benites', 'Cabrera', 'Solis', 'Espinoza', 'Carrillo', 'Vega', 'Campos', 'Navarro', 'Aguilar', 'Pacheco', 'Bustamante', 'Cordova', 'Ibáñez', 'Ochoa', 'Zuniga', 'Guerra', 'Hidalgo', 'Farro'];
    
BEGIN

    -- -----------------------------------------------------------------------------
    -- 1. INSERTAR VISITANTES NUEVOS (Ignorando si ya existen)
    -- -----------------------------------------------------------------------------
    FOR i IN 1..40 LOOP
        INSERT INTO public.visitantes (tipo_documento_id, numero_documento, nombres, apellidos)
        VALUES (
            1, 
            (45000000 + floor(random() * 9000000))::text, 
            nombres_nuevos[1 + floor(random() * array_length(nombres_nuevos, 1))::int],
            apellidos_nuevos[1 + floor(random() * array_length(apellidos_nuevos, 1))::int] || ' ' || apellidos_nuevos[1 + floor(random() * array_length(apellidos_nuevos, 1))::int]
        ) ON CONFLICT DO NOTHING; 
    END LOOP;

    -- -----------------------------------------------------------------------------
    -- 2. RECORRIDO POR DÍAS
    -- -----------------------------------------------------------------------------
    dia_actual := fecha_inicio;
    
    WHILE dia_actual <= fecha_fin LOOP
        
        dia_semana := EXTRACT(ISODOW FROM dia_actual); 
        es_feriado := (dia_actual IN ('2025-10-08', '2025-11-01', '2025-12-08', '2025-12-09'));

        IF dia_semana BETWEEN 1 AND 5 AND NOT es_feriado THEN
        
            -- =====================================================================
            -- A. ASISTENCIA
            -- =====================================================================
            FOR rec_personal IN SELECT id FROM public.personal ORDER BY id LOOP
                IF NOT EXISTS (SELECT 1 FROM public.controlasistenciapersonal WHERE personal_id = rec_personal.id AND fecha = dia_actual) THEN
                    
                    rand_situacion := floor(random() * 100); 
                    v_hora_ingreso := NULL; v_hora_salida := NULL; v_minutos_tarde := 0; v_observacion := NULL; v_estado_asistencia := 'PRESENTE';

                    IF rand_situacion < 80 THEN -- PUNTUAL
                        v_hora_ingreso := '08:45:00'::time + (random() * interval '15 minutes');
                        v_hora_salida := '17:00:00'::time + (random() * interval '20 minutes');
                        v_estado_asistencia := 'PRESENTE';
                    ELSIF rand_situacion < 90 THEN -- TOLERANCIA
                        v_hora_ingreso := '09:00:01'::time + (random() * interval '10 minutes');
                        v_hora_salida := '17:00:00'::time + (random() * interval '10 minutes');
                        v_minutos_tarde := EXTRACT(EPOCH FROM (v_hora_ingreso - '09:00:00'::time)) / 60;
                        v_estado_asistencia := 'TARDANZA';
                        v_observacion := 'Ingreso en tolerancia.';
                    ELSIF rand_situacion < 95 THEN -- TARDE
                        v_hora_ingreso := '09:11:00'::time + (random() * interval '50 minutes');
                        v_hora_salida := '17:00:00'::time;
                        v_minutos_tarde := EXTRACT(EPOCH FROM (v_hora_ingreso - '09:00:00'::time)) / 60;
                        v_estado_asistencia := 'TARDANZA';
                        v_observacion := 'Retraso transporte.';
                    ELSIF rand_situacion < 98 THEN -- PERMISO
                        v_estado_asistencia := 'PERMISO';
                        v_observacion := 'Permiso salud/personal.';
                    ELSE -- FALTA
                        v_estado_asistencia := 'AUSENTE';
                        v_observacion := 'Sin justificación.';
                    END IF;

                    INSERT INTO public.controlasistenciapersonal (
                        personal_id, fecha, hora_ingreso, hora_salida, estado_presencia, 
                        usuario_registro_id, minutos_tardanza, observacion
                    ) VALUES (
                        rec_personal.id, dia_actual, v_hora_ingreso, v_hora_salida, v_estado_asistencia,
                        3, v_minutos_tarde, v_observacion
                    ) RETURNING id INTO asistencia_id;

                    IF v_estado_asistencia = 'PERMISO' THEN
                         INSERT INTO public.justificaciones (control_asistencia_id, motivo, estado, usuario_solicitante_id, fecha_respuesta, usuario_respuesta_id) 
                         VALUES (asistencia_id, 'Cita médica ESSALUD', 'APROBADA', rec_personal.id, dia_actual, 1);
                    ELSIF v_estado_asistencia = 'TARDANZA' AND rand_situacion > 93 THEN
                         INSERT INTO public.justificaciones (control_asistencia_id, motivo, estado, usuario_solicitante_id) 
                         VALUES (asistencia_id, 'Tráfico pesado', 'PENDIENTE', rec_personal.id);
                    END IF;
                END IF;
            END LOOP;

            -- =====================================================================
            -- B. VISITAS
            -- =====================================================================
            num_visitas_dia := 8 + floor(random() * 12)::int;

            FOR i IN 1..num_visitas_dia LOOP
                
                v_visitante_id := (SELECT id FROM public.visitantes ORDER BY random() LIMIT 1);
                v_area_id := (SELECT id FROM public.areasdestino ORDER BY random() LIMIT 1);
                v_personal_id := (SELECT id FROM public.personal WHERE area_destino_id = v_area_id ORDER BY random() LIMIT 1);
                IF v_personal_id IS NULL THEN v_personal_id := (SELECT id FROM public.personal ORDER BY random() LIMIT 1); END IF;
                v_motivo_id := (SELECT id FROM public.motivosvisita ORDER BY random() LIMIT 1);
                v_hora_ingreso_visita := dia_actual + ('08:30:00'::time + (random() * interval '450 minutes'));
                
                v_rand_estado := floor(random() * 100);
                v_fecha_rechazo := NULL; v_motivo_rechazo := NULL; v_delegado_por := NULL; 
                v_fecha_delegacion := NULL; v_fecha_salida_visita := NULL; v_fecha_fin_atencion := NULL;

                IF v_rand_estado < 80 THEN -- FINALIZADA
                    v_estado_visita := 'FINALIZADA';
                    IF random() < 0.5 THEN v_duracion := '15 minutes'; ELSE v_duracion := '45 minutes'; END IF;
                    v_fecha_salida_visita := v_hora_ingreso_visita + v_duracion;
                    v_fecha_fin_atencion := v_fecha_salida_visita;

                ELSIF v_rand_estado < 90 THEN -- RECHAZADA
                    v_estado_visita := 'RECHAZADA';
                    v_fecha_rechazo := v_hora_ingreso_visita + interval '5 minutes';
                    v_motivo_rechazo := 'No cumple requisitos / No disponible';
                    -- IMPORTANTE: Ponemos fecha salida igual a rechazo para no violar el índice UNIQUE de "visita activa"
                    v_fecha_salida_visita := v_fecha_rechazo; 
                    v_fecha_fin_atencion := v_fecha_rechazo;

                ELSE -- DELEGADO
                    v_estado_visita := 'DELEGADO';
                    v_delegado_por := v_personal_id;
                    v_personal_id := (SELECT id FROM public.personal WHERE id <> v_delegado_por ORDER BY random() LIMIT 1); 
                    v_fecha_delegacion := v_hora_ingreso_visita + interval '10 minutes';
                    v_fecha_salida_visita := v_fecha_delegacion + interval '20 minutes';
                    v_fecha_fin_atencion := v_fecha_salida_visita;
                END IF;

                -- INSERT BLINDADO CON "ON CONFLICT DO NOTHING"
                -- Esto evitará que el script falle si se genera un duplicado por azar
                INSERT INTO public.registrosvisitas (
                    visitante_id, area_destino_id, personal_visitado_id, motivo_visita_id,
                    fecha_ingreso, fecha_salida, usuario_ingreso_id, usuario_salida_id,
                    sync_id, estado_visita, fecha_rechazo, motivo_rechazo,
                    delegado_por_id, fecha_delegacion, fecha_fin_atencion
                ) VALUES (
                    v_visitante_id, v_area_id, v_personal_id, v_motivo_id,
                    v_hora_ingreso_visita, v_fecha_salida_visita,
                    3, CASE WHEN v_fecha_salida_visita IS NOT NULL THEN 3 ELSE NULL END,
                    'gen-' || to_char(v_hora_ingreso_visita, 'YYYYMMDDHH24MISSMS') || '-' || i,
                    v_estado_visita, v_fecha_rechazo, v_motivo_rechazo,
                    v_delegado_por, v_fecha_delegacion, v_fecha_fin_atencion
                )
                ON CONFLICT DO NOTHING; -- <--- AQUÍ ESTÁ LA MAGIA QUE EVITA EL ERROR

            END LOOP;
        END IF; 
        dia_actual := dia_actual + 1;
    END LOOP;
END $$;

COMMIT;