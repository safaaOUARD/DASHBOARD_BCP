import { useState, useEffect, useCallback } from "react";
import { useDateArret } from "../../context/DateArretContext";

const BASE_URL = "/api/dashboard/custom";

/**
 * Charge la configuration dynamique du dashboard personnalisé
 * (dimensions, mesures, filtres, types de graphique autorisés) depuis
 * le backend — une seule fois au montage.
 */
export function useCustomDashboardOptions() {
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let annule = false;

    async function charger() {
      setLoading(true);
      setError(null);
      try {
        const reponse = await fetch(`${BASE_URL}/options`);
        if (!reponse.ok) throw new Error("Impossible de charger la configuration du dashboard");
        const donnees = await reponse.json();
        if (!annule) setOptions(donnees);
      } catch (e) {
        if (!annule) setError(e.message);
      } finally {
        if (!annule) setLoading(false);
      }
    }

    charger();
    return () => { annule = true; };
  }, []);

  return { options, loading, error };
}

/**
 * Charge les valeurs distinctes d'une colonne de filtre (ex: liste des
 * Filiales existantes), à la demande — pas de fetch tant que `colonne`
 * est vide/null.
 */
export function useValeursDistinctes(colonne) {
  const { dateArret } = useDateArret();
  const [valeurs, setValeurs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!colonne || !dateArret) {
      setValeurs([]);
      return;
    }

    let annule = false;

    async function charger() {
      setLoading(true);
      try {
        const reponse = await fetch(`${BASE_URL}/valeurs?colonne=${encodeURIComponent(colonne)}&date_arret=${encodeURIComponent(dateArret)}`);
        if (!reponse.ok) throw new Error("Erreur de chargement des valeurs");
        const donnees = await reponse.json();
        if (!annule) setValeurs(donnees.valeurs || []);
      } catch {
        if (!annule) setValeurs([]);
      } finally {
        if (!annule) setLoading(false);
      }
    }

    charger();
    return () => { annule = true; };
  }, [colonne, dateArret]);

  return { valeurs, loading };
}

/**
 * Pilote le bouton "Générer" : envoie la config choisie en POST et
 * expose { data, loading, error, generer }. Rien ne se charge tant que
 * l'utilisateur n'a pas cliqué sur "Générer" (contrairement à
 * useDashboardData.js qui fetch automatiquement au montage).
 */
export function useCustomDashboardData() {
  const { dateArret } = useDateArret();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generer = useCallback(async (config) => {
    setLoading(true);
    setError(null);
    try {
      const reponse = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({...config,date_arret: dateArret,}),
      });

      if (!reponse.ok) {
        const detail = await reponse.json().catch(() => null);
        throw new Error(detail?.detail || "Erreur lors de la génération du graphique");
      }

      const donnees = await reponse.json();
      setData(donnees);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateArret]);

  return { data, loading, error, generer };
}
