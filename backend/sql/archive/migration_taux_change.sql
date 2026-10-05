-- Table des taux de change (une ligne par devise, par date d'arrete)
CREATE TABLE IF NOT EXISTS taux_change (
    id SERIAL PRIMARY KEY,
    date_taux DATE NOT NULL,
    devise VARCHAR(20) NOT NULL,
    prix NUMERIC(20,6) NOT NULL,
    import_id INTEGER REFERENCES journal_import(id),
    created_at TIMESTAMP DEFAULT now(),
    CONSTRAINT taux_change_date_devise_uniq UNIQUE (date_taux, devise)
);

CREATE INDEX IF NOT EXISTS idx_taux_change_date_devise
    ON taux_change(date_taux, devise);

-- Distingue les imports "base" des imports "devise" dans le journal existant
ALTER TABLE journal_import
    ADD COLUMN IF NOT EXISTS type_import VARCHAR(20) NOT NULL DEFAULT 'base';