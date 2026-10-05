// Configuration du dashboard "Répartition des Souverains".
// Contrepartie de zoneConfig.js / typeConfig.js, mais pour un BarChart
// groupé (montants en MMDH par date) plutôt qu'un donut (% par date).

export const SOUVERAINS_DATE_KEYS = [
  "date_courante",
  "trimestre_precedent",
  "annee_precedente",
  "arret_annuel",
];

export const SOUVERAINS_DATE_LABELS = {
  date_courante: "T0",
  trimestre_precedent: "T-1",
  annee_precedente: "N-1",
  arret_annuel: "Arrêté annuel",
};

export const SOUVERAINS_DATE_COLORS = {
  date_courante: "#1B4F72", // bleu BCP
  trimestre_precedent: "#E67E22", // orange BCP
  annee_precedente: "#2E8B57", // vert sobre
  arret_annuel: "#B03A2E", // rouge sobre
};
