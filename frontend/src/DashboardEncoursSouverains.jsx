import React, { useState, useMemo } from "react";
import { useDateArret } from "./context/DateArretContext";
import DateSelector from "./components/dashboard/DateSelector";
import EncoursSouverainsBarChart from "./components/dashboard/EncoursSouverainsBarChart";
import { DATE_SERIES_CONFIG } from "./components/dashboard/encoursSouverainsConfig";
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

const DATE_OPTIONS = DATE_SERIES_CONFIG.map(({ key }) => ({
  key,
  label: LIBELLES_DATES_REFERENCE[key],
}));
const TOUTES_LES_CLES = DATE_SERIES_CONFIG.map((d) => d.key);

const CLES_TOUJOURS_SELECTIONNEES = ["date_courante"];


export default function DashboardEncoursSouverains() {
  const { dateArret } = useDateArret();
  const [selectedDates, setSelectedDates] = useState(TOUTES_LES_CLES);

  const endpoint = useMemo(() => {
  const params = new URLSearchParams();

  if (dateArret) {
    params.append("date_arret", dateArret);
  }

  params.append("dates", selectedDates.join(","));

  return `/api/dashboard/encours-souverains?${params.toString()}`;
  }, [selectedDates, dateArret]); 

  const { data, loading, error, refetch } = useDashboardData(endpoint);

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
        <h1 className="dashboard-page__title">Répartition des Encours Souverains</h1>
      </div>

      <DateSelector
        options={DATE_OPTIONS}
        selected={selectedDates}
        onChange={setSelectedDates}
        datesDisponibles={data ? data.dates_disponibles : {}}
        clesVerrouillees={CLES_TOUJOURS_SELECTIONNEES}
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
        <EncoursSouverainsBarChart
          series={data}
          selectedKeys={clesAAfficher}
          seriesConfig={DATE_SERIES_CONFIG}
        />
      )}
    </div>
  );
}