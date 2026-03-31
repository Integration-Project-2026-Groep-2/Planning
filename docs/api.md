# API Documentatie — Planning Service

## Sessions

### GET /api/sessions
Geeft een lijst van alle sessies terug, gesorteerd op datum en starttijd.

**Request**
- Geen body vereist

**Response 200**
```json
[
  {
    "sessionId": "4e61b896-8ad9-4235-bbba-8ae31d91ba56",
    "title": "Workshop TypeScript",
    "description": "Introductie tot TypeScript",
    "date": "2026-05-15T00:00:00.000Z",
    "startTime": "09:00:00",
    "endTime": "10:30:00",
    "status": "concept",
    "locationId": null,
    "capacity": 30,
    "syncStatus": "pending",
    "outlookEventId": null
  }
]
```

---

### GET /api/sessions/:id
Geeft één sessie terug op basis van het sessionId.

**Request**
- Geen body vereist

**Response 200**
```json
{
  "sessionId": "4e61b896-8ad9-4235-bbba-8ae31d91ba56",
  "title": "Workshop TypeScript",
  "description": "Introductie tot TypeScript",
  "date": "2026-05-15T00:00:00.000Z",
  "startTime": "09:00:00",
  "endTime": "10:30:00",
  "status": "concept",
  "locationId": null,
  "capacity": 30,
  "syncStatus": "pending",
  "outlookEventId": null
}
```

**Response 404**
```json
{ "error": "Sessie niet gevonden" }
```

---

### POST /api/sessions
Maakt een nieuwe sessie aan. Valideert de invoer met Zod.

**Verplichte velden:** `title`, `date`, `startTime`, `endTime`, `capacity`

**Request body**
```json
{
  "title": "Workshop TypeScript",
  "description": "Introductie tot TypeScript",
  "date": "2026-05-15",
  "startTime": "09:00",
  "endTime": "10:30",
  "capacity": 30,
  "locationId": "optioneel-uuid-van-locatie",
  "status": "concept"
}
```

**Validatieregels**
- `title` — verplicht, niet leeg
- `date` — verplicht
- `startTime` — verplicht
- `endTime` — verplicht, moet na `startTime` liggen
- `capacity` — verplicht, moet groter zijn dan 0
- `locationId` — optioneel, moet een geldig UUID zijn

**Response 201**
```json
{
  "sessionId": "4e61b896-8ad9-4235-bbba-8ae31d91ba56",
  "title": "Workshop TypeScript",
  "status": "concept",
  "syncStatus": "pending"
}
```

**Response 400** — validatiefout
```json
{ "error": { "fieldErrors": { "endTime": ["Eindtijd moet na starttijd liggen"] } } }
```

**Response 409** — locatieconflict
```json
{ "error": "Locatie is al bezet op dit tijdslot" }
```

---

### PUT /api/sessions/:id
Wijzigt een bestaande sessie. Alle velden zijn optioneel.

**Request body**
```json
{
  "title": "Workshop TypeScript — gevorderd",
  "capacity": 25
}
```

**Response 200**
```json
{
  "sessionId": "4e61b896-8ad9-4235-bbba-8ae31d91ba56",
  "title": "Workshop TypeScript — gevorderd",
  "capacity": 25
}
```

**Response 404**
```json
{ "error": "Sessie niet gevonden" }
```

**Response 409** — locatieconflict
```json
{ "error": "Locatie is al bezet op dit tijdslot" }
```

---

### DELETE /api/sessions/:id
Verwijdert een sessie permanent.

**Request**
- Geen body vereist

**Response 200**
```json
{ "message": "Sessie verwijderd", "session": { "sessionId": "..." } }
```

**Response 404**
```json
{ "error": "Sessie niet gevonden" }
```

---

### PATCH /api/sessions/:id/cancel
Annuleert een sessie — zet de status op `geannuleerd`.

**Request**
- Geen body vereist

**Response 200**
```json
{ "message": "Sessie geannuleerd", "session": { "sessionId": "...", "status": "geannuleerd" } }
```

**Response 404**
```json
{ "error": "Sessie niet gevonden" }
```

---

### PATCH /api/sessions/:id/reschedule
Verzet een sessie naar een nieuw tijdstip. Slaat de wijziging op in de SessionChangeLog.

**Request body**
```json
{
  "date": "2026-05-20",
  "startTime": "11:00",
  "endTime": "12:30",
  "reason": "Spreker heeft vertraging"
}
```

**Validatieregels**
- Alle velden zijn verplicht
- `endTime` moet na `startTime` liggen
- `reason` mag niet leeg zijn

**Response 200**
```json
{ "message": "Sessie verzet", "session": { "sessionId": "...", "date": "2026-05-20" } }
```

**Response 404**
```json
{ "error": "Sessie niet gevonden" }
```

**Response 409** — locatieconflict
```json
{ "error": "Locatie is al bezet op dit tijdslot" }


```
## Registraties

### POST /api/sessions/:id/register
Schrijft een deelnemer in voor een sessie. Controleert capaciteit automatisch.

**Verplichte velden:** `participantId`

**Request body**
```json
{
  "participantId": "uuid-van-deelnemer",
  "crmMasterId": "uuid-van-crm-master (optioneel)"
}
```

**Validatieregels**
- `participantId` — verplicht, moet een geldig UUID zijn
- `crmMasterId` — optioneel, moet een geldig UUID zijn

**Response 201**
```json
{
  "registrationId": "uuid",
  "sessionId": "uuid",
  "participantId": "uuid",
  "crmMasterId": null,
  "registrationTime": "2026-05-15T09:00:00.000Z"
}
```

**Response 400** — sessie geannuleerd
```json
{ "error": "Sessie is geannuleerd" }
```

**Response 404** — sessie niet gevonden
```json
{ "error": "Sessie niet gevonden" }
```

**Response 409** — al ingeschreven
```json
{ "error": "Deelnemer is al ingeschreven voor deze sessie" }
```

**Response 409** — sessie volzet
```json
{ "error": "Sessie is volzet" }
```

**RabbitMQ events**
- `planning.participant.registered` — altijd verstuurd bij succesvolle inschrijving
- `planning.session.full` — verstuurd wanneer sessie volzet is, status wordt automatisch `volzet`

---

### DELETE /api/sessions/:id/register
Annuleert de inschrijving van een deelnemer. Als de sessie volzet was, wordt de status teruggezet op `actief`.

**Verplichte velden:** `participantId`

**Request body**
```json
{
  "participantId": "uuid-van-deelnemer"
}
```

**Response 200**
```json
{
  "message": "Inschrijving geannuleerd",
  "registration": {
    "registrationId": "uuid",
    "sessionId": "uuid",
    "participantId": "uuid"
  }
}
```

**Response 404**
```json
{ "error": "Inschrijving niet gevonden" }
```


## Locations

dir src\producers### GET /api/locations
Geeft alle locaties terug, gesorteerd op roomName.

**Request**
- Geen body vereist

**Response 200**
```json
[
  {
    "locationId": "550e8400-e29b-41d4-a716-446655440000",
    "roomName": "Zaal A",
    "address": "Straat 123",
    "capacity": 50,
    "status": "beschikbaar"
  },
  {
    "locationId": "550e8400-e29b-41d4-a716-446655440001",
    "roomName": "Zaal B",
    "address": "Straat 124",
    "capacity": 75,
    "status": "gereserveerd"
  }
]
```

---

### GET /api/locations/:id
Geeft één locatie terug op basis van het locationId.

**Request**
- Geen body vereist

**Response 200**
```json
{
  "locationId": "550e8400-e29b-41d4-a716-446655440000",
  "roomName": "Zaal A",
  "address": "Straat 123",
  "capacity": 50,
  "status": "beschikbaar"
}
```

**Response 404**
```json
{ "error": "Locatie niet gevonden" }
```

---

### POST /api/locations
Maakt een nieuwe locatie aan.

**Verplichte velden:** `roomName`, `capacity`

**Request Body**
```json
{
  "roomName": "Zaal A",
  "address": "Straat 123",
  "capacity": 50,
  "status": "beschikbaar"
}
```

**Validatie**
- `roomName`: verplicht, minimaal 1 karakter
- `address`: optioneel
- `capacity`: verplicht, groter dan 0
- `status`: optioneel, moet een van: `beschikbaar`, `gereserveerd`, `niet beschikbaar`

**Response 201**
```json
{
  "locationId": "550e8400-e29b-41d4-a716-446655440000",
  "roomName": "Zaal A",
  "address": "Straat 123",
  "capacity": 50,
  "status": "beschikbaar"
}
```

**Response 400** - Validatiefout
```json
{ "error": { "fieldErrors": { "capacity": ["Capaciteit moet groter zijn dan 0"] } } }
```

---

### PUT /api/locations/:id
Wijzigt een bestaande locatie. Alle velden zijn optioneel.

**Request Body**
```json
{
  "roomName": "Zaal B",
  "capacity": 75,
  "status": "gereserveerd"
}
```

**Response 200**
```json
{
  "locationId": "550e8400-e29b-41d4-a716-446655440000",
  "roomName": "Zaal B",
  "address": "Straat 123",
  "capacity": 75,
  "status": "gereserveerd"
}
```

**Response 404**
```json
{ "error": "Locatie niet gevonden" }
```

**Response 400** - Validatiefout

---

### DELETE /api/locations/:id
Verwijdert een locatie permanent.

**Request**
- Geen body vereist

**Response 200**
```json
{
  "message": "Locatie verwijderd",
  "location": {
    "locationId": "550e8400-e29b-41d4-a716-446655440000",
    "roomName": "Zaal A",
    "address": "Straat 123",
    "capacity": 50,
    "status": "beschikbaar"
  }
}
```

**Response 404**
```json
{ "error": "Locatie niet gevonden" }
```

---

## Speakers

### GET /api/speakers
Geeft alle sprekers terug, gesorteerd op achternaam en voornaam.

**Request**
- Geen body vereist

**Response 200**
```json
[
  {
    "speakerId": "650e8400-e29b-41d4-a716-446655440000",
    "crmMasterId": "CRM123",
    "firstName": "Jan",
    "lastName": "Jansen",
    "email": "jan@example.com",
    "phoneNumber": "+31612345678",
    "company": "TechCorp",
    "isActive": true
  }
]
```

---

### GET /api/speakers/:id
Geeft één spreker terug op basis van het speakerId.

**Request**
- Geen body vereist

**Response 200**
```json
{
  "speakerId": "650e8400-e29b-41d4-a716-446655440000",
  "crmMasterId": "CRM123",
  "firstName": "Jan",
  "lastName": "Jansen",
  "email": "jan@example.com",
  "phoneNumber": "+31612345678",
  "company": "TechCorp",
  "isActive": true
}
```

**Response 404**
```json
{ "error": "Spreker niet gevonden" }
```

---

### PUT /api/speakers/:id
Wijzigt een bestaande spreker. Alle velden zijn optioneel.

**Request Body**
```json
{
  "firstName": "Johannes",
  "email": "jan.new@example.com",
  "company": "NewCorp"
}
```

**Validatie**
- `firstName`: optioneel, minimaal 1 karakter
- `lastName`: optioneel, minimaal 1 karakter
- `email`: optioneel, moet een geldig e-mailadres zijn
- `phoneNumber`: optioneel
- `company`: optioneel

**Response 200**
```json
{
  "speakerId": "650e8400-e29b-41d4-a716-446655440000",
  "crmMasterId": "CRM123",
  "firstName": "Johannes",
  "lastName": "Jansen",
  "email": "jan.new@example.com",
  "phoneNumber": "+31612345678",
  "company": "NewCorp",
  "isActive": true
}
```

**Response 404**
```json
{ "error": "Spreker niet gevonden" }
```

**Response 400** - Validatiefout
```json
{ "error": { "fieldErrors": { "email": ["Ongeldig e-mailadres"] } } }
```

---

### PATCH /api/speakers/:id/deactivate
Deactiveert een spreker (zet isActive op false).

**Request**
- Geen body vereist

**Response 200**
```json
{
  "message": "Spreker gedeactiveerd",
  "speaker": {
    "speakerId": "650e8400-e29b-41d4-a716-446655440000",
    "crmMasterId": "CRM123",
    "firstName": "Jan",
    "lastName": "Jansen",
    "email": "jan@example.com",
    "phoneNumber": "+31612345678",
    "company": "TechCorp",
    "isActive": false
  }
}
```

**Response 404**
```json
{ "error": "Spreker niet gevonden" }
```