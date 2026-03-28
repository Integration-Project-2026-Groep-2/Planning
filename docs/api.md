# API Documentatie — Planning Service

## Sessions
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

---

## Locations
(Adam vult dit in)

## Speakers
(Adam vult dit in)