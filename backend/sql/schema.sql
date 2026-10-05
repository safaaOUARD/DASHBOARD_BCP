SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';
SET default_table_access_method = heap;


CREATE TABLE public.ai_logs (
    id integer NOT NULL,
    user_id character varying(255),
    conversation_id character varying(255),
    question text NOT NULL,
    outil_utilise character varying(100),
    duree_ms integer,
    succes boolean NOT NULL,
    erreur text,
    date_creation timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.ai_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.ai_logs_id_seq OWNED BY public.ai_logs.id;

--
-- Name: dim_devise; Type: TABLE; Schema: public
--

CREATE TABLE public.dim_devise (
    code character varying(20) NOT NULL
);

--
-- Name: dim_filiale; Type: TABLE; Schema: public
--

CREATE TABLE public.dim_filiale (
    id integer NOT NULL,
    code character varying(20) NOT NULL,
    nom character varying(150),
    pays character varying(50),
    zone character varying(50),
    holding character varying(20) DEFAULT 'ABI'::character varying
);

CREATE SEQUENCE public.dim_filiale_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.dim_filiale_id_seq OWNED BY public.dim_filiale.id;

--
-- Name: dim_rating_pays; Type: TABLE; Schema: public
--

CREATE TABLE public.dim_rating_pays (
    id integer NOT NULL,
    date_arret date NOT NULL,
    pays character varying(100) NOT NULL,
    note_retenue character varying(10) NOT NULL,
    import_id integer
);

CREATE SEQUENCE public.dim_rating_pays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.dim_rating_pays_id_seq OWNED BY public.dim_rating_pays.id;

--
-- Name: dim_secteur_activite; Type: TABLE; Schema: public
--

CREATE TABLE public.dim_secteur_activite (
    code_ape character varying(100) NOT NULL,
    libelle character varying(150)
);

--
-- Name: dim_segment; Type: TABLE; Schema: public
--

CREATE TABLE public.dim_segment (
    id integer NOT NULL,
    code character varying(30) NOT NULL,
    libelle character varying(60)
);

CREATE SEQUENCE public.dim_segment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.dim_segment_id_seq OWNED BY public.dim_segment.id;

--
-- Name: fact_engagement; Type: TABLE; Schema: public
--

CREATE TABLE public.fact_engagement (
    id bigint NOT NULL,
    import_id integer,
    type character varying(30),
    filiale character varying(20),
    filiale_2 character varying(20),
    devise character varying(20),
    nom_client character varying(150),
    cle character varying(50),
    type_engagement character varying(20),
    encours numeric(20,4),
    intra_group boolean DEFAULT false,
    segment character varying(30),
    risque_pays character varying(50),
    encours_sains numeric(20,4),
    encours_impayes numeric(20,4),
    encours_restrectures numeric(20,4),
    encours_douteux numeric(20,4),
    stock_provision numeric(20,4),
    nbr_impaye integer,
    anteriorite_impaye integer,
    code_ape character varying(100),
    lib_ape character varying(150),
    wl smallint DEFAULT 0,
    b1 smallint,
    b2 smallint,
    b3 smallint,
    date_maj date,
    date_arret date NOT NULL,
    el numeric(20,4),
    secteur_activite character varying(150),
    el_mad numeric(20,4),
    ead_mad numeric(20,4),
    zone character varying(50),
    created_at timestamp without time zone DEFAULT now(),
    ead_mad_trim_prec numeric,
    el_mad_trim_prec numeric,
    ead_mad_annee_prec numeric,
    el_mad_annee_prec numeric,
    perimetre_exposition smallint DEFAULT 0,
    ead_mad_arret_annuel numeric,
    el_mad_arret_annuel numeric,
    perimetre_limites_pays boolean DEFAULT false,
    bucket character varying(10)
);

CREATE SEQUENCE public.fact_engagement_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.fact_engagement_id_seq OWNED BY public.fact_engagement.id;

--
-- Name: fichier_source; Type: TABLE; Schema: public
--

CREATE TABLE public.fichier_source (
    id integer NOT NULL,
    nom_original character varying(255) NOT NULL,
    chemin_stockage character varying(500) NOT NULL,
    taille_fichier bigint,
    date_depot timestamp without time zone DEFAULT now() NOT NULL,
    statut character varying(20) DEFAULT 'depose'::character varying,
    CONSTRAINT fichier_source_statut_check CHECK (((statut)::text = ANY ((ARRAY['depose'::character varying, 'importe'::character varying, 'archive'::character varying, 'supprime'::character varying])::text[])))
);

CREATE SEQUENCE public.fichier_source_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.fichier_source_id_seq OWNED BY public.fichier_source.id;

--
-- Name: journal_acces; Type: TABLE; Schema: public
--

CREATE TABLE public.journal_acces (
    id bigint NOT NULL,
    utilisateur_id integer,
    action character varying(100) NOT NULL,
    date_action timestamp without time zone DEFAULT now(),
    details jsonb
);

CREATE SEQUENCE public.journal_acces_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.journal_acces_id_seq OWNED BY public.journal_acces.id;

--
-- Name: journal_import; Type: TABLE; Schema: public
--

CREATE TABLE public.journal_import (
    id integer NOT NULL,
    nom_fichier character varying(255),
    fichier_hash character(64),
    date_import timestamp without time zone DEFAULT now(),
    date_arret date,
    nb_lignes integer,
    statut character varying(20) DEFAULT 'succes'::character varying,
    message_erreur text,
    type_import character varying(20) DEFAULT 'base'::character varying NOT NULL,
    progression integer DEFAULT 0 NOT NULL,
    etape text,
    CONSTRAINT journal_import_statut_check CHECK (((statut)::text = ANY ((ARRAY['en_cours'::character varying, 'succes'::character varying, 'echec'::character varying, 'ignore'::character varying])::text[])))
);

CREATE SEQUENCE public.journal_import_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.journal_import_id_seq OWNED BY public.journal_import.id;

--
-- Name: journal_modifications; Type: TABLE; Schema: public
--

CREATE TABLE public.journal_modifications (
    id integer NOT NULL,
    date_modification timestamp without time zone DEFAULT now() NOT NULL,
    utilisateur character varying(150) NOT NULL,
    table_modifiee character varying(100) DEFAULT 'fact_engagement'::character varying NOT NULL,
    id_ligne bigint NOT NULL,
    nom_colonne character varying(100) NOT NULL,
    ancienne_valeur text,
    nouvelle_valeur text,
    motif text,
    import_id integer
);

CREATE SEQUENCE public.journal_modifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.journal_modifications_id_seq OWNED BY public.journal_modifications.id;

--
-- Name: taux_change; Type: TABLE; Schema: public
--

CREATE TABLE public.taux_change (
    id integer NOT NULL,
    date_taux date NOT NULL,
    devise character varying(20) NOT NULL,
    prix numeric(20,6) NOT NULL,
    import_id integer,
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.taux_change_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.taux_change_id_seq OWNED BY public.taux_change.id;

--
-- Name: utilisateur; Type: TABLE; Schema: public
--

CREATE TABLE public.utilisateur (
    id integer NOT NULL,
    nom character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    role character varying(20) NOT NULL,
    password_hash character varying(255) NOT NULL,
    actif boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    peut_importer boolean DEFAULT false NOT NULL,
    peut_modifier boolean DEFAULT false NOT NULL,
    peut_exporter boolean DEFAULT false NOT NULL,
    CONSTRAINT utilisateur_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'gestionnaire'::character varying, 'lecteur'::character varying, 'consultant'::character varying])::text[])))
);

CREATE SEQUENCE public.utilisateur_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.utilisateur_id_seq OWNED BY public.utilisateur.id;

--
-- Valeurs par defaut des colonnes id (nextval des sequences)
--

ALTER TABLE ONLY public.ai_logs ALTER COLUMN id SET DEFAULT nextval('public.ai_logs_id_seq'::regclass);
ALTER TABLE ONLY public.dim_filiale ALTER COLUMN id SET DEFAULT nextval('public.dim_filiale_id_seq'::regclass);
ALTER TABLE ONLY public.dim_rating_pays ALTER COLUMN id SET DEFAULT nextval('public.dim_rating_pays_id_seq'::regclass);
ALTER TABLE ONLY public.dim_segment ALTER COLUMN id SET DEFAULT nextval('public.dim_segment_id_seq'::regclass);
ALTER TABLE ONLY public.fact_engagement ALTER COLUMN id SET DEFAULT nextval('public.fact_engagement_id_seq'::regclass);
ALTER TABLE ONLY public.fichier_source ALTER COLUMN id SET DEFAULT nextval('public.fichier_source_id_seq'::regclass);
ALTER TABLE ONLY public.journal_acces ALTER COLUMN id SET DEFAULT nextval('public.journal_acces_id_seq'::regclass);
ALTER TABLE ONLY public.journal_import ALTER COLUMN id SET DEFAULT nextval('public.journal_import_id_seq'::regclass);
ALTER TABLE ONLY public.journal_modifications ALTER COLUMN id SET DEFAULT nextval('public.journal_modifications_id_seq'::regclass);
ALTER TABLE ONLY public.taux_change ALTER COLUMN id SET DEFAULT nextval('public.taux_change_id_seq'::regclass);
ALTER TABLE ONLY public.utilisateur ALTER COLUMN id SET DEFAULT nextval('public.utilisateur_id_seq'::regclass);

--
-- Contraintes PRIMARY KEY / UNIQUE
--

ALTER TABLE ONLY public.ai_logs ADD CONSTRAINT ai_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.dim_devise ADD CONSTRAINT dim_devise_pkey PRIMARY KEY (code);
ALTER TABLE ONLY public.dim_filiale ADD CONSTRAINT dim_filiale_code_key UNIQUE (code);
ALTER TABLE ONLY public.dim_filiale ADD CONSTRAINT dim_filiale_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.dim_rating_pays ADD CONSTRAINT dim_rating_pays_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.dim_secteur_activite ADD CONSTRAINT dim_secteur_activite_pkey PRIMARY KEY (code_ape);
ALTER TABLE ONLY public.dim_segment ADD CONSTRAINT dim_segment_code_key UNIQUE (code);
ALTER TABLE ONLY public.dim_segment ADD CONSTRAINT dim_segment_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.fact_engagement ADD CONSTRAINT fact_engagement_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.fichier_source ADD CONSTRAINT fichier_source_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.journal_acces ADD CONSTRAINT journal_acces_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.journal_import ADD CONSTRAINT journal_import_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.journal_modifications ADD CONSTRAINT journal_modifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.taux_change ADD CONSTRAINT taux_change_date_devise_uniq UNIQUE (date_taux, devise);
ALTER TABLE ONLY public.taux_change ADD CONSTRAINT taux_change_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.dim_rating_pays ADD CONSTRAINT uq_dim_rating_pays_date_pays UNIQUE (date_arret, pays);
ALTER TABLE ONLY public.utilisateur ADD CONSTRAINT utilisateur_email_key UNIQUE (email);
ALTER TABLE ONLY public.utilisateur ADD CONSTRAINT utilisateur_pkey PRIMARY KEY (id);

--
-- Index
--

CREATE INDEX idx_dim_rating_pays_date_arret ON public.dim_rating_pays USING btree (date_arret);
CREATE INDEX idx_fact_date ON public.fact_engagement USING btree (date_arret);
CREATE INDEX idx_fact_engagement_date_arret ON public.fact_engagement USING btree (date_arret);
CREATE INDEX idx_fact_engagement_devise ON public.fact_engagement USING btree (devise);
CREATE INDEX idx_fact_engagement_filiale ON public.fact_engagement USING btree (filiale);
CREATE INDEX idx_fact_import ON public.fact_engagement USING btree (import_id);
CREATE INDEX idx_fact_pays ON public.fact_engagement USING btree (risque_pays);
CREATE INDEX idx_journal_modifications_date ON public.journal_modifications USING btree (date_modification);
CREATE INDEX idx_journal_modifications_ligne ON public.journal_modifications USING btree (id_ligne);
CREATE INDEX idx_taux_change_date_devise ON public.taux_change USING btree (date_taux, devise);

--
-- Cles etrangeres (ajoutees en dernier : toutes les tables existent deja)
--

ALTER TABLE ONLY public.dim_rating_pays ADD CONSTRAINT dim_rating_pays_import_id_fkey FOREIGN KEY (import_id) REFERENCES public.journal_import(id);
ALTER TABLE ONLY public.fact_engagement ADD CONSTRAINT fact_engagement_import_id_fkey FOREIGN KEY (import_id) REFERENCES public.journal_import(id);
ALTER TABLE ONLY public.journal_acces ADD CONSTRAINT journal_acces_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateur(id);
ALTER TABLE ONLY public.journal_modifications ADD CONSTRAINT journal_modifications_import_id_fkey FOREIGN KEY (import_id) REFERENCES public.journal_import(id);
ALTER TABLE ONLY public.taux_change ADD CONSTRAINT taux_change_import_id_fkey FOREIGN KEY (import_id) REFERENCES public.journal_import(id);