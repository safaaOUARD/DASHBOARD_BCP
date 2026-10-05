# ---------- Stage 1 : build de l'application React ----------
FROM node:24-alpine AS build

WORKDIR /app

# Copier uniquement les fichiers de dépendances d'abord : si le code change
# mais pas package.json, Docker réutilise le cache et ne refait pas npm ci
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


# ---------- Stage 2 : image de production (Nginx) ----------
FROM nginx:1.30-alpine

# Config Nginx dédiée (reverse proxy /api + SPA React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Uniquement les fichiers statiques déjà buildés — pas de code source,
# pas de node_modules, pas d'outils Node dans l'image finale
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]