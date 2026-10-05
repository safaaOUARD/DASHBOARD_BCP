import React, { useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { RATING_ORDER } from "./ratingPaysConfig";
import ExportChartButton from "../chartExport/ExportChartButton";
import "./RatingPaysBarChart.css";

function normalize(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : value;
}

function orderIndex(label) {
  const idx = RATING_ORDER.indexOf(label);
  return idx === -1 ? RATING_ORDER.length : idx;
}

const PAYS_PAR_LIGNE = 2;

function buildChartData(series, selectedKeys) {
  const parNote = {};

  selectedKeys.forEach((dateKey) => {
    (series[dateKey] || []).forEach((entry) => {
      const note = normalize(entry.note_retenue);
      if (!parNote[note]) {
        parNote[note] = { note_retenue: note, pays: new Set() };
      }
      parNote[note][dateKey] = entry.pourcentage;
      (entry.pays || []).forEach((p) => parNote[note].pays.add(p));
    });
  });

  return Object.values(parNote)
    .map((item) => ({ ...item, pays: Array.from(item.pays).sort() }))
    .sort((a, b) => orderIndex(a.note_retenue) - orderIndex(b.note_retenue));
}

// Découpe une liste de pays en lignes de PAYS_PAR_LIGNE éléments
function decouperEnLignes(pays) {
  const lignes = [];
  for (let i = 0; i < pays.length; i += PAYS_PAR_LIGNE) {
    lignes.push(pays.slice(i, i + PAYS_PAR_LIGNE).join(", "));
  }
  return lignes;
}

// Tick d'axe X personnalisé : nom de la note + liste des pays en dessous
function TickNoteEtPays({ x, y, payload, chartData }) {
  const item = chartData.find((d) => d.note_retenue === payload.value);
  const lignes = decouperEnLignes(item?.pays || []);

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fontSize={12} fontWeight={600} fill="#374151">
        {payload.value}
      </text>
      {lignes.map((ligne, i) => (
        <text
          key={i}
          x={0}
          y={0}
          dy={28 + i * 12}
          textAnchor="middle"
          fontSize={10}
          fill="#9CA3AF"
        >
          {ligne}
        </text>
      ))}
    </g>
  );
}

// Tooltip personnalisé : pourcentage par date + liste des pays de la note
function TooltipNoteEtPays({ active, payload, label, configParCle }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="rating-pays-chart__tooltip">
      <div className="rating-pays-chart__tooltip-title">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="rating-pays-chart__tooltip-row">
          <span
            className="rating-pays-chart__tooltip-swatch"
            style={{ backgroundColor: p.color }}
          />
          {(configParCle[p.dataKey]?.label || p.dataKey)}: {p.value}%
        </div>
      ))}
      {item.pays && item.pays.length > 0 && (
        <div className="rating-pays-chart__tooltip-pays">
          Pays : {item.pays.join(", ")}
        </div>
      )}
    </div>
  );
}

/**
 * Histogramme groupé : Axe X = note_retenue (+ pays associés en dessous),
 * Axe Y = pourcentage du total des engagements, une couleur par date
 * sélectionnée.
 *
 * Props:
 *  - series: { [dateKey]: [{note_retenue, montant, pourcentage, pays}] } — issu du backend
 *  - selectedKeys: string[] — dates actuellement sélectionnées (ordre d'affichage des barres)
 *  - seriesConfig: [{ key, label, color }] — DATE_SERIES_CONFIG par défaut
 *  - unit: string — unité affichée sur l'axe Y et dans le tooltip, par défaut "%"
 *  - title: string — utilisé pour le nom du fichier lors de l'export image, par défaut "Rating Pays"
 */
export default function RatingPaysBarChart({
  series = {},
  selectedKeys = [],
  seriesConfig,
  unit = "%",
  title = "Rating Pays",
}) {
  const chartData = buildChartData(series, selectedKeys);
  const isEmpty = chartData.length === 0;
  const chartRef = useRef(null);

  const configParCle = Object.fromEntries(
    seriesConfig.map((s) => [s.key, s])
  );

  // Hauteur de l'axe X adaptée au nombre de lignes de pays à afficher
  const maxLignes = chartData.reduce(
    (max, item) => Math.max(max, decouperEnLignes(item.pays).length),
    0
  );
  const hauteurAxeX = 40 + maxLignes * 12;

  return (
    <div className="rating-pays-chart" ref={chartRef}>
      <div className="rating-pays-chart__header">
        <ExportChartButton chartRef={chartRef} title={title} />
      </div>
      {isEmpty ? (
        <div className="rating-pays-chart__empty">
          Aucune donnée disponible pour cette sélection
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={420 + maxLignes * 12}>
          <BarChart data={chartData} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="note_retenue"
              interval={0}
              height={hauteurAxeX}
              tick={(props) => <TickNoteEtPays {...props} chartData={chartData} />}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#6B7280" }}
              unit={unit}
              domain={[0, (dataMax) => Math.ceil(dataMax + 10)]}
              label={{ value: unit, angle: -90, position: "insideLeft", fill: "#6B7280", fontSize: 12 }}
            />
            <Tooltip content={<TooltipNoteEtPays configParCle={configParCle} />} />
            <Legend
              formatter={(key) => configParCle[key]?.label || key}
              wrapperStyle={{ fontSize: 13 }}
            />
            {selectedKeys.map((dateKey) => (
              <Bar
                key={dateKey}
                dataKey={dateKey}
                name={dateKey}
                fill={configParCle[dateKey]?.color || "#95A5A6"}
                radius={[4, 4, 0, 0]}
              >
                <LabelList
                  dataKey={dateKey}
                  position="top"
                  formatter={(value) => `${value}%`}
                  style={{ fontSize: 11, fill: "#374151" }}
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}