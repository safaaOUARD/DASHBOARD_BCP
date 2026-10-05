import React, { useState } from "react";
import { AGGREGATION_LABELS } from "./customDashboardConfig";
import "./ConfigPanel.css";

/**
 * Panneau de configuration du Dashboard Personnalisée.
 *
 * Contrairement à la version précédente (1 dimension / 1 mesure /
 * 1 type de graphique -> un graphe), ce dashboard génère un TABLEAU
 * croisé : plusieurs colonnes de regroupement, plusieurs mesures
 * agrégées côte à côte. Pas de sélection de type de graphique.
 *
 * Props:
 *  - options: résultat de GET /options ({ dimensions, mesures, filtres })
 *  - config: { dimensions: string[], mesures: [{ cle, aggregation }] }
 *  - onChange: (partialConfig) => void — merge avec la config actuelle
 */
export default function ConfigPanel({ options, config, onChange }) {
  const [mesureAAjouter, setMesureAAjouter] = useState("");

  const toggleDimension = (cleDimension) => {
    const estSelectionnee = config.dimensions.includes(cleDimension);

    // Au moins une dimension doit rester sélectionnée à tout moment,
    // sinon le tableau n'a plus aucune ligne de regroupement.
    if (estSelectionnee && config.dimensions.length === 1) {
      return;
    }

    onChange({
      dimensions: estSelectionnee
        ? config.dimensions.filter((c) => c !== cleDimension)
        : [...config.dimensions, cleDimension],
    });
  };

  const ajouterMesure = () => {
    if (!mesureAAjouter) return;

    const mesure = options.mesures.find((m) => m.key === mesureAAjouter);
    if (!mesure) return;

    onChange({
      mesures: [
        ...config.mesures,
        { cle: mesure.key, aggregation: mesure.aggregations[0] },
      ],
    });
    setMesureAAjouter("");
  };

  const supprimerMesure = (index) => {
    // Au moins une mesure doit rester sélectionnée, sinon le tableau
    // n'a plus aucune colonne à afficher.
    if (config.mesures.length === 1) return;

    onChange({ mesures: config.mesures.filter((_, i) => i !== index) });
  };

  const changerAggregation = (index, aggregation) => {
    onChange({
      mesures: config.mesures.map((m, i) =>
        i === index ? { ...m, aggregation } : m
      ),
    });
  };

  return (
    <div className="config-panel">
      <div className="config-panel__field">
        <label>Colonnes à regrouper</label>
        <div className="config-panel__dimensions">
          {options.dimensions.map((d) => (
            <label key={d.key} className="config-panel__checkbox-option">
              <input
                type="checkbox"
                checked={config.dimensions.includes(d.key)}
                onChange={() => toggleDimension(d.key)}
              />
              {d.label}
            </label>
          ))}
        </div>
      </div>

      <div className="config-panel__field">
        <label>Mesures (sommes, moyennes…)</label>

        <div className="config-panel__mesures">
          {config.mesures.map((mesureChoisie, index) => {
            const mesureInfo = options.mesures.find((m) => m.key === mesureChoisie.cle);
            const aggregationsDisponibles = mesureInfo
              ? mesureInfo.aggregations
              : [mesureChoisie.aggregation];

            return (
              <div key={index} className="config-panel__mesure-ligne">
                <span className="config-panel__mesure-label">
                  {mesureInfo ? mesureInfo.label : mesureChoisie.cle}
                </span>

                <select
                  value={mesureChoisie.aggregation}
                  onChange={(e) => changerAggregation(index, e.target.value)}
                >
                  {aggregationsDisponibles.map((agg) => (
                    <option key={agg} value={agg}>
                      {AGGREGATION_LABELS[agg] || agg}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="config-panel__mesure-supprimer"
                  onClick={() => supprimerMesure(index)}
                  aria-label={`Retirer la mesure ${mesureInfo ? mesureInfo.label : mesureChoisie.cle}`}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        <div className="config-panel__ajout-mesure">
          <select value={mesureAAjouter} onChange={(e) => setMesureAAjouter(e.target.value)}>
            <option value="">+ Ajouter une mesure…</option>
            {options.mesures.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="config-panel__ajout-mesure-bouton"
            onClick={ajouterMesure}
            disabled={!mesureAAjouter}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}