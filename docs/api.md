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
Maakt een nieuwe sessie aan. Valideert de invoer met Zod. Genereert automatisch een ICS kalenderbestand en stuurt dit mee naar RabbitMQ.

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

**RabbitMQ Event**
- Exchange: `planning.topic`
- Routing Key: `planning.session.created`
- XML Payload bevat een `icsData` veld — een base64-geëncodeerd `.ics` kalenderbestand dat door andere services gebruikt kan worden om de sessie toe te voegen aan een kalender zoals Outlook.

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

### GET /api/sessions/:id/logs
Geeft alle wijzigingen van een sessie terug. Gesorteerd op datum (nieuwste eerst).

**Request**
- Geen body vereist

**Response 200**
```json
[
  {
    "logId": "a1f3e8b2-7c9d-4a21-b3e5-f8c2d1a4b7e9",
    "sessionId": "4e61b896-8ad9-4235-bbba-8ae31d91ba56",
    "oldStartTime": "2026-05-15 09:00:00",
    "newStartTime": "2026-05-15 10:00:00",
    "oldEndTime": "2026-05-15 10:30:00",
    "newEndTime": "2026-05-15 11:30:00",
    "reason": "Sessie gewijzigd via PUT",
    "changedAt": "2026-05-15T09:15:30.123Z",
    "changedBy": null
  },
  {
    "logId": "b2g4f9c3-8d0e-5b32-c4f6-g9d3e2b5c8f0",
    "sessionId": "4e61b896-8ad9-4235-bbba-8ae31d91ba56",
    "oldStartTime": "2026-05-15 09:00:00",
    "newStartTime": null,
    "oldEndTime": "2026-05-15 10:30:00",
    "newEndTime": null,
    "reason": "Sessie geannuleerd",
    "changedAt": "2026-05-15T10:45:00.000Z",
    "changedBy": null
  }
]
```

**Response 404** — sessie niet gevonden
```json
{ "error": "Sessie niet gevonden" }
```

**Opmerking:** Elke keer dat een sessie wordt gewijzigd (`PUT`), geannuleerd (`PATCH /cancel`) of verzet (`PATCH /reschedule`), wordt automatisch een log entry aangemaakt. Deze logs dienen als audittrail voor alle wijzigingen aan sessies.

---

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

---

## Locations

### GET /api/locations
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

### POST /api/speakers
Maakt een nieuwe spreker aan met Zod validatie. Stuurt automatisch `planning.user.created` event naar RabbitMQ exchange `user.topic`.

**Verplichte velden:** `firstName`, `lastName`, `email`

**Request Body**
```json
{
  "firstName": "Jan",
  "lastName": "Jansen",
  "email": "jan@example.com",
  "phoneNumber": "+31612345678",
  "company": "TechCorp"
}
```

**Validatie**
- `firstName`: verplicht, minimaal 1 karakter
- `lastName`: verplicht, minimaal 1 karakter
- `email`: verplicht, moet een geldig e-mailadres zijn, moet uniek zijn
- `phoneNumber`: optioneel
- `company`: optioneel

**Response 201**
```json
{
  "speakerId": "650e8400-e29b-41d4-a716-446655440000",
  "crmMasterId": null,
  "firstName": "Jan",
  "lastName": "Jansen",
  "email": "jan@example.com",
  "phoneNumber": "+31612345678",
  "company": "TechCorp",
  "isActive": true
}
```

**Response 400** - Validatiefout
```json
{ "error": { "fieldErrors": { "email": ["Ongeldig e-mailadres"] } } }
```

**Response 409** - Email duplicate
```json
{ "error": "E-mailadres is al in gebruik" }
```

**RabbitMQ Event**
- Exchange: `user.topic`
- Routing Key: `planning.user.created`
- XML Payload:
```xml
<PlanningUserCreated>
  <id>650e8400-e29b-41d4-a716-446655440000</id>
  <email>jan@example.com</email>
  <firstName>Jan</firstName>
  <lastName>Jansen</lastName>
  <role>SPEAKER</role>
  <isActive>true</isActive>
  <phoneNumber>+31612345678</phoneNumber>
  <company>TechCorp</company>
</PlanningUserCreated>
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

**RabbitMQ Event**
- Exchange: `user.topic`
- Routing Key: `planning.user.updated`
- XML Payload:
```xml
<PlanningUserUpdated>
  <id>650e8400-e29b-41d4-a716-446655440000</id>
  <email>jan.new@example.com</email>
  <firstName>Johannes</firstName>
  <lastName>Jansen</lastName>
  <role>SPEAKER</role>
  <isActive>true</isActive>
  <phoneNumber>+31612345678</phoneNumber>
  <company>NewCorp</company>
</PlanningUserUpdated>
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

**RabbitMQ Event**
- Exchange: `user.topic`
- Routing Key: `planning.user.deactivated`
- XML Payload:
```xml
<PlanningUserDeactivated>
  <id>650e8400-e29b-41d4-a716-446655440000</id>
  <email>jan@example.com</email>
  <deactivatedAt>2026-04-22T14:30:00.000Z</deactivatedAt>
</PlanningUserDeactivated>
```

---

## Users

### GET /api/users
Geeft alle users terug, gesorteerd op achternaam en voornaam.

**Request**
- Geen body vereist

**Response 200**
```json
[
  {
    "userId": "750e8400-e29b-41d4-a716-446655440000",
    "firstName": "Sara",
    "lastName": "Peeters",
    "email": "sara@example.com",
    "role": "EVENT_MANAGER",
    "company": "EventCorp",
    "isActive": true
  }
]
```

---

### GET /api/users/:id
Geeft één user terug op basis van het userId.

**Request**
- Geen body vereist

**Response 200**
```json
{
  "userId": "750e8400-e29b-41d4-a716-446655440000",
  "firstName": "Sara",
  "lastName": "Peeters",
  "email": "sara@example.com",
  "role": "EVENT_MANAGER",
  "company": "EventCorp",
  "isActive": true
}
```

**Response 404**
```json
{ "error": "User niet gevonden" }
```

---

### POST /api/users
Maakt een nieuwe user aan. Stuurt automatisch `planning.user.created` event naar RabbitMQ exchange `user.topic`.

**Verplichte velden:** `firstName`, `lastName`, `email`, `role`

**Request body**
```json
{
  "firstName": "Sara",
  "lastName": "Peeters",
  "email": "sara@example.com",
  "role": "EVENT_MANAGER",
  "company": "EventCorp"
}
```

**Validatieregels**
- `firstName`: verplicht
- `lastName`: verplicht
- `email`: verplicht
- `role`: verplicht, moet `EVENT_MANAGER` of `VISITOR` zijn
- `company`: optioneel

**Response 201**
```json
{
  "userId": "750e8400-e29b-41d4-a716-446655440000",
  "firstName": "Sara",
  "lastName": "Peeters",
  "email": "sara@example.com",
  "role": "EVENT_MANAGER",
  "company": "EventCorp",
  "isActive": true
}
```

**Response 400** — validatiefout
```json
{ "error": "Missing required fields" }
```

**Response 400** — email duplicate
```json
{ "error": "Email already exists" }
```

**RabbitMQ Event**
- Exchange: `user.topic`
- Routing Key: `planning.user.created`
- XML Payload:
```xml
<PlanningUserCreated>
  <id>750e8400-e29b-41d4-a716-446655440000</id>
  <email>sara@example.com</email>
  <firstName>Sara</firstName>
  <lastName>Peeters</lastName>
  <role>EVENT_MANAGER</role>
  <isActive>true</isActive>
  <company>EventCorp</company>
</PlanningUserCreated>
```

---

### PUT /api/users/:id
Wijzigt een bestaande user. Alle velden zijn optioneel.

**Request body**
```json
{
  "firstName": "Sara",
  "email": "sara.new@example.com",
  "role": "VISITOR"
}
```

**Validatieregels**
- `firstName`: optioneel, minimaal 1 karakter
- `lastName`: optioneel, minimaal 1 karakter
- `email`: optioneel, moet een geldig e-mailadres zijn
- `role`: optioneel, moet `EVENT_MANAGER` of `VISITOR` zijn
- `company`: optioneel

**Response 200**
```json
{
  "userId": "750e8400-e29b-41d4-a716-446655440000",
  "firstName": "Sara",
  "lastName": "Peeters",
  "email": "sara.new@example.com",
  "role": "VISITOR",
  "company": "EventCorp",
  "isActive": true
}
```

**Response 404**
```json
{ "error": "User niet gevonden" }
```

**Response 400** — validatiefout
```json
{ "error": { "fieldErrors": { "email": ["Ongeldig e-mailadres"] } } }
```

**RabbitMQ Event**
- Exchange: `user.topic`
- Routing Key: `planning.user.updated`
- XML Payload:
```xml
<PlanningUserUpdated>
  <id>750e8400-e29b-41d4-a716-446655440000</id>
  <email>sara.new@example.com</email>
  <firstName>Sara</firstName>
  <lastName>Peeters</lastName>
  <role>VISITOR</role>
  <company>EventCorp</company>
</PlanningUserUpdated>
```

---

### PATCH /api/users/:id/deactivate
Deactiveert een user (zet isActive op false).

**Request**
- Geen body vereist

**Response 200**
```json
{
  "message": "User gedeactiveerd",
  "user": {
    "userId": "750e8400-e29b-41d4-a716-446655440000",
    "firstName": "Sara",
    "lastName": "Peeters",
    "email": "sara@example.com",
    "role": "EVENT_MANAGER",
    "company": "EventCorp",
    "isActive": false
  }
}
```

**Response 404**
```json
{ "error": "User niet gevonden" }
```

**RabbitMQ Event**
- Exchange: `user.topic`
- Routing Key: `planning.user.deactivated`
- XML Payload:
```xml
<PlanningUserDeactivated>
  <id>750e8400-e29b-41d4-a716-446655440000</id>
  <email>sara@example.com</email>
  <deactivatedAt>2026-04-22T14:30:00.000Z</deactivatedAt>
</PlanningUserDeactivated>
```

---

## Session Speakers

### GET /api/sessions/:id/speakers
Geeft alle sprekers terug die gelinkt zijn aan een sessie.

**Request**
- Geen body vereist

**Response 200**
```json
[
  {
    "sessionSpeakerId": "uuid",
    "sessionId": "uuid",
    "speakerId": "uuid",
    "role": null,
    "confirmed": false,
    "firstName": "Jan",
    "lastName": "Jansen",
    "email": "jan@example.com",
    "company": "TechCorp"
  }
]
```

---

### POST /api/sessions/:id/speakers
Linkt een spreker aan een sessie.

**Verplichte velden:** `speakerId`

**Request body**
```json
{
  "speakerId": "uuid-van-spreker",
  "role": "hoofdspreker (optioneel)"
}
```

**Response 201**
```json
{
  "sessionSpeakerId": "uuid",
  "sessionId": "uuid",
  "speakerId": "uuid",
  "role": null,
  "confirmed": false
}
```

**Response 400** - Validatiefout
```json
{ "error": { "fieldErrors": { "speakerId": ["speakerId moet een geldig UUID zijn"] } } }
```

**Response 409** - Spreker al gelinkt
```json
{ "error": "Spreker is al gelinkt aan deze sessie" }
```

---

### DELETE /api/sessions/:id/speakers/:speakerId
Verwijdert de koppeling tussen een spreker en een sessie.

**Request**
- Geen body vereist

**Response 200**
```json
{ "message": "Spreker verwijderd van sessie" }
```

**Response 404**
```json
{ "error": "Koppeling niet gevonden" }
```