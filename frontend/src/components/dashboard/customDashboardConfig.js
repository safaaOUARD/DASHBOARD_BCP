// Configuration du Dashboard Personnalisée.
// Contrairement à segmentationConfig.js / ratingPaysConfig.js, la liste
// des dimensions/mesures/filtres n'est PAS dupliquée ici : elle est
// chargée dynamiquement depuis GET /api/dashboard/custom/options, qui
// reflète la liste blanche réelle du backend (seule source de vérité,
// pour éviter que frontend et backend divergent).

// Une couleur par date de référence, réutilisant la palette BCP déjà
// utilisée par les autres dashboards (bleu = T0, orange = T-1, vert = N-1, rouge = annuel).
export const DATE_LABELS_COLORS = {
  date_courante: { label: "Situation actuelle (T0)", color: "#1B4F72" },
  trimestre_precedent: { label: "Trimestre précédent (T-1)", color: "#E67E22" },
  annee_precedente: { label: "Année précédente (N-1)", color: "#2E8B57" },
  arret_annuel: { label: "Arrêté annuel (31/12 N-1)", color: "#B03A2E" },
};

export const ORDRE_DATES = [
  "date_courante",
  "trimestre_precedent",
  "annee_precedente",
  "arret_annuel",
];

// Libellés des agrégations (les clés doivent correspondre exactement
// aux valeurs renvoyées dans mesures[].aggregations par /options).
export const AGGREGATION_LABELS = {
  COUNT: "Nombre (COUNT)",
  SUM: "Somme (SUM)",
  AVG: "Moyenne (AVG)",
  MIN: "Minimum (MIN)",
  MAX: "Maximum (MAX)",
};