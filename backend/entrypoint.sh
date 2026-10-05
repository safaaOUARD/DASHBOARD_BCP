#!/bin/sh
set -e

# uploads/ est un bind mount depuis l'hôte : son propriétaire dépend de qui
# l'a créé côté serveur (souvent root si Docker l'a créé automatiquement).
# On force la propriété à CHAQUE démarrage pour que l'appli (utilisateur
# non-root) puisse toujours y écrire — aucune intervention manuelle de l'IT.
mkdir -p /app/uploads
chown -R appuser:appuser /app/uploads

exec gosu appuser "$@"