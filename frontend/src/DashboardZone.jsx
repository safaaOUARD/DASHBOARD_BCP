import React, { useState, useMemo } from "react";
import { useDateArret } from "./context/DateArretContext";
import DonutCard from "./components/dashboard/DonutCard";
import DateSelector from "./components/dashboard/DateSelector";
import { ZONE_CARDS, ZONE_COLORS, ZONE_ORDER } from "./components/dashboard/zoneConfig";
import { useDashboardData } from "./components/dashboard/useDashboardData";
import "./DashboardSegmentation.css";

const LIBELLES_DATES_REFERENCE = {
  date_courante: "Situation actuelle (T0)",
  trimestre_precedent: "Trimestre précédent (T-1)",
  annee_precedente: "Année précédente (N-1)",
  arret_annuel: "Arrêté annuel",
};

// Ordre d'affichage des graphes, identique sur toutes les pages :
// T0, puis T-1, puis Arrêté annuel, puis N-1. Volontairement distinct
// de l'ordre chronologique reel des dates.
const ORDRE_AFFICHAGE_GRAPHES = [
  "date_courante",
  "trimestre_precedent",
  "arret_annuel",
  "annee_precedente",
];

// Options du DateSelector : cles issues de ZONE_CARDS (deja
// disponibles), libelles unifies ci-dessus, ordre des boutons inchange
// (celui de ZONE_CARDS). Les titres/sous-titres de ZONE_CARDS restent
// utilises tels quels pour l'en-tete de chaque DonutCard.
const DATE_OPTIONS = ZONE_CARDS.map(({ key }) => ({
  key,
  label: LIBELLES_DATES_REFERENCE[key],
}));
const TOUTES_LES_CLES = ZONE_CARDS.map((c) => c.key);

/**
 * Page "Dashboard – Répartition par Zone".
 * Totalement indépendante de DashboardSegmentation.jsx côté données et
 * config (endpoint, zoneConfig), mais réutilise le composant DonutCard
 * générique (props colorMap/order) plutôt qu'une copie dédiée — zéro
 * duplication, et DashboardSegmentation.jsx continue de fonctionner à
 * l'identique car DonutCard garde ses valeurs par défaut (SEGMENT_*).
 *
 * Comme les autres dashboards, l'utilisateur choisit d'abord les dates
 * de référence à afficher via DateSelector ; les cartes correspondantes
 * sont ensuite affichées dans l'ordre fixe T0 / T-1 / Arrêté annuel / N-1.
 */
export default function DashboardZone() {
  const { dateArret } = useDateArret();
  const [selectedDates, setSelectedDates] = useState(TOUTES_LES_CLES);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams();

    if (dateArret) {
      params.append("date_arret", dateArret);
    }

    params.append("dates", selectedDates.join(","));

    return `/api/dashboard/zones?${params.toString()}`;
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
    .map((cle) => ZONE_CARDS.find((c) => c.key === cle))
    .filter(Boolean);

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__header">
        <span className="dashboard-page__eyebrow">Dashboard</span>
        <h1 className="dashboard-page__title">Répartition par Zone</h1>
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
            <DonutCard
              key={key}
              title={title}
              subtitle={subtitle}
              date={datesReference[key]}
              data={data[key] || []}
              colorMap={ZONE_COLORS}
              order={ZONE_ORDER}
            />
          ))}
        </div>
      )}
    </div>
  );
}