// Palette et configuration partagées pour tous les dashboards.
// Ajouter ici les futurs segments/couleurs pour garder une seule source de vérité.

export const SEGMENT_COLORS = {
  CLIENTELES: "#1B4F72", // bleu BCP
  BANQUES: "#E67E22", // orange BCP
  SOUVERAINS: "#2E8B57", // vert sobre
  "BANQUE CENTRALE": "#B03A2E", // rouge sobre
};

export const SEGMENT_ORDER = ["CLIENTELES", "BANQUES", "SOUVERAINS", "BANQUE CENTRALE"];

// Déclaration des 4 cartes du dashboard Segmentation Bâloise.
// Les clés doivent correspondre à celles renvoyées par le backend.
export const SEGMENTATION_BALOISE_CARDS = [
  { key: "date_courante", title: "Situation actuelle", subtitle: "T0" },
  { key: "trimestre_precedent", title: "Trimestre précédent", subtitle: "T-1" },
  { key: "annee_precedente", title: "Année précédente", subtitle: "N-1" },
  { key: "arret_annuel", title: "Arrêté annuel", subtitle: "31/12 N-1" },
];
