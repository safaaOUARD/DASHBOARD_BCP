import React from "react";
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import "./ChartRenderer.css";

const PALETTE_CAMEMBERT = [
  "#1B4F72", "#E67E22", "#2E8B57", "#B03A2E",
  "#8E44AD", "#16A085", "#D4AC0D", "#7F8C8D",
];

/**
 * Rend un graphique unique (une des 4 dates) selon le chart_type choisi
 * par l'utilisateur dans ConfigPanel. Couleur fournie par le parent
 * (une couleur par date, cf. DATE_LABELS_COLORS).
 *
 * Props:
 *  - data: [{ x, y }] — déjà agrégé côté backend
 *  - chartType: "histogramme" | "barres_horizontales" | "courbe" | "camembert" | "aire" | "tableau"
 *  - color: string — couleur de la série pour cette date
 *  - xLabel / yLabel: string — libellés d'axes (dimension / mesure choisies)
 */
export default function ChartRenderer({ data = [], chartType, color, xLabel, yLabel }) {
  if (!data || data.length === 0) {
    return <div className="chart-renderer__empty">Aucune donnée trouvée pour cette date</div>;
  }

  if (chartType === "tableau") {
    return (
      <div className="chart-renderer__table-wrapper">
        <table className="chart-renderer__table">
          <thead>
            <tr>
              <th>{xLabel}</th>
              <th>{yLabel}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                <td>{String(row.x)}</td>
                <td>{row.y}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (chartType === "camembert") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie data={data} dataKey="y" nameKey="x" outerRadius={110} label>
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE_CAMEMBERT[i % PALETTE_CAMEMBERT.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [value, yLabel]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "courbe") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="x" tick={{ fontSize: 11, fill: "#6B7280" }} />
          <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} />
          <Tooltip formatter={(value) => [value, yLabel]} />
          <Line type="monotone" dataKey="y" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "aire") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="x" tick={{ fontSize: 11, fill: "#6B7280" }} />
          <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} />
          <Tooltip formatter={(value) => [value, yLabel]} />
          <Area type="monotone" dataKey="y" stroke={color} fill={color} fillOpacity={0.25} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "barres_horizontales") {
    return (
      <ResponsiveContainer width="100%" height={Math.max(320, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 24, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} />
          <YAxis type="category" dataKey="x" width={100} tick={{ fontSize: 11, fill: "#6B7280" }} />
          <Tooltip formatter={(value) => [value, yLabel]} />
          <Bar dataKey="y" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // "histogramme" (par défaut) : barres verticales
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="x" tick={{ fontSize: 11, fill: "#6B7280" }} />
        <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} />
        <Tooltip formatter={(value) => [value, yLabel]} />
        <Bar dataKey="y" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
