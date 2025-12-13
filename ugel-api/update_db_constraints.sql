-- Script para actualizar la restricción CHECK en la tabla movimiento_asistencia
-- Permite los nuevos tipos 'SALIDA_INTERMITENTE' e 'INGRESO_INTERMITENTE'

BEGIN;

-- 1. Eliminar la restricción actual
ALTER TABLE public.movimiento_asistencia 
DROP CONSTRAINT IF EXISTS movimiento_asistencia_tipo_check;

-- 2. Añadir la nueva restricción con los nuevos tipos permitidos
ALTER TABLE public.movimiento_asistencia 
ADD CONSTRAINT movimiento_asistencia_tipo_check 
CHECK (tipo IN ('INGRESO', 'SALIDA_REFRIGERIO', 'RETORNO_REFRIGERIO', 'SALIDA', 'SALIDA_INTERMITENTE', 'INGRESO_INTERMITENTE'));

COMMIT;

-- Nota: Ejecute este script en su cliente de PostgreSQL (pgAdmin, DBeaver, psql, etc.)
