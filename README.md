# Planning Service

Microservice voor het beheren van sessies, locaties en sprekers.
Onderdeel van het Integratieproject 2026 — Groep 2.

## Vereisten

Installeer deze software voor je start:

- [Node.js](https://nodejs.org/) — versie 24.14.1 (LTS)
- [PostgreSQL](https://www.postgresql.org/download/windows/) — versie 17.9
- [RabbitMQ](https://www.rabbitmq.com/docs/install-windows) — installeer eerst Erlang via erlang.org/downloads
- [Git](https://git-scm.com/)

> **PostgreSQL installatie:** tijdens de installatie gebruik je een wachtwoord — zie document **Credentials & Environment** op ClickUp. Laat de poort op `5432` staan en vink StackBuilder uit op het einde.

> **PostgreSQL PATH (Windows):** na installatie voeg je `C:\Program Files\PostgreSQL\17\bin` toe aan je system environment variables.

## Installatie

### 1. Repository clonen
```bash
git clone https://github.com/Integration-Project-2026-Groep-2/Planning.git
cd Planning
git checkout dev
```

### 2. Dependencies installeren
```bash
npm install
```

### 3. Environment variabelen instellen
Maak een `.env` bestand aan in de root — zie document **Credentials & Environment** op ClickUp.

### 4. Database aanmaken
```bash
psql -U postgres
CREATE DATABASE planning_db;
\q
```

> Voor het wachtwoord bij `psql -U postgres` — zie document **Credentials & Environment** op ClickUp.

### 5. Server starten
```bash
npm run dev
```

De server draait op `http://localhost:3000`

## Controleren of alles werkt

Ga naar `http://localhost:3000/health` — je zou dit moeten zien:
```json
{"status":"ok","service":"planning"}
```

## Poorten

| Service | Poort | Beschrijving |
|---------|-------|-------------|
| Planning Service | 3000 | REST endpoints |
| PostgreSQL | 5432 | Database — intern |
| RabbitMQ | 5672 | Messaging — intern |
| RabbitMQ Management | 15672 | Dashboard lokaal |

## Scripts

| Script | Beschrijving |
|--------|-------------|
| `npm run dev` | Start lokaal met automatisch herstarten |
| `npm run build` | Compileert TypeScript |
| `npm start` | Start gecompileerde versie |

## Mapstructuur
```
src/
├── consumers/    — RabbitMQ consumers (berichten ontvangen)
├── producers/    — RabbitMQ producers (berichten versturen)
├── routes/       — REST API endpoints
├── services/     — Business logica
├── models/       — TypeScript interfaces
└── utils/        — Hulpfuncties
```

## Branches

- `main` — productie, nooit rechtstreeks pushen
- `dev` — werkbranch, alle features worden hierin gemerged
- `feature/xxx` — eigen branch per taak, pull request naar dev als klaar
