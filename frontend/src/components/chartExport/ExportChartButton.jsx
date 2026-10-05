import React, { useState } from "react";
import { exportChartAsImage } from "./exportUtils";
import "./ExportChartButton.css";

/**
 * Bouton discret d'export d'un graphique en image PNG.
 *
 * Composant totalement indépendant et générique : il ne connaît rien du
 * dashboard qui l'utilise, uniquement la ref du conteneur à exporter et
 * le titre à utiliser pour le nom du fichier. Réutilisable tel quel dans
 * n'importe quelle carte de n'importe quel dashboard, présent ou futur.
 *
 * Usage :
 *   const chartRef = useRef(null);
 *   <div ref={chartRef}>...graphique...</div>
 *   <ExportChartButton chartRef={chartRef} title="Segmentation Bâloise" />
 *
 * Props:
 *  - chartRef: RefObject — ref React du conteneur DOM à exporter
 *  - title: string — utilisé pour construire le nom du fichier téléchargé
 *  - className: string (optionnel) — classes CSS additionnelles
 */
export default function ExportChartButton({ chartRef, title, className = "" }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (event) => {
    event.stopPropagation();
    if (exporting) return;

    setExporting(true);
    try {
      await exportChartAsImage(chartRef, title);
    } catch (error) {
      console.error("Échec de l'export du graphique :", error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      type="button"
      className={`export-chart-button ${className}`.trim()}
      onClick={handleExport}
      disabled={exporting}
      title="Exporter le graphique en image"
      aria-label="Exporter le graphique en image"
      data-chart-export-ignore="true"
    >
      <svg
        className="export-chart-button__icon"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <span>{exporting ? "Export…" : "Exporter"}</span>
    </button>
  );
}
