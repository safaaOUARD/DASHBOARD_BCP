// Palette et configuration du dashboard "Répartition par Zone".
// Miroir de segmentationConfig.js — à compléter avec les vraies valeurs
// de zone renvoyées par fact_engagement une fois connues.

export const ZONE_COLORS = {
  MAROC: "#1B4F72", // bleu BCP
  "AFRIQUE DU NORD": "#E67E22", // orange BCP
  UEMOA: "#2E8B57", // vert sobre
  CEMAC: "#B03A2E", // rouge sobre
  EUROPE: "#6C5B7B", // violet sobre
  AMERIQUE: "#2980B9", // bleu clair
  ASIE: "#C9A227", // ocre
  "AUTRES (Pays de présence)": "#7F8C8D", // gris moyen
  AUTRES: "#95A5A6", // gris neutre — fallback
};

export const ZONE_ORDER = [
  "MAROC",
  "AFRIQUE DU NORD",
  "UEMOA",
  "CEMAC",
  "EUROPE",
  "AMERIQUE",
  "ASIE",
  "AUTRES (Pays de présence)",
  "AUTRES",
];

// Déclaration des 4 cartes du dashboard Répartition par Zone.
// Mêmes clés que le backend (dashboard_zone_router.py) et que
// Segmentation Bâloise, pour rester compatible avec useDashboardData
// et DonutCard sans rien changer côté hook.
export const ZONE_CARDS = [
  { key: "date_courante", title: "Situation actuelle", subtitle: "T0" },
  { key: "trimestre_precedent", title: "Trimestre précédent", subtitle: "T-1" },
  { key: "annee_precedente", title: "Année précédente", subtitle: "N-1" },
  { key: "arret_annuel", title: "Arrêté annuel", subtitle: "31/12 N-1" },
];