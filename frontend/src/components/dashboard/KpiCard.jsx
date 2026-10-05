import React from "react";
import "./KpiCard.css";

/**
 * Petite carte KPI affichée au-dessus d'un DonutCard.
 * Utilisée pour le dashboard Segmentation Bâloise afin d'afficher le
 * "Total engagements" (en MMDH) de la date considérée.
 *
 * Volontairement générique (label + value + unit) pour rester
 * réutilisable par de futurs dashboards, sans rien changer côté
 * Répartition par Zone qui n'affiche pas de carte KPI.
 *
 * Props:
 *  - label: string — libellé du KPI (ex: "Total engagements")
 *  - value: number|string — valeur à afficher (ex: 12.4)
 *  - unit: string — unité affichée à côté de la valeur (ex: "MMDH")
 */
export default function KpiCard({ label = "Total engagements", value, unit = "MMDH" }) {
  const hasValue = value !== null && value !== undefined && !Number.isNaN(Number(value));

  return (
    <div className="kpi-card">
      <span className="kpi-card__label">{label}</span>
      <span className="kpi-card__value">
        {hasValue ? value : "—"}
        {hasValue && <span className="kpi-card__unit"> {unit}</span>}
      </span>
    </div>
  );
}
