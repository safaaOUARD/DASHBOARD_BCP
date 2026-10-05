import React, { useState, useMemo } from "react";
import { useDateArret } from "./context/DateArretContext";
import GroupedBarCard from "./components/dashboard/GroupedBarCard";
import DateSelector from "./components/dashboard/DateSelector";
import {
  SOUVERAINS_DATE_KEYS,
  SOUVERAINS_DATE_LABELS,
  SOUVERAINS_DATE_COLORS,
} from "./components/dashboard/souverainsConfig";
import { useDashboardData } from "./components/dashboard/useDashboardData";
import "./DashboardSegmentation.css";

const LIBELLES_DATES_REFERENCE = {
  date_courante: "Situation actuelle (T0)",
  trimestre_precedent: "Trimestre précédent (T-1)",
  annee_precedente: "Année précédente (N-1)",
  arret_annuel: "Arrêté annuel",
};

// Ordre d'affichage des graphes, identique sur toutes les pages :
// T0, puis T-1, puis Arrêté annuel, puis N-1.
const ORDRE_AFFICHAGE_GRAPHES = [
  "date_courante",
  "trimestre_precedent",
  "arret_annuel",
  "annee_precedente",
];

// Options du DateSelector construites a partir de SOUVERAINS_DATE_KEYS
// (deja disponible), avec les libelles unifies ci-dessus.
const DATE_OPTIONS = SOUVERAINS_DATE_KEYS.map((key) => ({
  key,
  label: LIBELLES_DATES_REFERENCE[key],
}));

/**
 * Page "Dashboard – Répartition des Souverains".
 * Même architecture (header, statuts de chargement/erreur, hook,
 * CSS de layout) que DashboardSegmentation.jsx / DashboardZone.jsx.
 * Seule différence structurelle : une carte BarChart unique
 * (GroupedBarCard) au lieu de 4 DonutCard, car les dates sélectionnées
 * sont affichées ensemble sur un même graphique plutôt qu'une carte
 * par date.
 *
 * Comme les autres dashboards, l'utilisateur choisit d'abord les dates
 * de référence à afficher via DateSelector ; les barres correspondantes
 * sont ensuite affichées dans l'ordre fixe T0 / T-1 / Arrêté annuel / N-1.
 */
export default function DashboardSouverains() {
  const { dateArret } = useDateArret();
  const [selectedDates, setSelectedDates] = useState(SOUVERAINS_DATE_KEYS);

  const endpoint = useMemo(() => {
  const params = new URLSearchParams();

  if (dateArret) {
    params.append("date_arret", dateArret);
  }

  params.append("dates", selectedDates.join(","));

  return `/api/dashboard/souverains?${params.toString()}`;
}, [selectedDates, dateArret]);
  const { data, loading, error, refetch } = useDashboardData(endpoint);

  const datesReference = data?.dates || {};

  const clesAAfficher = (data?.dates_selectionnees || selectedDates)
    .slice()
    .sort(
      (a, b) =>
        ORDRE_AFFICHAGE_GRAPHES.indexOf(a) - ORDRE_AFFICHAGE_GRAPHES.indexOf(b)
    );

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__header">
        <span className="dashboard-page__eyebrow">Dashboard</span>
        <h1 className="dashboard-page__title">Répartition des Souverains</h1>
      </div>

      <DateSelector
        options={DATE_OPTIONS}
        selected={selectedDates}
        onChange={setSelectedDates}
        datesDisponibles={datesReference}
      />

      {loading && <div className="dashboard-page__status">Chargement des données…</div>}

      {!loading && error && (
        <div className="dashboard-page__status dashboard-page__status--error">
          <span>{error}</span>
          <button className="dashboard-page__retry" onClick={refetch}>
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <GroupedBarCard
          title="Exposition Souverains par catégorie"
          data={data.categories || []}
          dateKeys={clesAAfficher}
          dateLabels={SOUVERAINS_DATE_LABELS}
          dateColors={SOUVERAINS_DATE_COLORS}
          unit="MMDH"
        />
      )}
    </div>
  );
}