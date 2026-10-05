import React, { useState, useEffect } from "react";
import { useDateArret } from "./context/DateArretContext";
import ConfigPanel from "./components/dashboard/ConfigPanel";
import FiltersPanel from "./components/dashboard/FiltersPanel";
import DateSelector from "./components/dashboard/DateSelector";
import { formatDate } from "./components/dashboard/DonutCard";
import {
  useCustomDashboardOptions,
  useCustomDashboardData,
} from "./components/dashboard/useCustomDashboardData";
import { DATE_LABELS_COLORS, ORDRE_DATES } from "./components/dashboard/customDashboardConfig";
import "./DashboardSegmentation.css"; 
import "./DashboardCustom.css";

function formaterNombre(valeur) {
  if (valeur === null || valeur === undefined) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(valeur);
}

// Ordre d'affichage des tableaux, identique aux autres dashboards :
// T0, puis T-1, puis Arrêté annuel, puis N-1.
const ORDRE_AFFICHAGE_TABLEAUX = [
  "date_courante",
  "trimestre_precedent",
  "arret_annuel",
  "annee_precedente",
];

// Options du DateSelector : mêmes 4 clés/libellés que DATE_LABELS_COLORS
// (déjà unifiés avec les autres dashboards), ordre des boutons = ORDRE_DATES.
const DATE_OPTIONS = ORDRE_DATES.map((cle) => ({
  key: cle,
  label: DATE_LABELS_COLORS[cle].label,
}));

/**
 * Page "Dashboard Personnalisée".
 * L'utilisateur choisit une ou plusieurs colonnes de regroupement et
 * une ou plusieurs mesures agrégées (chacune avec sa propre
 * agrégation), applique des filtres, choisit les dates de référence à
 * générer via DateSelector, clique sur "Générer", et le backend
 * renvoie un TABLEAU pour chacune des dates sélectionnées — calculées
 * relativement à `dateArret` (la date choisie dans le Header, qui
 * devient T0), comme tous les autres dashboards.
 */
export default function DashboardCustom() {
  const { dateArret } = useDateArret();

  const { options, loading: loadingOptions, error: errorOptions } = useCustomDashboardOptions();
  const { data, loading: generation, error: erreurGeneration, generer } = useCustomDashboardData();

  const [config, setConfig] = useState(null);
  const [filtres, setFiltres] = useState({});
  const [selectedDates, setSelectedDates] = useState(ORDRE_DATES);

  // Initialise la config par défaut dès que les options arrivent du backend :
  // une dimension et une mesure présélectionnées, prêtes à être étendues.
  useEffect(() => {
    if (options && !config) {
      setConfig({
        dimensions: options.dimensions[0] ? [options.dimensions[0].key] : [],
        mesures: options.mesures[0]
          ? [{ cle: options.mesures[0].key, aggregation: options.mesures[0].aggregations[0] }]
          : [],
      });
    }
  }, [options, config]);

  const mettreAJourConfig = (partiel) => {
    setConfig((c) => ({ ...c, ...partiel }));
  };

  const lancerGeneration = () => {
    if (!config) return;
    generer({
      dimensions: config.dimensions,
      mesures: config.mesures,
      filters: filtres,
      dates: selectedDates,
    });
  };

  const datesReference = data?.dates || {};

  const clesAAfficher = (data?.dates_selectionnees || selectedDates)
    .slice()
    .sort(
      (a, b) =>
        ORDRE_AFFICHAGE_TABLEAUX.indexOf(a) - ORDRE_AFFICHAGE_TABLEAUX.indexOf(b)
    );

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__header">
        <span className="dashboard-page__eyebrow">Dashboard</span>
        <h1 className="dashboard-page__title">Dashboard Personnalisée</h1>
      </div>

      {loadingOptions && (
        <div className="dashboard-page__status">Chargement de la configuration…</div>
      )}

      {!loadingOptions && errorOptions && (
        <div className="dashboard-page__status dashboard-page__status--error">
          {errorOptions}
        </div>
      )}

      {!loadingOptions && options && config && (
        <>
          <ConfigPanel options={options} config={config} onChange={mettreAJourConfig} />

          <FiltersPanel
            filtresDisponibles={options.filtres}
            filtres={filtres}
            onChange={setFiltres}
          />

          <DateSelector
            options={DATE_OPTIONS}
            selected={selectedDates}
            onChange={setSelectedDates}
            datesDisponibles={datesReference}
          />

          <button
            className="dashboard-custom__generer"
            onClick={lancerGeneration}
            disabled={generation}
          >
            {generation ? "Génération…" : "Générer"}
          </button>

          {generation && (
            <div className="dashboard-page__status">Génération du tableau…</div>
          )}

          {!generation && erreurGeneration && (
            <div className="dashboard-page__status dashboard-page__status--error">
              {erreurGeneration}
            </div>
          )}

          {!generation && data && (
            <div className="dashboard-page__grid">
              {clesAAfficher.map((cleDate) => {
                const { label } = DATE_LABELS_COLORS[cleDate];
                const dateExacte = datesReference[cleDate];
                const lignes = data.series ? data.series[cleDate] : [];
                const nbColonnes =
                  (data.colonnes_dimensions?.length || 0) + (data.colonnes_mesures?.length || 0);

                return (
                  <div key={cleDate} className="dashboard-custom__cell">
                    <div className="dashboard-custom__cell-header">
                      <span>{label}</span>
                      {dateExacte && <span className="dashboard-custom__cell-date">{formatDate(dateExacte)}</span>}
                    </div>

                    <div className="dashboard-custom__table-wrapper">
                      <table className="dashboard-custom__table">
                        <thead>
                          <tr>
                            {data.colonnes_dimensions.map((col) => (
                              <th key={col.cle}>{col.label}</th>
                            ))}
                            {data.colonnes_mesures.map((col) => (
                              <th key={col.cle}>{col.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {lignes.map((ligne, i) => (
                            <tr key={i}>
                              {data.colonnes_dimensions.map((col) => (
                                <td key={col.cle}>{ligne[col.cle] ?? "—"}</td>
                              ))}
                              {data.colonnes_mesures.map((col) => (
                                <td key={col.cle}>{formaterNombre(ligne[col.cle])}</td>
                              ))}
                            </tr>
                          ))}
                          {lignes.length === 0 && (
                            <tr>
                              <td colSpan={nbColonnes} className="dashboard-custom__table-vide">
                                Aucune donnée pour cette date.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!generation && !data && !erreurGeneration && (
            <div className="dashboard-page__status">
              Choisissez vos paramètres puis cliquez sur "Générer" pour afficher le tableau.
            </div>
          )}
        </>
      )}
    </div>
  );
}