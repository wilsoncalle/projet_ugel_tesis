DO $$
DECLARE
  r record;
  seq_name text;
  max_id bigint;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
  LOOP
    seq_name := pg_get_serial_sequence(format('%I.%I', r.schema_name, r.table_name), 'id');

    IF seq_name IS NOT NULL THEN
      EXECUTE format('SELECT MAX(id) FROM %I.%I', r.schema_name, r.table_name) INTO max_id;

      IF max_id IS NULL THEN
        EXECUTE format('SELECT setval(%L, 1, false)', seq_name);
      ELSE
        EXECUTE format('SELECT setval(%L, %s, true)', seq_name, max_id);
      END IF;
    END IF;
  END LOOP;
END $$;
