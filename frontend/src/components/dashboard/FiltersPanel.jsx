import React, { useState } from "react";
import { useValeursDistinctes } from "./useCustomDashboardData";
import "./FiltersPanel.css";

/**
 * Un filtre actif : liste déroulante multi-sélection, valeurs chargées
 * depuis la base via useValeursDistinctes(cle).
 */
function FiltreActif({ cle, label, valeursSelectionnees, onChange, onSupprimer }) {
  const { valeurs, loading } = useValeursDistinctes(cle);

  const toggleValeur = (valeur) => {
    const estSelectionnee = valeursSelectionnees.includes(valeur);
    onChange(
      estSelectionnee
        ? valeursSelectionnees.filter((v) => v !== valeur)
        : [...valeursSelectionnees, valeur]
    );
  };

  return (
    <div className="filtres-panel__filtre">
      <div className="filtres-panel__filtre-header">
        <span>{label}</span>
        <button
          className="filtres-panel__supprimer"
          onClick={onSupprimer}
          aria-label={`Retirer le filtre ${label}`}
        >
          ×
        </button>
      </div>

      {loading ? (
        <span className="filtres-panel__loading">Chargement…</span>
      ) : (
        <div className="filtres-panel__valeurs">
          {valeurs.map((valeur) => (
            <label key={valeur} className="filtres-panel__valeur">
              <input
                type="checkbox"
                checked={valeursSelectionnees.includes(valeur)}
                onChange={() => toggleValeur(valeur)}
              />
              {String(valeur)}
            </label>
          ))}
          {valeurs.length === 0 && (
            <span className="filtres-panel__vide">Aucune valeur trouvée</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Panneau de filtres combinables du Dashboard Personnalisée.
 *
 * Props:
 *  - filtresDisponibles: [{ key, label }] — depuis GET /options
 *  - filtres: { [cle]: string[] } — filtres actuellement actifs + leurs valeurs choisies
 *  - onChange: (nouveauxFiltres) => void
 */
export default function FiltersPanel({ filtresDisponibles, filtres, onChange }) {
  const [colonneAAjouter, setColonneAAjouter] = useState("");

  const clesActives = Object.keys(filtres);
  const optionsRestantes = filtresDisponibles.filter((f) => !clesActives.includes(f.key));

  const ajouterFiltre = () => {
    if (!colonneAAjouter) return;
    onChange({ ...filtres, [colonneAAjouter]: [] });
    setColonneAAjouter("");
  };

  const supprimerFiltre = (cle) => {
    const copie = { ...filtres };
    delete copie[cle];
    onChange(copie);
  };

  const changerValeurs = (cle, valeurs) => {
    onChange({ ...filtres, [cle]: valeurs });
  };

  return (
    <div className="filtres-panel">
      <div className="filtres-panel__ajout">
        <select value={colonneAAjouter} onChange={(e) => setColonneAAjouter(e.target.value)}>
          <option value="">+ Ajouter un filtre…</option>
          {optionsRestantes.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
        <button
          className="filtres-panel__ajout-bouton"
          onClick={ajouterFiltre}
          disabled={!colonneAAjouter}
        >
          Ajouter
        </button>
      </div>

      {clesActives.length > 0 && (
        <div className="filtres-panel__liste">
          {clesActives.map((cle) => {
            const meta = filtresDisponibles.find((f) => f.key === cle);
            return (
              <FiltreActif
                key={cle}
                cle={cle}
                label={meta ? meta.label : cle}
                valeursSelectionnees={filtres[cle]}
                onChange={(valeurs) => changerValeurs(cle, valeurs)}
                onSupprimer={() => supprimerFiltre(cle)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
