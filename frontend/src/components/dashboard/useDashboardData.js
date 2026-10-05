import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook générique pour appeler un endpoint de dashboard et gérer
 * proprement le chargement / les erreurs / le rafraîchissement.
 *
 * Réutilisable pour tous les futurs dashboards :
 *   useDashboardData("/api/dashboard/segmentation-baloise")
 *   useDashboardData("/api/dashboard/un-autre-dashboard")
 *
 * Protection contre les race conditions : si l'utilisateur change
 * rapidement de sélection (ex: décoche plusieurs dates coup sur coup),
 * plusieurs requêtes peuvent partir en parallèle. Sans protection, une
 * requête plus ancienne qui répond APRÈS une requête plus récente
 * écraserait le résultat correct avec des données obsolètes (ex : une
 * date décochée qui continue à s'afficher dans le graphique).
 *
 * On protège avec un identifiant de requête (`requestIdRef`) : seule la
 * réponse correspondant à la toute dernière requête envoyée est prise
 * en compte. On annule aussi la requête précédente via AbortController
 * pour éviter de charger le réseau inutilement.
 */
export function useDashboardData(endpoint) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const requestIdRef = useRef(0);
  const abortControllerRef = useRef(null);

  const fetchData = useCallback(async () => {
    // Annule la requête précédente si elle est encore en cours
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const currentRequestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status} lors du chargement des données`);
      }

      const json = await response.json();

      // Si une requête plus récente a été lancée entre-temps, on
      // ignore cette réponse : elle est obsolète.
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      setData(json);
    } catch (err) {
      // Une requête annulée volontairement (AbortError) ne doit pas
      // afficher d'erreur à l'utilisateur.
      if (err.name === "AbortError") {
        return;
      }
      if (currentRequestId !== requestIdRef.current) {
        return;
      }
      setError(err.message || "Une erreur inattendue est survenue");
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();

    // Nettoyage : annule la requête en cours si le composant est
    // démonté ou si l'endpoint change avant la fin du fetch.
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}