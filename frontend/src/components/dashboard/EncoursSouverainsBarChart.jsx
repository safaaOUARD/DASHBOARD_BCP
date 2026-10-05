import React from "react";
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
import {
  ZONES_ORDER,
  ZONE_LABELS,
  OPACITE_SEGMENT_CREDIT,
  OPACITE_SEGMENT_TITRES,
} from "./encoursSouverainsConfig";
import "./EncoursSouverainsBarChart.css";

/**
 * Transforme les séries brutes du backend :
 *   { date_courante: [{zone, encours_credit, encours_titres,
 *                       encours_total, pourcentage_credit,
 *                       pourcentage_titres, taux_couverture}, ...], ... }
 * en données prêtes pour recharts (une ligne par zone, avec toutes les
 * dates sélectionnées aplaties en colonnes préfixées par la clé de
 * date) :
 *   [{ zone: "UEMOA",
 *      date_courante_credit: 25.5, date_courante_titres: 3.2,
 *      date_courante_total: 28.7, date_courante_taux: 9.2,
 *      date_courante_pct_credit: 88.9, date_courante_pct_titres: 11.1,
 *      ... }, ...]
 */
function buildChartData(series, selectedKeys) {
  return ZONES_ORDER.map((zone) => {
    const ligne = { zone };

    selectedKeys.forEach((dateKey) => {
      const entree = (series[dateKey] || []).find((z) => z.zone === zone);

      ligne[`${dateKey}_credit`] = entree ? entree.encours_credit : 0;
      ligne[`${dateKey}_titres`] = entree ? entree.encours_titres : 0;
      ligne[`${dateKey}_total`] = entree ? entree.encours_total : 0;
      ligne[`${dateKey}_taux`] = entree ? entree.taux_couverture : 0;
      ligne[`${dateKey}_pct_credit`] = entree ? entree.pourcentage_credit : 0;
      ligne[`${dateKey}_pct_titres`] = entree ? entree.pourcentage_titres : 0;
    });

    return ligne;
  });
}

// Label affiché à l'intérieur d'un segment (pourcentage), masqué si le
// segment est trop petit pour être lisible.
function LabelSegment({ x, y, width, height, value }) {
  if (!value || height < 14) {
    return null;
  }

  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={10}
      fill="#374151"
      fontWeight={600}
    >
      {value}%
    </text>
  );
}

// Label affiché au-dessus de chaque barre empilée : taux de couverture
// (couleur distincte) et montant total en MMAD juste en dessous,
// conformément au point 12 du cahier des charges. Recharts propage tous
// les champs de la ligne de données directement dans les props du
// label (pas besoin de "payload"), donc on peut lire ici les valeurs
// des AUTRES colonnes de la même ligne (total, taux) même si le
// LabelList est rattaché au dataKey "_total".
function LabelSommetBarre({ x, y, width, index, dateKey, color, data }) {
  const ligne = data ? data[index] : null;
  if (!ligne) {
    return null;
  }

  const total = ligne[`${dateKey}_total`];
  const taux = ligne[`${dateKey}_taux`];

  if (total === undefined || total === null) {
    return null;
  }

  const yTaux = Math.max(y - 20, 12);
  const yTotal = Math.max(y - 6, 26);

  return (
    <g>
      <text x={x + width / 2} y={yTaux} textAnchor="middle" fontSize={11} fill={color} fontWeight={700}>
        {taux}%
      </text>
      <text x={x + width / 2} y={yTotal} textAnchor="middle" fontSize={11} fill="#374151" fontWeight={600}>
        {(total / 1000).toFixed(1)} Md
      </text>
    </g>
  );
}

function TooltipEncoursSouverains({ active, payload, label, configParCle }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const ligne = payload[0].payload;

  // Regroupe les segments par date (2 entrées recharts par date : credit + titres)
  const dateKeys = Object.keys(configParCle).filter((cle) =>
    payload.some((p) => p.dataKey === `${cle}_credit` || p.dataKey === `${cle}_titres`)
  );

  return (
    <div className="encours-souverains-chart__tooltip">
      <div className="encours-souverains-chart__tooltip-title">
        {ZONE_LABELS[label] || label}
      </div>
      {dateKeys.map((dateKey) => (
        <div key={dateKey} className="encours-souverains-chart__tooltip-block">
          <div
            className="encours-souverains-chart__tooltip-date"
            style={{ color: configParCle[dateKey]?.color }}
          >
            {configParCle[dateKey]?.label || dateKey}
          </div>
          <div>Crédit : {ligne[`${dateKey}_credit`]} MMAD ({ligne[`${dateKey}_pct_credit`]}%)</div>
          <div>Titres : {ligne[`${dateKey}_titres`]} MMAD ({ligne[`${dateKey}_pct_titres`]}%)</div>
          <div>Total : {ligne[`${dateKey}_total`]} MMAD</div>
          <div>Taux de couverture : {ligne[`${dateKey}_taux`]}%</div>
        </div>
      ))}
    </div>
  );
}

/**
 * Barres empilées : Axe X = zone (UEMOA, CEMAC, AUTRES, TOTAL), une
 * couleur par date sélectionnée, chaque barre étant composée de 2
 * segments empilés (Crédit en couleur pleine, Titres en couleur
 * atténuée de la même teinte).
 *
 * Props:
 *  - series: { [dateKey]: [{zone, encours_credit, encours_titres,
 *              encours_total, pourcentage_credit, pourcentage_titres,
 *              taux_couverture}] } — issu du backend
 *  - selectedKeys: string[] — dates actuellement sélectionnées
 *  - seriesConfig: [{ key, label, color }] — DATE_SERIES_CONFIG par défaut
 */
export default function EncoursSouverainsBarChart({
  series = {},
  selectedKeys = [],
  seriesConfig,
}) {
  const chartData = buildChartData(series, selectedKeys);
  const isEmpty = chartData.every((ligne) =>
    selectedKeys.every((cle) => !ligne[`${cle}_total`])
  );

  const configParCle = Object.fromEntries(
    seriesConfig.map((s) => [s.key, s])
  );

  return (
    <div className="encours-souverains-chart">
      {isEmpty ? (
        <div className="encours-souverains-chart__empty">
          Aucune donnée disponible pour cette sélection
        </div>
      ) : (
        <>
        
          <ResponsiveContainer width="100%" height={460}>
            <BarChart data={chartData} margin={{ top: 70, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="zone"
                tickFormatter={(z) => ZONE_LABELS[z] || z}
                tick={{ fontSize: 12, fill: "#374151", fontWeight: 600 }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6B7280" }}
                label={{ value: "MMAD", angle: -90, position: "insideLeft", fill: "#6B7280", fontSize: 12 }}
              />
              <Tooltip content={<TooltipEncoursSouverains configParCle={configParCle} />} />
              <Legend
                formatter={(key) => configParCle[key]?.label || key}
                wrapperStyle={{ fontSize: 13 }}
              />
              {selectedKeys.map((dateKey) => {
                const color = configParCle[dateKey]?.color || "#95A5A6";
                return (
                  <React.Fragment key={dateKey}>
                    <Bar
                      dataKey={`${dateKey}_credit`}
                      name={dateKey}
                      stackId={dateKey}
                      fill={color}
                      fillOpacity={OPACITE_SEGMENT_CREDIT}
                    >
                      <LabelList dataKey={`${dateKey}_pct_credit`} content={LabelSegment} />
                    </Bar>
                    <Bar
                      dataKey={`${dateKey}_titres`}
                      name={dateKey}
                      stackId={dateKey}
                      fill={color}
                      fillOpacity={OPACITE_SEGMENT_TITRES}
                      stroke={color}
                      strokeWidth={1}
                      legendType="none"
                    >
                      <LabelList dataKey={`${dateKey}_pct_titres`} content={LabelSegment} />
                      <LabelList
                        dataKey={`${dateKey}_total`}
                        content={(props) => <LabelSommetBarre {...props} dateKey={dateKey} color={color} data={chartData}  />}
                      />
                    </Bar>
                  </React.Fragment>
                );
              })}
            </BarChart>
          </ResponsiveContainer>

          <div className="encours-souverains-chart__legende-segments">
            <span className="encours-souverains-chart__swatch encours-souverains-chart__swatch--plein" />
            Crédit (CHAABI BANK + ENGAGEMENT)
            <span className="encours-souverains-chart__swatch encours-souverains-chart__swatch--clair" />
            Titres
          </div>
        </>
      )}
    </div>
  );
}
