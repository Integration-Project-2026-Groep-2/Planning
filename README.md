# Planning Service

Microservice voor het beheren van sessies, locaties en sprekers.
Onderdeel van het Integratieproject 2026 — Groep 2.

## Vereisten

Installeer deze software voor je start:

- [Node.js](https://nodejs.org/) — versie 20 of hoger
- [PostgreSQL](https://www.postgresql.org/download/windows/) — versie 17
- [Git](https://git-scm.com/)

> **PostgreSQL installatie:** tijdens de installatie gebruik je `postgres` als wachtwoord en laat je poort op `5432` staan. Vink StackBuilder uit op het einde.
> 
> **PostgreSQL PATH:** na installatie moet je `C:\Program Files\PostgreSQL\17\bin` toevoegen aan je system environment variables.

## Installatie

### 1. Repository clonen
```bash
git clone https://github.com/Integration-Project-2026-Groep-2/Planning.git
cd Planning
```

### 2. Dependencies installeren
```bash
npm install
```

### 3. Environment variabelen instellen
Maak een `.env` bestand aan in de root van het project:
```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=planning_db
DB_USER=postgres
DB_PASSWORD=postgres
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

### 4. Database aanmaken
```bash
psql -U postgres
```
```sql
CREATE DATABASE planning_db;
\q
```

### 5. Server starten
```bash
npm run dev
```

De server draait op `http://localhost:3000`

## Controleren of alles werkt

Ga naar `http://localhost:3000/health` in je browser.
Je zou dit moeten zien:
```json
{"status":"ok","service":"planning"}
```

## Scripts

| Script | Beschrijving |
|--------|-------------|
| `npm run dev` | Start de server lokaal met automatisch herstarten |
| `npm run build` | Compileert TypeScript naar JavaScript |
| `npm start` | Start de gecompileerde versie |

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
- `feature/xxx` — maak een eigen branch per taak, pull request naar dev als klaar