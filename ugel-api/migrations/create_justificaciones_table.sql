CREATE TABLE public.justificaciones (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    control_asistencia_id bigint NOT NULL,
    motivo text NOT NULL,
    evidencia_url text,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    fecha_solicitud timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    usuario_solicitante_id integer NOT NULL,
    fecha_respuesta timestamp without time zone,
    usuario_respuesta_id integer,
    observacion_respuesta text,
    CONSTRAINT justificaciones_pkey PRIMARY KEY (id),
    CONSTRAINT justificaciones_control_asistencia_id_fkey FOREIGN KEY (control_asistencia_id)
        REFERENCES public.controlasistenciapersonal (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);
