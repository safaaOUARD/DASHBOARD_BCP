import React, { useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { SEGMENT_COLORS, SEGMENT_ORDER } from "./segmentationConfig";
import ExportChartButton from "../chartExport/ExportChartButton";
import "./DonutCard.css";

export function formatDate(isoDate) {
  if (!isoDate) return "—";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Neutralise les espaces multiples/insécables (\u00A0, tabs, etc. —
// \s en JS les capte tous) que Postgres TRIM() ne retire pas toujours,
// notamment sur des valeurs venant d'imports Excel.
function normalize(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : value;
}

/**
 * Carte réutilisable : titre + date analysée + donut chart + légende.
 * Utilisée pour les 4 cartes de "Segmentation Bâloise", et réutilisable
 * telle quelle pour de futurs dashboards basés sur une répartition par segment.
 *
 * Props:
 *  - title: string
 *  - subtitle: string (ex: "T0", "T-1"...)
 *  - date: string ISO (ex: "2026-07-17")
 *  - data: [{ [labelKey], nombre, pourcentage }]
 *  - colorMap: { [nom]: couleur } — par défaut SEGMENT_COLORS (Segmentation Bâloise)
 *  - order: string[] — ordre d'affichage — par défaut SEGMENT_ORDER
 *  - labelKey: string — nom du champ de regroupement dans data (ex: "segment", "zone") — par défaut "segment"
 *  - unit: string — unité des valeurs affichées (total, tooltip, légende) — par défaut "MMDH"
 *    (les donuts représentent désormais des montants d'engagement (ead_mad), plus des nombres de dossiers)
 */
export default function DonutCard({
  title,
  subtitle,
  date,
  data = [],
  colorMap = SEGMENT_COLORS,
  order = SEGMENT_ORDER,
  labelKey = "segment",
  unit = "MMDH",
}) {
  console.log("DEBUG DonutCard →", { labelKey, colorMapKeys: Object.keys(colorMap) });
  const orderIndex = (label) => {
    const idx = order.indexOf(label);
    return idx === -1 ? order.length : idx; // valeurs inconnues en dernier
  };
  const normalizedData = data.map((entry) => ({
    ...entry,
    [labelKey]: normalize(entry[labelKey]),
  }));
  const sortedData = [...normalizedData].sort(
    (a, b) => orderIndex(a[labelKey]) - orderIndex(b[labelKey])
  );
  const total = sortedData.reduce((sum, item) => sum + item.nombre, 0);
  const isEmpty = total === 0;
  const chartRef = useRef(null);

  return (
    <div className="dashboard-card" ref={chartRef}>
      <div className="dashboard-card__header">
        <div>
          <h3 className="dashboard-card__title">{title}</h3>
          <span className="dashboard-card__subtitle">{subtitle}</span>
        </div>
        <div className="dashboard-card__header-actions">
          <span className="dashboard-card__date">{formatDate(date)}</span>
          <ExportChartButton chartRef={chartRef} title={title} />
        </div>
      </div>

      {isEmpty ? (
        <div className="dashboard-card__empty">Aucune donnée disponible pour cette période</div>
      ) : (
        <>
          <div className="dashboard-card__chart">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={sortedData}
                  dataKey="nombre"
                  nameKey={labelKey}
                  innerRadius="60%"
                  outerRadius="85%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {sortedData.map((entry) => (
                    <Cell
                      key={entry[labelKey]}
                      fill={colorMap[entry[labelKey]] || "#95A5A6"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} ${unit}`, name]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    fontSize: 13,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="dashboard-card__total">
              <span className="dashboard-card__total-value">{total}</span>
              <span className="dashboard-card__total-label">{unit}</span>
            </div>
          </div>

          <ul className="dashboard-card__legend">
            {sortedData.map((entry) => (
              <li key={entry[labelKey]} className="dashboard-card__legend-item">
                <span
                  className="dashboard-card__legend-dot"
                  style={{ backgroundColor: colorMap[entry[labelKey]] || "#95A5A6" }}
                />
                <span className="dashboard-card__legend-name">{entry[labelKey]}</span>
                <span className="dashboard-card__legend-value">
                  {entry.nombre} {unit} · {entry.pourcentage}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}