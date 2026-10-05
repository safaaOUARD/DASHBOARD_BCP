import { toPng } from "html-to-image";

/**
 * Utilitaires génériques pour l'export d'un graphique de dashboard en image.
 * Aucune dépendance à un dashboard en particulier : ce module ne connaît
 * que "un noeud DOM à capturer" + "un titre pour nommer le fichier".
 *
 * Nécessite la librairie "html-to-image" (npm install html-to-image).
 */

// Retire les accents et les caractères non alphanumériques d'un titre pour
// obtenir un nom de fichier propre. Ex: "Segmentation Bâloise" -> "Segmentation_Baloise"
function slugifyTitle(title) {
  const base = (title || "graphique")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les diacritiques (accents)
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "graphique";
}

function todayISODate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Construit le nom de fichier d'export à partir du titre du graphique.
 * Ex: buildExportFilename("Segmentation Bâloise") -> "Segmentation_Baloise_2026-03-31.png"
 */
export function buildExportFilename(title) {
  return `${slugifyTitle(title)}_${todayISODate()}.png`;
}

// Attribut posé sur les éléments à ignorer lors de la capture (ex: le
// bouton d'export lui-même, pour ne pas se retrouver dans l'image générée).
export const EXPORT_IGNORE_ATTR = "data-chart-export-ignore";

/**
 * Exporte le noeud DOM référencé par `chartRef` en image PNG haute résolution,
 * fond blanc garanti, et déclenche automatiquement le téléchargement.
 * Le rendu produit est identique à ce qui est affiché à l'écran (les noeuds
 * marqués avec EXPORT_IGNORE_ATTR, comme le bouton d'export, sont exclus).
 *
 * @param {React.RefObject<HTMLElement>} chartRef - ref du conteneur à exporter
 * @param {string} title - utilisé pour générer le nom du fichier téléchargé
 */
export async function exportChartAsImage(chartRef, title) {
  const node = chartRef && chartRef.current;
  if (!node) {
    console.error("exportChartAsImage: le noeud référencé est introuvable (chartRef.current est vide).");
    return;
  }

  const dataUrl = await toPng(node, {
    backgroundColor: "#ffffff",
    pixelRatio: 3, // export haute résolution
    cacheBust: true,
    filter: (domNode) => {
      // Exclut le bouton d'export (et tout élément marqué explicitement)
      // pour que l'image ne contienne que le graphique.
      return !(domNode.dataset && domNode.dataset.chartExportIgnore === "true");
    },
  });

  const link = document.createElement("a");
  link.download = buildExportFilename(title);
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
