// Mêmes 4 dates de référence et mêmes couleurs que les autres
// dashboards du projet (Rating Pays, Segmentation, etc.), pour une
// cohérence visuelle parfaite entre les dashboards.
export const DATE_SERIES_CONFIG = [
  { key: "date_courante", label: "Situation actuelle (T0)", color: "#1B4F72" },
  { key: "trimestre_precedent", label: "Trimestre précédent (T-1)", color: "#E67E22" },
  { key: "annee_precedente", label: "Année précédente (N-1)", color: "#2E8B57" },
  { key: "arret_annuel", label: "Arrêté annuel (31/12 N-1)", color: "#B03A2E" },
];

// Ordre d'affichage des zones sur l'axe X (TOTAL toujours en dernier)
export const ZONES_ORDER = ["UEMOA", "CEMAC", "AUTRES", "TOTAL"];

// Libellés affichés pour chaque zone (identiques aux clés ici, mais
// centralisés pour permettre un renommage facile plus tard)
export const ZONE_LABELS = {
  UEMOA: "UEMOA",
  CEMAC: "CEMAC",
  AUTRES: "AUTRES",
  TOTAL: "TOTAL",
};

// Opacité utilisée pour distinguer le segment "Titres" (plus clair) du
// segment "Crédit" (couleur pleine) au sein d'une même barre de date.
export const OPACITE_SEGMENT_CREDIT = 1;
export const OPACITE_SEGMENT_TITRES = 0.35;
