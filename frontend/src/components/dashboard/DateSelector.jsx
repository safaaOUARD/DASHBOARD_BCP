import React from "react";
import { formatDate } from "./DonutCard";
import "./DateSelector.css";

/**
 * Sélecteur de dates de référence sous forme de cases à cocher.
 * Générique : réutilisable par tout futur dashboard permettant de
 * sélectionner 1 à N dates parmi les 4 dates de référence.
 *
 * Props:
 *  - options: [{ key, label }] — ex: DATE_SERIES_CONFIG (sans la couleur)
 *  - selected: string[] — clés actuellement sélectionnées
 *  - onChange: (string[]) => void
 *  - datesDisponibles: { [key]: isoDate } — pour afficher la date exacte
 *    à côté de chaque libellé, une fois chargée (optionnel)
 */
export default function DateSelector({ options, selected, onChange, datesDisponibles = {} }) {
  const toggle = (key) => {
    const isSelected = selected.includes(key);

    // Au moins une date doit rester sélectionnée à tout moment.
    if (isSelected && selected.length === 1) {
      return;
    }

    onChange(
      isSelected
        ? selected.filter((k) => k !== key)
        : [...selected, key]
    );
  };

  return (
    <div className="date-selector">
      {options.map(({ key, label }) => {
        const isSelected = selected.includes(key);
        const dateExacte = datesDisponibles[key];

        return (
          <label
            key={key}
            className={
              "date-selector__option" +
              (isSelected ? " date-selector__option--checked" : "")
            }
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggle(key)}
            />
            <span className="date-selector__label">{label}</span>
            {dateExacte && (
              <span className="date-selector__date">{formatDate(dateExacte)}</span>
            )}
          </label>
        );
      })}
    </div>
  );
}
