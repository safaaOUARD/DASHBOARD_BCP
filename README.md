# Dashboard BCP — Déploiement production

Application de suivi des engagements bancaires (React + FastAPI + PostgreSQL),
livrée sous forme de conteneurs Docker prêts à l'emploi.

## Architecture
Navigateur → Nginx (port 80, seul port exposé)
├── / (fichiers React statiques)
└── /api/* → reverse proxy → FastAPI (réseau interne, port 8000)
└── PostgreSQL (réseau interne, port 5432)
PostgreSQL et FastAPI ne sont accessibles depuis aucun autre réseau que celui
créé par Docker Compose. Seul Nginx est joignable depuis l'extérieur.

## Prérequis

- Docker Engine 24+ ou Docker Desktop, avec le plugin Docker Compose (v2)
- Aucune installation de Python, Node.js ou dépendance applicative n'est nécessaire :
  tout est construit à l'intérieur des images.

## Installation (premier déploiement)

1. Récupérer le projet (clone Git ou archive fournie) sur le serveur cible.

2. Créer le fichier de configuration réel à partir du modèle :

```bash
   cp .env.example .env
```

3. Éditer `.env` et renseigner de vraies valeurs (ne jamais garder les valeurs
   "changeme_..." fournies en exemple) :

   | Variable | Description |
   |---|---|
   | `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Identifiants PostgreSQL (créés automatiquement au 1er démarrage) |
   | `JWT_SECRET_KEY` | Clé secrète des tokens d'authentification. Générer avec `openssl rand -hex 32` |
   | `JWT_EXPIRE_MINUTES` | Durée de validité d'une session (en minutes) |
   | `DEFAULT_PAGE_SIZE` / `MAX_PAGE_SIZE` | Pagination du tableau des engagements |

4. Construire les images et démarrer l'application :

```bash
   docker compose up -d --build
```

5. Vérifier que tout tourne :

```bash
   docker compose ps
```

   Les 3 services (`dashboard-bcp-db`, `dashboard-bcp-api`, `dashboard-bcp-web`)
   doivent être `running` (ou `healthy` pour la base).

6. Ouvrir `http://<adresse-du-serveur>/` dans un navigateur.

### Initialisation de la base de données

Au tout premier démarrage, PostgreSQL est vide et exécute automatiquement
`backend/sql/schema.sql` (monté dans `/docker-entrypoint-initdb.d`). Ce fichier
contient la structure **exacte et complète** de la base — tables, colonnes,
contraintes, index — telle qu'elle a été validée en environnement de
développement. Il ne s'agit pas d'un document de référence approximatif : c'est
un export généré directement depuis la base réelle (`pg_dump --schema-only`),
donc fiable à 100 % pour recréer la structure sans aucune donnée.

Les démarrages suivants n'exécutent jamais ce fichier à nouveau (PostgreSQL ne
relance `docker-entrypoint-initdb.d` que sur un volume de données vide).

⚠️ **Pour les développeurs** : si de nouvelles migrations SQL sont appliquées
manuellement en local après cette livraison, `schema.sql` doit être régénéré
avant toute nouvelle livraison à l'IT, avec :

```bash
pg_dump -U <utilisateur> -d <base> --schema-only --no-owner --no-privileges -f backend/sql/schema.sql
```

## Mise à jour de l'application

```bash
git pull                          # ou : déposer la nouvelle version des fichiers
docker compose up -d --build
```

Les données PostgreSQL (volume `postgres_data`) et les fichiers déjà importés
(`backend/uploads/`) **ne sont jamais affectés** par une mise à jour : ils
survivent à la reconstruction des images, à un redémarrage des conteneurs, ou
même à un `docker compose down` (sans l'option `-v`).

## Dépôt manuel de fichiers dans `uploads/`

`backend/uploads/` est directement relié au dossier `backend/uploads/` sur le
serveur (bind mount). Tout fichier déposé manuellement dans ce dossier est
immédiatement visible par l'application, sans redémarrage.

## Arrêt / redémarrage

```bash
docker compose stop           # arrêt sans supprimer les conteneurs
docker compose start          # redémarrage
docker compose restart        # redémarrage rapide
docker compose down           # arrêt + suppression des conteneurs (les volumes/données restent)
```

⚠️ Ne jamais utiliser `docker compose down -v` en production : l'option `-v`
supprime aussi le volume `postgres_data`, donc **toutes les données de la base**.

## Sauvegarde

- **Base de données** :
```bash
  docker compose exec postgres pg_dump -U <DB_USER> <DB_NAME> > backup_$(date +%F).sql
```
- **Fichiers importés** : sauvegarder directement le dossier `backend/uploads/`
  sur le serveur (copie/rsync classique, pas de commande Docker nécessaire).

## Logs

```bash
docker compose logs -f              # tous les services
docker compose logs -f backend      # un seul service
```

## Dépannage rapide

| Symptôme | Piste |
|---|---|
| `dashboard-bcp-db` reste `unhealthy` | Vérifier `DB_USER`/`DB_PASSWORD`/`DB_NAME` dans `.env` |
| Erreur 502 sur les appels `/api/*` | `docker compose logs backend` — souvent une variable d'environnement manquante |
| Page blanche à l'ouverture | `docker compose logs frontend` — vérifier que le build React n'a pas échoué |
| Écriture impossible dans `uploads/` | Vérifier les permissions du dossier `backend/uploads/` côté serveur (le conteneur corrige automatiquement au démarrage, mais un montage réseau restrictif peut bloquer) |"# DASHBOARD_BCP" 
