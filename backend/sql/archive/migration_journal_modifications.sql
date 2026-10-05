CREATE TABLE IF NOT EXISTS journal_modifications (
    id SERIAL PRIMARY KEY,
    date_modification TIMESTAMP NOT NULL DEFAULT now(),
    utilisateur VARCHAR(150) NOT NULL,
    table_modifiee VARCHAR(100) NOT NULL DEFAULT 'fact_engagement',
    id_ligne BIGINT NOT NULL,
    nom_colonne VARCHAR(100) NOT NULL,
    ancienne_valeur TEXT,
    nouvelle_valeur TEXT,
    motif TEXT,
    import_id INTEGER REFERENCES journal_import(id)
);

CREATE INDEX IF NOT EXISTS idx_journal_modifications_ligne
    ON journal_modifications(id_ligne);
CREATE INDEX IF NOT EXISTS idx_journal_modifications_date
    ON journal_modifications(date_modification);