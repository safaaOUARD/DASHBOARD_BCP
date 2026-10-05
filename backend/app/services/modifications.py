from sqlalchemy import text

# Colonnes qui, si modifiees, declenchent un recalcul de ead_mad / el_mad
COLONNES_DECLENCHANT_RECALCUL = {"encours", "el", "devise", "date_arret"}
# Colonnes non modifiables depuis l'interface (cles techniques / calculees)
COLONNES_INTERDITES = {"id", "import_id", "created_at", "ead_mad", "el_mad"}


def get_ligne_fact_engagement(engine, id_ligne):
    """Recupere la ligne actuelle (toutes colonnes) pour connaitre les
    anciennes valeurs avant modification."""
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT * FROM fact_engagement WHERE id = :id"),
            {"id": id_ligne},
        ).mappings().first()
    return dict(row) if row else None


def modifier_ligne_fact_engagement(engine, id_ligne, modifications, utilisateur, motif=None):
    """
    modifications : dict {nom_colonne: nouvelle_valeur} - uniquement les
    colonnes reellement modifiees (le frontend ne doit envoyer que
    celles-la, jamais la ligne entiere).
    """
    ancienne_ligne = get_ligne_fact_engagement(engine, id_ligne)
    if ancienne_ligne is None:
        raise ValueError(f"Aucune ligne fact_engagement avec id={id_ligne}")

    colonnes_invalides = set(modifications) & COLONNES_INTERDITES
    if colonnes_invalides:
        raise ValueError(f"Colonne(s) non modifiable(s) : {', '.join(colonnes_invalides)}")
    colonnes_inconnues = set(modifications) - set(ancienne_ligne.keys())
    if colonnes_inconnues:
        raise ValueError(f"Colonne(s) inconnue(s) : {', '.join(colonnes_inconnues)}")

    # Ne garder que les valeurs qui ont reellement change
    changements = {
        col: val for col, val in modifications.items()
        if str(ancienne_ligne.get(col)) != str(val)
    }

    if not changements:
        return {"modifie": False, "changements": [], "recalcul_effectue": False}

    with engine.begin() as conn:
        # 1) Journaliser chaque cellule modifiee AVANT la mise a jour
        for col, nouvelle_valeur in changements.items():
            conn.execute(
                text("""
                    INSERT INTO journal_modifications
                        (utilisateur, table_modifiee, id_ligne, nom_colonne,
                         ancienne_valeur, nouvelle_valeur, motif, import_id)
                    VALUES
                        (:utilisateur, 'fact_engagement', :id_ligne, :colonne,
                         :ancienne, :nouvelle, :motif, :import_id)
                """),
                {
                    "utilisateur": utilisateur,
                    "id_ligne": id_ligne,
                    "colonne": col,
                    "ancienne": None if ancienne_ligne.get(col) is None else str(ancienne_ligne.get(col)),
                    "nouvelle": None if nouvelle_valeur is None else str(nouvelle_valeur),
                    "motif": motif,
                    "import_id": ancienne_ligne.get("import_id"),
                },
            )

        # 2) Mettre a jour uniquement les colonnes modifiees
        set_clause = ", ".join(f"{col} = :{col}" for col in changements)
        params = dict(changements)
        params["id_ligne"] = id_ligne
        conn.execute(
            text(f"UPDATE fact_engagement SET {set_clause} WHERE id = :id_ligne"),
            params,
        )

        # 3) Recalcul automatique si une colonne impactante a change
        recalcul_effectue = False
        if COLONNES_DECLENCHANT_RECALCUL & set(changements):
            recalcul_effectue = _recalculer_taux_pour_ligne(conn, id_ligne)

    return {
        "modifie": True,
        "changements": list(changements.keys()),
        "recalcul_effectue": recalcul_effectue,
    }
    
COLONNES_MODIFIABLES = {
    "type", "filiale", "filiale", "devise", "nom_client", "cle", "type_engagement",
    "encours", "intra_group", "segment", "risque_pays", "encours_sains",
    "encours_impayes", "encours_restrectures", "encours_douteux", "stock_provision",
    "nbr_impaye", "anteriorite_impaye", "code_ape", "lib_ape", "wl", "b1", "b2", "b3",
    "date_maj", "date_arret", "el", "secteur_activite", "zone",
}
#
def _recalculer_taux_pour_ligne(conn, id_ligne):
    """
    Recalcule ead_mad et el_mad pour une seule ligne de fact_engagement.
    Retourne True si un taux a été trouvé et appliqué, sinon False.
    """
    result = conn.execute(
        text("""
            UPDATE fact_engagement fe
            SET
                ead_mad = fe.encours * tc.prix,
                el_mad = fe.el * tc.prix
            FROM taux_change tc
            WHERE fe.id = :id
              AND fe.date_arret = tc.date_taux
              AND fe.devise = tc.devise
        """),
        {"id": id_ligne},
    )

    return result.rowcount > 0

def creer_ligne_fact_engagement(engine, valeurs, utilisateur, motif=None):
    if not valeurs:  
        raise ValueError("Aucune valeur fournie pour la creation.")

    colonnes_invalides = set(valeurs) - COLONNES_MODIFIABLES
    if colonnes_invalides:
        raise ValueError(f"Colonne(s) non autorisee(s) : {', '.join(colonnes_invalides)}")

    import json

    with engine.begin() as conn:
        colonnes_sql = ", ".join(valeurs.keys())
        placeholders = ", ".join(f":{c}" for c in valeurs.keys())
        result = conn.execute(
            text(f"INSERT INTO fact_engagement ({colonnes_sql}) VALUES ({placeholders}) RETURNING id"),
            valeurs,
        )
        nouvel_id = result.scalar_one()

        conn.execute(
            text("""
                INSERT INTO journal_modifications
                    (utilisateur, table_modifiee, id_ligne, nom_colonne,
                     ancienne_valeur, nouvelle_valeur, motif)
                VALUES
                    (:utilisateur, 'fact_engagement', :id_ligne, '__creation__',
                     NULL, :valeurs, :motif)
            """),
            {
                "utilisateur": utilisateur, "id_ligne": nouvel_id,
                "valeurs": json.dumps(valeurs, default=str), "motif": motif,
            },
        )

        recalcul_effectue = False
        if {"encours", "el", "devise", "date_arret"} & set(valeurs):
            recalcul_effectue = _recalculer_taux_pour_ligne(conn, nouvel_id)

    return {"id": nouvel_id, "recalcul_effectue": recalcul_effectue}


def supprimer_ligne_fact_engagement(engine, id_ligne, utilisateur, motif=None):
    ancienne_ligne = get_ligne_fact_engagement(engine, id_ligne)
    if ancienne_ligne is None:
        raise ValueError(f"Aucune ligne fact_engagement avec id={id_ligne}")

    import json

    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO journal_modifications
                    (utilisateur, table_modifiee, id_ligne, nom_colonne,
                     ancienne_valeur, nouvelle_valeur, motif, import_id)
                VALUES
                    (:utilisateur, 'fact_engagement', :id_ligne, '__suppression__',
                     :ancienne, NULL, :motif, :import_id)
            """),
            {
                "utilisateur": utilisateur, "id_ligne": id_ligne,
                "ancienne": json.dumps(ancienne_ligne, default=str),
                "motif": motif, "import_id": ancienne_ligne.get("import_id"),
            },
        )
        conn.execute(text("DELETE FROM fact_engagement WHERE id = :id"), {"id": id_ligne})

    return {"supprime": True} 
