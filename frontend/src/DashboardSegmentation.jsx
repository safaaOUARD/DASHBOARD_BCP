import React, { useState, useMemo } from "react";
import { useDateArret } from "./context/DateArretContext";
import DonutCard from "./components/dashboard/DonutCard";
import KpiCard from "./components/dashboard/KpiCard";
import DateSelector from "./components/dashboard/DateSelector";
import { SEGMENTATION_BALOISE_CARDS } from "./components/dashboard/segmentationConfig";
import { useDashboardData } from "./components/dashboard/useDashboardData";
import "./DashboardSegmentation.css";

const LIBELLES_DATES_REFERENCE = {
  date_courante: "Situation actuelle (T0)",
  trimestre_precedent: "Trimestre précédent (T-1)",
  annee_precedente: "Année précédente (N-1)",
  arret_annuel: "Arrêté annuel",
};

const ORDRE_AFFICHAGE_GRAPHES = [
  "date_courante",
  "trimestre_precedent",
  "arret_annuel",
  "annee_precedente",
];

const DATE_OPTIONS = SEGMENTATION_BALOISE_CARDS.map(({ key }) => ({
  key,
  label: LIBELLES_DATES_REFERENCE[key],
}));
const TOUTES_LES_CLES = SEGMENTATION_BALOISE_CARDS.map((c) => c.key);

/**
 * Page "Dashboard – Segmentation Bâloise".
 * Totalement indépendante de la page Engagements : source de données,
 * état et composants propres. Le layout (grille de cartes + hook générique
 * + config de couleurs) est pensé pour être copié/adapté pour de futurs
 * dashboards (autre endpoint, autres cartes).
 *
 * Comme les autres dashboards, l'utilisateur choisit d'abord les dates
 * de référence à afficher via DateSelector ; les cartes correspondantes
 * sont ensuite affichées dans l'ordre fixe T0 / T-1 / Arrêté annuel / N-1.
 */
export default function DashboardSegmentation() {
  const { dateArret } = useDateArret();
  const [selectedDates, setSelectedDates] = useState(TOUTES_LES_CLES);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams();

    if (dateArret) {
      params.append("date_arret", dateArret);
    }

    params.append("dates", selectedDates.join(","));

    return `/api/dashboard/segmentation-baloise?${params.toString()}`;
  }, [selectedDates, dateArret]);

  const { data, loading, error, refetch } = useDashboardData(endpoint);

  const datesReference = data?.dates || {};

  const clesAAfficher = (data?.dates_selectionnees || selectedDates)
    .slice()
    .sort(
      (a, b) =>
        ORDRE_AFFICHAGE_GRAPHES.indexOf(a) - ORDRE_AFFICHAGE_GRAPHES.indexOf(b)
    );

  const cartesAAfficher = clesAAfficher
    .map((cle) => SEGMENTATION_BALOISE_CARDS.find((c) => c.key === cle))
    .filter(Boolean);

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__header">
        <span className="dashboard-page__eyebrow">Dashboard</span>
        <h1 className="dashboard-page__title">Segmentation Bâloise</h1>
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
        <div className="dashboard-page__grid">
          {cartesAAfficher.map(({ key, title, subtitle }) => (
            <div key={key} className="dashboard-page__cell">
              <KpiCard
                label="Total engagements"
                value={data.totaux ? data.totaux[key] : null}
              />
              <DonutCard
                title={title}
                subtitle={subtitle}
                date={datesReference[key]}
                data={data[key] || []}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}