-- Script de actualización de base de datos para UGEL
-- Ejecutar este script en su base de datos PostgreSQL

-- 1. Agregar fecha_nacimiento y email a la tabla personal
ALTER TABLE public.personal 
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
ADD COLUMN IF NOT EXISTS email VARCHAR(150);

-- 2. Modificar la tabla registrosvisitas para el nuevo flujo de visitas
ALTER TABLE public.registrosvisitas
ADD COLUMN IF NOT EXISTS estado_visita VARCHAR(20) DEFAULT 'PENDIENTE' NOT NULL, -- PENDIENTE, ACEPTADO, RECHAZADO, DELEGADO, FINALIZADO, NO_PRESENTADO
ADD COLUMN IF NOT EXISTS fecha_aceptacion TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS fecha_rechazo TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT,
ADD COLUMN IF NOT EXISTS delegado_por_id INTEGER REFERENCES public.personal(id), -- Personal que realizó la delegación
ADD COLUMN IF NOT EXISTS fecha_delegacion TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS fecha_limite_ingreso TIMESTAMP WITHOUT TIME ZONE, -- Para la regla de 5 min
ADD COLUMN IF NOT EXISTS fecha_limite_salida TIMESTAMP WITHOUT TIME ZONE;  -- Para la regla de 30 min

-- 3. Crear tabla de configuración para asistencia (Tolerancias configurables por personal o global)
-- Reemplaza a la tabla configuracion_asistencia anterior si existiera
DROP TABLE IF EXISTS public.configuracion_asistencia;

CREATE TABLE IF NOT EXISTS public.config_asistencia_personal (
    id SERIAL PRIMARY KEY,
    personal_id INTEGER REFERENCES public.personal(id) ON DELETE CASCADE, -- NULL indica configuración global por defecto
    minutos_tolerancia_por_dia INTEGER NOT NULL DEFAULT 10,
    dias_tolerancia_por_mes INTEGER NOT NULL DEFAULT 10,
    aplica_desde DATE NOT NULL DEFAULT CURRENT_DATE,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice único para asegurar solo una configuración por personal (y permitir múltiples NULLs si la BD lo permite, pero controlaremos por lógica)
CREATE UNIQUE INDEX IF NOT EXISTS idx_config_personal ON public.config_asistencia_personal(personal_id) WHERE personal_id IS NOT NULL;
-- Índice para la configuración global (solo una)
CREATE UNIQUE INDEX IF NOT EXISTS idx_config_global ON public.config_asistencia_personal((personal_id IS NULL)) WHERE personal_id IS NULL;

-- Insertar configuración global por defecto si no existe
INSERT INTO public.config_asistencia_personal (personal_id, minutos_tolerancia_por_dia, dias_tolerancia_por_mes)
SELECT NULL, 10, 10
WHERE NOT EXISTS (SELECT 1 FROM public.config_asistencia_personal WHERE personal_id IS NULL);

-- 4. Crear tabla para justificaciones de asistencia
CREATE TABLE IF NOT EXISTS public.justificaciones_asistencia (
    id SERIAL PRIMARY KEY,
    personal_id INTEGER NOT NULL REFERENCES public.personal(id),
    fecha_asistencia DATE NOT NULL,
    motivo TEXT NOT NULL,
    estado VARCHAR(20) DEFAULT 'PENDIENTE' NOT NULL, -- PENDIENTE, APROBADO, RECHAZADO
    fecha_creacion TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    documento_url VARCHAR(255),
    usuario_aprobacion_id INTEGER REFERENCES public.usuarios(id),
    fecha_aprobacion TIMESTAMP WITHOUT TIME ZONE,
    observacion_aprobacion TEXT
);

-- 5. Agregar columna para conteo explícito de minutos de tardanza en controlasistenciapersonal
ALTER TABLE public.controlasistenciapersonal
ADD COLUMN IF NOT EXISTS minutos_tardanza INTEGER DEFAULT 0;

-- 6. Indices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_registros_visitas_estado ON public.registrosvisitas(estado_visita);
CREATE INDEX IF NOT EXISTS idx_registros_visitas_personal_visitado ON public.registrosvisitas(personal_visitado_id);
CREATE INDEX IF NOT EXISTS idx_justificaciones_personal ON public.justificaciones_asistencia(personal_id);
