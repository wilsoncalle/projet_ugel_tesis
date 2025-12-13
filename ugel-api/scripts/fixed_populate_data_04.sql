WITH data AS (
  SELECT
    ARRAY['Luis','Jorge','Miguel','Fernando','César','Ricardo','Héctor','Eduardo','Sergio','Bruno','Diego','Kevin','Andrés','Julio','Omar','Raúl','Manuel','Arturo','Gustavo','Piero',
          'Ana','Carmen','Patricia','Lucía','Elena','Milagros','Karla','Vanessa','Mariana','Sofía','Diana','Paola','Ruth','Mónica','Claudia','Beatriz','Lorena','Esther']::text[] AS nombres,
    ARRAY['Vargas','Ríos','Benites','Cabrera','Solis','Espinoza','Carrillo','Vega','Campos','Navarro','Aguilar','Pacheco','Bustamante','Córdova','Ibáñez','Ochoa','Zúñiga','Guerra','Hidalgo','Farro',
          'López','García','Sánchez','Rodríguez','Flores','Díaz','Torres','Ramírez','Castillo','Salazar','Reyes','Mendoza','Paredes','Quispe','Valdivia','Chávez']::text[] AS apellidos
),
targets AS (
  SELECT p.id, p.numero_documento
  FROM public.personal p
  WHERE p.tipo_documento_id = 1
    AND p.numero_documento ~ '^\d+$'
    AND p.numero_documento::int >= 70200000
    AND NOT EXISTS (SELECT 1 FROM public.usuario u WHERE u.personal_id = p.id)
),
rnd AS (
  SELECT
    t.id,
    d.nombres[1 + floor(random()*array_length(d.nombres,1))::int] AS new_nom,
    d.apellidos[1 + floor(random()*array_length(d.apellidos,1))::int] AS a1,
    d.apellidos[1 + floor(random()*array_length(d.apellidos,1))::int] AS a2
  FROM targets t
  CROSS JOIN data d
)
UPDATE public.personal p
SET
  nombres  = r.new_nom,
  apellidos = r.a1 || ' ' || r.a2,
  email = lower(regexp_replace(r.new_nom,'\s+','','g')) || '.' || lower(r.a1) || '.' || right(p.numero_documento,3) || '@ugel-talara.gob.pe'
FROM rnd r
WHERE p.id = r.id;
