# ---------- Stage 1 : installation des dépendances ----------
FROM python:3.11-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# ---------- Stage 2 : image d'exécution ----------
FROM python:3.11-slim

# gosu : permet de démarrer en root le temps de corriger les permissions
# du dossier uploads monté, puis de basculer proprement vers un utilisateur
# non-root pour exécuter l'application.
RUN apt-get update && apt-get install -y --no-install-recommends gosu \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r appuser && useradd -r -g appuser -u 1000 appuser

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app
COPY app/ ./app
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p uploads

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]