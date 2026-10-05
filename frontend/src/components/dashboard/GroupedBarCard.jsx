import React, { useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import ExportChartButton from "../chartExport/ExportChartButton";
import "./DonutCard.css"; // réutilise .dashboard-card, déjà générique — pas de nouveau CSS

/**
 * Carte générique : BarChart groupé Recharts, une barre par date pour
 * chaque catégorie de l'axe X. Contrepartie de DonutCard.jsx pour les
 * dashboards "montant" (MMDH, etc.) plutôt que "répartition en %".
 * Ne modifie ni DonutCard.jsx ni DonutCard.css — juste réutilisé.
 *
 * Props:
 *  - title / subtitle: string
 *  - data: [{ categorie, [dateKey]: montant, ... }]
 *  - dateKeys: string[] — ordre des dates (ex: ["date_courante", ...])
 *  - dateLabels: { [dateKey]: string } — libellés affichés (T0, T-1...)
 *  - dateColors: { [dateKey]: couleur } — une couleur par date
 *  - unit: string — suffixe affiché (ex: "MMDH")
 */
export default function GroupedBarCard({
  title,
  subtitle,
  data = [],
  dateKeys,
  dateLabels = {},
  dateColors = {},
  unit = "",
}) {
  const isEmpty = data.length === 0;
  const chartRef = useRef(null);

  return (
    <div className="dashboard-card" ref={chartRef}>
      <div className="dashboard-card__header">
        <div>
          <h3 className="dashboard-card__title">{title}</h3>
          {subtitle && <span className="dashboard-card__subtitle">{subtitle}</span>}
        </div>
        <div className="dashboard-card__header-actions">
          <ExportChartButton chartRef={chartRef} title={title} />
        </div>
      </div>

      {isEmpty ? (
        <div className="dashboard-card__empty">Aucune donnée disponible pour cette période</div>
      ) : (
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="categorie" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              label={{ value: unit, angle: -90, position: "insideLeft", fontSize: 12 }}
            />
            <Tooltip
              formatter={(value, name) => [`${value} ${unit}`, dateLabels[name] || name]}
              contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13 }}
            />
            <Legend formatter={(name) => dateLabels[name] || name} />
            {dateKeys.map((key) => (
              <Bar key={key} dataKey={key} name={key} fill={dateColors[key] || "#95A5A6"}>
                <LabelList dataKey={key} position="top" fontSize={11} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
