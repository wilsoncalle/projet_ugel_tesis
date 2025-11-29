--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: prevent_delete_system_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_delete_system_user() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.es_sistema THEN
    RAISE EXCEPTION 'No se puede eliminar el usuario de sistema';
  END IF;
  RETURN OLD;
END;
$$;


ALTER FUNCTION public.prevent_delete_system_user() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: areasdestino; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.areasdestino (
    id integer NOT NULL,
    nombre_area character varying(150) NOT NULL,
    activa boolean DEFAULT true NOT NULL
);


ALTER TABLE public.areasdestino OWNER TO postgres;

--
-- Name: areasdestino_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.areasdestino_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.areasdestino_id_seq OWNER TO postgres;

--
-- Name: areasdestino_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.areasdestino_id_seq OWNED BY public.areasdestino.id;


--
-- Name: cargos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cargos (
    id integer NOT NULL,
    nombre_cargo character varying(150) NOT NULL,
    descripcion text,
    area_destino_id integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.cargos OWNER TO postgres;

--
-- Name: cargos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.cargos ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.cargos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: config_asistencia_personal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.config_asistencia_personal (
    id integer NOT NULL,
    personal_id integer,
    minutos_tolerancia_por_dia integer DEFAULT 10 NOT NULL,
    dias_tolerancia_por_mes integer DEFAULT 10 NOT NULL,
    aplica_desde date DEFAULT CURRENT_DATE NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    hora_entrada time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL
);


ALTER TABLE public.config_asistencia_personal OWNER TO postgres;

--
-- Name: config_asistencia_personal_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.config_asistencia_personal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.config_asistencia_personal_id_seq OWNER TO postgres;

--
-- Name: config_asistencia_personal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.config_asistencia_personal_id_seq OWNED BY public.config_asistencia_personal.id;


--
-- Name: controlasistenciapersonal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.controlasistenciapersonal (
    id bigint NOT NULL,
    personal_id integer NOT NULL,
    fecha date NOT NULL,
    hora_ingreso time without time zone,
    hora_salida time without time zone,
    estado_presencia character varying(15) NOT NULL,
    usuario_registro_id integer NOT NULL,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    minutos_tardanza integer DEFAULT 0,
    observacion text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.controlasistenciapersonal OWNER TO postgres;

--
-- Name: controlasistenciapersonal_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.controlasistenciapersonal_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.controlasistenciapersonal_id_seq OWNER TO postgres;

--
-- Name: controlasistenciapersonal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.controlasistenciapersonal_id_seq OWNED BY public.controlasistenciapersonal.id;


--
-- Name: justificaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.justificaciones (
    id bigint NOT NULL,
    control_asistencia_id bigint NOT NULL,
    motivo text NOT NULL,
    evidencia_url text,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    fecha_solicitud timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    usuario_solicitante_id integer NOT NULL,
    fecha_respuesta timestamp without time zone,
    usuario_respuesta_id integer,
    observacion_respuesta text
);


ALTER TABLE public.justificaciones OWNER TO postgres;

--
-- Name: justificaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.justificaciones ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.justificaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: motivossalidapersonal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.motivossalidapersonal (
    id integer NOT NULL,
    nombre_motivo character varying(150) NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.motivossalidapersonal OWNER TO postgres;

--
-- Name: motivossalidapersonal_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.motivossalidapersonal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.motivossalidapersonal_id_seq OWNER TO postgres;

--
-- Name: motivossalidapersonal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.motivossalidapersonal_id_seq OWNED BY public.motivossalidapersonal.id;


--
-- Name: motivosvisita; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.motivosvisita (
    id integer NOT NULL,
    nombre_motivo character varying(150) NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.motivosvisita OWNER TO postgres;

--
-- Name: motivosvisita_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.motivosvisita_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.motivosvisita_id_seq OWNER TO postgres;

--
-- Name: motivosvisita_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.motivosvisita_id_seq OWNED BY public.motivosvisita.id;


--
-- Name: papeletas_codigo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.papeletas_codigo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.papeletas_codigo_seq OWNER TO postgres;

--
-- Name: papeletassalida; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.papeletassalida (
    id bigint NOT NULL,
    codigo_papeleta character varying(20) NOT NULL,
    personal_solicitante_id integer NOT NULL,
    estado character varying(20) NOT NULL,
    fecha_solicitud timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    motivo_salida_id integer NOT NULL,
    sustento_solicitud text,
    fecha_hora_salida_programada timestamp with time zone NOT NULL,
    fecha_hora_retorno_programada timestamp with time zone NOT NULL,
    personal_autoriza_id integer,
    fecha_autorizacion timestamp with time zone,
    observacion_autorizacion text,
    fecha_hora_salida_real timestamp with time zone,
    fecha_hora_retorno_real timestamp with time zone,
    usuario_registro_salida_id integer,
    usuario_registro_retorno_id integer
);


ALTER TABLE public.papeletassalida OWNER TO postgres;

--
-- Name: papeletassalida_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.papeletassalida ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.papeletassalida_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: personal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.personal (
    id integer NOT NULL,
    tipo_documento character varying(10) NOT NULL,
    numero_documento character varying(20) NOT NULL,
    nombres character varying(150) NOT NULL,
    apellidos character varying(150) NOT NULL,
    area_destino_id integer NOT NULL,
    tipo_contrato_id integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    cargo_id integer,
    fecha_nacimiento date,
    email character varying(150)
);


ALTER TABLE public.personal OWNER TO postgres;

--
-- Name: personal_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.personal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.personal_id_seq OWNER TO postgres;

--
-- Name: personal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.personal_id_seq OWNED BY public.personal.id;


--
-- Name: registrossalidapersonal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.registrossalidapersonal (
    id bigint NOT NULL,
    personal_id integer NOT NULL,
    motivo_salida_id integer NOT NULL,
    fecha_hora_salida timestamp without time zone NOT NULL,
    fecha_hora_retorno_estimada timestamp without time zone,
    fecha_hora_retorno_real timestamp without time zone,
    observacion_salida text,
    usuario_registro_id integer NOT NULL
);


ALTER TABLE public.registrossalidapersonal OWNER TO postgres;

--
-- Name: registrossalidapersonal_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.registrossalidapersonal_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.registrossalidapersonal_id_seq OWNER TO postgres;

--
-- Name: registrossalidapersonal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.registrossalidapersonal_id_seq OWNED BY public.registrossalidapersonal.id;


--
-- Name: registrosvisitas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.registrosvisitas (
    id bigint NOT NULL,
    visitante_id bigint NOT NULL,
    area_destino_id integer NOT NULL,
    personal_visitado_id integer,
    motivo_visita_id integer NOT NULL,
    fecha_ingreso timestamp without time zone NOT NULL,
    fecha_salida timestamp without time zone,
    usuario_ingreso_id integer NOT NULL,
    usuario_salida_id integer,
    sync_id character varying(255),
    estado_visita character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    fecha_aceptacion timestamp without time zone,
    fecha_rechazo timestamp without time zone,
    motivo_rechazo text,
    delegado_por_id integer,
    fecha_delegacion timestamp without time zone,
    fecha_limite_ingreso timestamp without time zone,
    fecha_limite_salida timestamp without time zone,
    fecha_fin_atencion timestamp without time zone
);


ALTER TABLE public.registrosvisitas OWNER TO postgres;

--
-- Name: COLUMN registrosvisitas.sync_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.registrosvisitas.sync_id IS 'Identificador único para evitar duplicados en sincronización offline';


--
-- Name: registrosvisitas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.registrosvisitas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.registrosvisitas_id_seq OWNER TO postgres;

--
-- Name: registrosvisitas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.registrosvisitas_id_seq OWNED BY public.registrosvisitas.id;


--
-- Name: tiposcontrato; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tiposcontrato (
    id integer NOT NULL,
    nombre_tipo character varying(100) NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.tiposcontrato OWNER TO postgres;

--
-- Name: tiposcontrato_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tiposcontrato_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tiposcontrato_id_seq OWNER TO postgres;

--
-- Name: tiposcontrato_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tiposcontrato_id_seq OWNED BY public.tiposcontrato.id;


--
-- Name: tiposdocumento; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tiposdocumento (
    id integer NOT NULL,
    codigo character varying(10) NOT NULL,
    nombre_completo character varying(100) NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


ALTER TABLE public.tiposdocumento OWNER TO postgres;

--
-- Name: tiposdocumento_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tiposdocumento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tiposdocumento_id_seq OWNER TO postgres;

--
-- Name: tiposdocumento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tiposdocumento_id_seq OWNED BY public.tiposdocumento.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre_usuario character varying(100) NOT NULL,
    hash_contrasena character varying(255) NOT NULL,
    email character varying(150) NOT NULL,
    rol character varying(20) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    personal_id integer,
    es_sistema boolean DEFAULT false NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    intentos_fallidos integer DEFAULT 0 NOT NULL,
    bloqueado_hasta timestamp without time zone,
    ultimo_intento_fallido timestamp without time zone
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: visitantes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.visitantes (
    id bigint NOT NULL,
    tipo_documento_id integer NOT NULL,
    numero_documento character varying(20) NOT NULL,
    nombres character varying(150) NOT NULL,
    apellidos character varying(150) NOT NULL,
    fecha_ultima_actualizacion_api timestamp without time zone
);


ALTER TABLE public.visitantes OWNER TO postgres;

--
-- Name: visitantes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.visitantes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.visitantes_id_seq OWNER TO postgres;

--
-- Name: visitantes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.visitantes_id_seq OWNED BY public.visitantes.id;


--
-- Name: areasdestino id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.areasdestino ALTER COLUMN id SET DEFAULT nextval('public.areasdestino_id_seq'::regclass);


--
-- Name: config_asistencia_personal id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.config_asistencia_personal ALTER COLUMN id SET DEFAULT nextval('public.config_asistencia_personal_id_seq'::regclass);


--
-- Name: controlasistenciapersonal id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.controlasistenciapersonal ALTER COLUMN id SET DEFAULT nextval('public.controlasistenciapersonal_id_seq'::regclass);


--
-- Name: motivossalidapersonal id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.motivossalidapersonal ALTER COLUMN id SET DEFAULT nextval('public.motivossalidapersonal_id_seq'::regclass);


--
-- Name: motivosvisita id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.motivosvisita ALTER COLUMN id SET DEFAULT nextval('public.motivosvisita_id_seq'::regclass);


--
-- Name: personal id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal ALTER COLUMN id SET DEFAULT nextval('public.personal_id_seq'::regclass);


--
-- Name: registrossalidapersonal id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registrossalidapersonal ALTER COLUMN id SET DEFAULT nextval('public.registrossalidapersonal_id_seq'::regclass);


--
-- Name: registrosvisitas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registrosvisitas ALTER COLUMN id SET DEFAULT nextval('public.registrosvisitas_id_seq'::regclass);


--
-- Name: tiposcontrato id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiposcontrato ALTER COLUMN id SET DEFAULT nextval('public.tiposcontrato_id_seq'::regclass);


--
-- Name: tiposdocumento id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiposdocumento ALTER COLUMN id SET DEFAULT nextval('public.tiposdocumento_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: visitantes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visitantes ALTER COLUMN id SET DEFAULT nextval('public.visitantes_id_seq'::regclass);


--
-- Name: areasdestino areasdestino_nombre_area_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.areasdestino
    ADD CONSTRAINT areasdestino_nombre_area_key UNIQUE (nombre_area);


--
-- Name: areasdestino areasdestino_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.areasdestino
    ADD CONSTRAINT areasdestino_pkey PRIMARY KEY (id);


--
-- Name: cargos cargos_nombre_cargo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cargos
    ADD CONSTRAINT cargos_nombre_cargo_key UNIQUE (nombre_cargo);


--
-- Name: cargos cargos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cargos
    ADD CONSTRAINT cargos_pkey PRIMARY KEY (id);


--
-- Name: config_asistencia_personal config_asistencia_personal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.config_asistencia_personal
    ADD CONSTRAINT config_asistencia_personal_pkey PRIMARY KEY (id);


--
-- Name: controlasistenciapersonal controlasistenciapersonal_personal_id_fecha_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.controlasistenciapersonal
    ADD CONSTRAINT controlasistenciapersonal_personal_id_fecha_key UNIQUE (personal_id, fecha);


--
-- Name: controlasistenciapersonal controlasistenciapersonal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.controlasistenciapersonal
    ADD CONSTRAINT controlasistenciapersonal_pkey PRIMARY KEY (id);


--
-- Name: justificaciones justificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.justificaciones
    ADD CONSTRAINT justificaciones_pkey PRIMARY KEY (id);


--
-- Name: motivossalidapersonal motivossalidapersonal_nombre_motivo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.motivossalidapersonal
    ADD CONSTRAINT motivossalidapersonal_nombre_motivo_key UNIQUE (nombre_motivo);


--
-- Name: motivossalidapersonal motivossalidapersonal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.motivossalidapersonal
    ADD CONSTRAINT motivossalidapersonal_pkey PRIMARY KEY (id);


--
-- Name: motivosvisita motivosvisita_nombre_motivo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.motivosvisita
    ADD CONSTRAINT motivosvisita_nombre_motivo_key UNIQUE (nombre_motivo);


--
-- Name: motivosvisita motivosvisita_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.motivosvisita
    ADD CONSTRAINT motivosvisita_pkey PRIMARY KEY (id);


--
-- Name: papeletassalida papeletassalida_codigo_papeleta_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.papeletassalida
    ADD CONSTRAINT papeletassalida_codigo_papeleta_key UNIQUE (codigo_papeleta);


--
-- Name: papeletassalida papeletassalida_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.papeletassalida
    ADD CONSTRAINT papeletassalida_pkey PRIMARY KEY (id);


--
-- Name: personal personal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal
    ADD CONSTRAINT personal_pkey PRIMARY KEY (id);


--
-- Name: personal personal_tipo_documento_numero_documento_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal
    ADD CONSTRAINT personal_tipo_documento_numero_documento_key UNIQUE (tipo_documento, numero_documento);


--
-- Name: registrossalidapersonal registrossalidapersonal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registrossalidapersonal
    ADD CONSTRAINT registrossalidapersonal_pkey PRIMARY KEY (id);


--
-- Name: registrosvisitas registrosvisitas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registrosvisitas
    ADD CONSTRAINT registrosvisitas_pkey PRIMARY KEY (id);


--
-- Name: registrosvisitas registrosvisitas_sync_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registrosvisitas
    ADD CONSTRAINT registrosvisitas_sync_id_key UNIQUE (sync_id);


--
-- Name: tiposcontrato tiposcontrato_nombre_tipo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiposcontrato
    ADD CONSTRAINT tiposcontrato_nombre_tipo_key UNIQUE (nombre_tipo);


--
-- Name: tiposcontrato tiposcontrato_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiposcontrato
    ADD CONSTRAINT tiposcontrato_pkey PRIMARY KEY (id);


--
-- Name: tiposdocumento tiposdocumento_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiposdocumento
    ADD CONSTRAINT tiposdocumento_codigo_key UNIQUE (codigo);


--
-- Name: tiposdocumento tiposdocumento_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiposdocumento
    ADD CONSTRAINT tiposdocumento_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_nombre_usuario_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_nombre_usuario_key UNIQUE (nombre_usuario);


--
-- Name: usuarios usuarios_personal_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_personal_id_key UNIQUE (personal_id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: visitantes visitantes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visitantes
    ADD CONSTRAINT visitantes_pkey PRIMARY KEY (id);


--
-- Name: visitantes visitantes_tipo_documento_id_numero_documento_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visitantes
    ADD CONSTRAINT visitantes_tipo_documento_id_numero_documento_key UNIQUE (tipo_documento_id, numero_documento);


--
-- Name: idx_config_asistencia_personal_unico; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_config_asistencia_personal_unico ON public.config_asistencia_personal USING btree (personal_id) WHERE (activo = true);


--
-- Name: idx_config_global; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_config_global ON public.config_asistencia_personal USING btree (((personal_id IS NULL))) WHERE (personal_id IS NULL);


--
-- Name: idx_config_personal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_config_personal ON public.config_asistencia_personal USING btree (personal_id) WHERE (personal_id IS NOT NULL);


--
-- Name: idx_control_asistencia_personal_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_control_asistencia_personal_fecha ON public.controlasistenciapersonal USING btree (personal_id, fecha);


--
-- Name: idx_papeletas_codigo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_papeletas_codigo ON public.papeletassalida USING btree (codigo_papeleta);


--
-- Name: idx_papeletas_estado_solicitante; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_papeletas_estado_solicitante ON public.papeletassalida USING btree (estado, personal_solicitante_id);


--
-- Name: idx_personal_documento; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_personal_documento ON public.personal USING btree (tipo_documento, numero_documento);


--
-- Name: idx_registros_salida_personal_activo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registros_salida_personal_activo ON public.registrossalidapersonal USING btree (personal_id, fecha_hora_retorno_real);


--
-- Name: idx_registros_visitas_area_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registros_visitas_area_fecha ON public.registrosvisitas USING btree (area_destino_id, fecha_ingreso);


--
-- Name: idx_registros_visitas_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registros_visitas_estado ON public.registrosvisitas USING btree (estado_visita);


--
-- Name: idx_registros_visitas_fecha_ingreso; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registros_visitas_fecha_ingreso ON public.registrosvisitas USING btree (fecha_ingreso);


--
-- Name: idx_registros_visitas_personal_visitado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registros_visitas_personal_visitado ON public.registrosvisitas USING btree (personal_visitado_id);


--
-- Name: idx_registros_visitas_sync_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_registros_visitas_sync_id ON public.registrosvisitas USING btree (sync_id);


--
-- Name: idx_unique_active_visit_per_visitor_area; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_unique_active_visit_per_visitor_area ON public.registrosvisitas USING btree (visitante_id, area_destino_id) WHERE (fecha_salida IS NULL);


--
-- Name: idx_usuarios_personal_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuarios_personal_id ON public.usuarios USING btree (personal_id);


--
-- Name: idx_visitantes_documento; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_visitantes_documento ON public.visitantes USING btree (tipo_documento_id, numero_documento);


--
-- Name: usuarios tr_prevent_delete_system_user; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tr_prevent_delete_system_user BEFORE DELETE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.prevent_delete_system_user();


--
-- Name: cargos cargos_area_destino_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cargos
    ADD CONSTRAINT cargos_area_destino_id_fkey FOREIGN KEY (area_destino_id) REFERENCES public.areasdestino(id);


--
-- Name: config_asistencia_personal config_asistencia_personal_personal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.config_asistencia_personal
    ADD CONSTRAINT config_asistencia_personal_personal_id_fkey FOREIGN KEY (personal_id) REFERENCES public.personal(id) ON DELETE CASCADE;


--
-- Name: controlasistenciapersonal controlasistenciapersonal_personal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.controlasistenciapersonal
    ADD CONSTRAINT controlasistenciapersonal_personal_id_fkey FOREIGN KEY (personal_id) REFERENCES public.personal(id);


--
-- Name: controlasistenciapersonal controlasistenciapersonal_usuario_registro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.controlasistenciapersonal
    ADD CONSTRAINT controlasistenciapersonal_usuario_registro_id_fkey FOREIGN KEY (usuario_registro_id) REFERENCES public.usuarios(id);


--
-- Name: personal fk_personal_cargo; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal
    ADD CONSTRAINT fk_personal_cargo FOREIGN KEY (cargo_id) REFERENCES public.cargos(id);


--
-- Name: justificaciones justificaciones_control_asistencia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.justificaciones
    ADD CONSTRAINT justificaciones_control_asistencia_id_fkey FOREIGN KEY (control_asistencia_id) REFERENCES public.controlasistenciapersonal(id) ON DELETE CASCADE;


--
-- Name: papeletassalida papeletassalida_motivo_salida_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.papeletassalida
    ADD CONSTRAINT papeletassalida_motivo_salida_id_fkey FOREIGN KEY (motivo_salida_id) REFERENCES public.motivossalidapersonal(id);


--
-- Name: papeletassalida papeletassalida_personal_autoriza_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.papeletassalida
    ADD CONSTRAINT papeletassalida_personal_autoriza_id_fkey FOREIGN KEY (personal_autoriza_id) REFERENCES public.personal(id);


--
-- Name: papeletassalida papeletassalida_personal_solicitante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.papeletassalida
    ADD CONSTRAINT papeletassalida_personal_solicitante_id_fkey FOREIGN KEY (personal_solicitante_id) REFERENCES public.personal(id);


--
-- Name: papeletassalida papeletassalida_usuario_registro_retorno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.papeletassalida
    ADD CONSTRAINT papeletassalida_usuario_registro_retorno_id_fkey FOREIGN KEY (usuario_registro_retorno_id) REFERENCES public.usuarios(id);


--
-- Name: papeletassalida papeletassalida_usuario_registro_salida_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.papeletassalida
    ADD CONSTRAINT papeletassalida_usuario_registro_salida_id_fkey FOREIGN KEY (usuario_registro_salida_id) REFERENCES public.usuarios(id);


--
-- Name: personal personal_area_destino_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal
    ADD CONSTRAINT personal_area_destino_id_fkey FOREIGN KEY (area_destino_id) REFERENCES public.areasdestino(id);


--
-- Name: personal personal_tipo_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal
    ADD CONSTRAINT personal_tipo_contrato_id_fkey FOREIGN KEY (tipo_contrato_id) REFERENCES public.tiposcontrato(id);


--
-- Name: registrossalidapersonal registrossalidapersonal_motivo_salida_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registrossalidapersonal
    ADD CONSTRAINT registrossalidapersonal_motivo_salida_id_fkey FOREIGN KEY (motivo_salida_id) REFERENCES public.motivossalidapersonal(id);


--
-- Name: registrossalidapersonal registrossalidapersonal_personal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registrossalidapersonal
    ADD CONSTRAINT registrossalidapersonal_personal_id_fkey FOREIGN KEY (personal_id) REFERENCES public.personal(id);


--
-- Name: registrossalidapersonal registrossalidapersonal_usuario_registro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registrossalidapersonal
    ADD CONSTRAINT registrossalidapersonal_usuario_registro_id_fkey FOREIGN KEY (usuario_registro_id) REFERENCES public.usuarios(id);


--
-- Name: registrosvisitas registrosvisitas_area_destino_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registrosvisitas
    ADD CONSTRAINT registrosvisitas_area_destino_id_fkey FOREIGN KEY (area_destino_id) REFERENCES public.areasdestino(id);


--
-- Name: registrosvisitas registrosvisitas_delegado_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registrosvisitas
    ADD CONSTRAINT registrosvisitas_delegado_por_id_fkey FOREIGN KEY (delegado_por_id) REFERENCES public.personal(id);


--
-- Name: registrosvisitas registrosvisitas_motivo_visita_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registrosvisitas
    ADD CONSTRAINT registrosvisitas_motivo_visita_id_fkey FOREIGN KEY (motivo_visita_id) REFERENCES public.motivosvisita(id);


--
-- Name: registrosvisitas registrosvisitas_personal_visitado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registrosvisitas
    ADD CONSTRAINT registrosvisitas_personal_visitado_id_fkey FOREIGN KEY (personal_visitado_id) REFERENCES public.personal(id);


--
-- Name: registrosvisitas registrosvisitas_usuario_ingreso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registrosvisitas
    ADD CONSTRAINT registrosvisitas_usuario_ingreso_id_fkey FOREIGN KEY (usuario_ingreso_id) REFERENCES public.usuarios(id);


--
-- Name: registrosvisitas registrosvisitas_usuario_salida_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registrosvisitas
    ADD CONSTRAINT registrosvisitas_usuario_salida_id_fkey FOREIGN KEY (usuario_salida_id) REFERENCES public.usuarios(id);


--
-- Name: registrosvisitas registrosvisitas_visitante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registrosvisitas
    ADD CONSTRAINT registrosvisitas_visitante_id_fkey FOREIGN KEY (visitante_id) REFERENCES public.visitantes(id);


--
-- Name: usuarios usuarios_personal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_personal_id_fkey FOREIGN KEY (personal_id) REFERENCES public.personal(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: visitantes visitantes_tipo_documento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visitantes
    ADD CONSTRAINT visitantes_tipo_documento_id_fkey FOREIGN KEY (tipo_documento_id) REFERENCES public.tiposdocumento(id);


--
-- PostgreSQL database dump complete
--

