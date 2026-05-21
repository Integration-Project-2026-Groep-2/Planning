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

Geeft één sessie terug op basis van het `sessionId`.

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

Maakt een nieuwe sessie aan. De invoer wordt gevalideerd met Zod. Na het aanmaken wordt automatisch een RabbitMQ-event gepubliceerd naar `planning.topic`.

Daarnaast wordt er een ICS-kalenderbestand gegenereerd en als base64-string meegestuurd in het veld `icsData`.

**Verplichte velden**
- `title`
- `date`
- `startTime`
- `endTime`
- `capacity`

**Request body**
```json
{
  "title": "Workshop TypeScript",
  "description": "Introductie tot TypeScript",
  "date": "2026-05-15",
  "startTime": "09:00",
  "endTime": "10:30",
  "capacity": 30,
  "locationId": "550e8400-e29b-41d4-a716-446655440000",
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
- `status` — optioneel, standaard `concept`

**Response 201**
```json
{
  "sessionId": "4e61b896-8ad9-4235-bbba-8ae31d91ba56",
  "title": "Workshop TypeScript",
  "status": "concept",
  "syncStatus": "pending"
}
```

**Response 400 — validatiefout**
```json
{
  "error": {
    "fieldErrors": {
      "endTime": ["Eindtijd moet na starttijd liggen"]
    }
  }
}
```

**Response 409 — locatieconflict**
```json
{ "error": "Locatie is al bezet op dit tijdslot" }
```

**RabbitMQ Event**
- Exchange: `planning.topic`
- Routing key: `planning.session.created`
- Root element: `SessionCreated`

**XML payload bevat**
- `sessionId`
- `title`
- `date`
- `startTime`
- `endTime`
- `location`
- `locationId`
- `status`
- `capacity`
- `icsData`
- `timestamp`

---

### PUT /api/sessions/:id

Wijzigt een bestaande sessie. Alle velden zijn optioneel. Bij een succesvolle wijziging wordt een RabbitMQ-event gepubliceerd.

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

**Response 409 — locatieconflict**
```json
{ "error": "Locatie is al bezet op dit tijdslot" }
```

**RabbitMQ Event**
- Exchange: `planning.topic`
- Routing key: `planning.session.updated`
- Root element: `SessionUpdated`

---

### DELETE /api/sessions/:id

Verwijdert een sessie permanent.

**Request**
- Geen body vereist

**Response 200**
```json
{
  "message": "Sessie verwijderd",
  "session": {
    "sessionId": "4e61b896-8ad9-4235-bbba-8ae31d91ba56"
  }
}
```

**Response 404**
```json
{ "error": "Sessie niet gevonden" }
```

---

### PATCH /api/sessions/:id/cancel

Annuleert een sessie en zet de status op `cancelled`.

**Request**
- Geen body vereist

**Response 200**
```json
{
  "message": "Sessie geannuleerd",
  "session": {
    "sessionId": "4e61b896-8ad9-4235-bbba-8ae31d91ba56",
    "status": "cancelled"
  }
}
```

**Response 404**
```json
{ "error": "Sessie niet gevonden" }
```

**RabbitMQ Event**
- Exchange: `planning.topic`
- Routing key: `planning.session.cancelled`
- Root element: `SessionCancelled`

---

### PATCH /api/sessions/:id/reschedule

Verzet een sessie naar een nieuw tijdstip. De wijziging wordt opgeslagen in `SessionChangeLog`.

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
- `date` — verplicht
- `startTime` — verplicht
- `endTime` — verplicht, moet na `startTime` liggen
- `reason` — verplicht, mag niet leeg zijn

**Response 200**
```json
{
  "message": "Sessie verzet",
  "session": {
    "sessionId": "4e61b896-8ad9-4235-bbba-8ae31d91ba56",
    "date": "2026-05-20"
  }
}
```

**Response 404**
```json
{ "error": "Sessie niet gevonden" }
```

**Response 409 — locatieconflict**
```json
{ "error": "Locatie is al bezet op dit tijdslot" }
```

**RabbitMQ Event**
- Exchange: `planning.topic`
- Routing key: `planning.session.rescheduled`
- Root element: `SessionRescheduled`

---

### GET /api/sessions/:id/logs

Geeft alle wijzigingen van een sessie terug, gesorteerd op datum, nieuwste eerst.

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
  }
]
```

**Response 404**
```json
{ "error": "Sessie niet gevonden" }
```

**Opmerking**

Elke keer dat een sessie wordt gewijzigd, geannuleerd of verzet, wordt automatisch een log entry aangemaakt. Deze logs dienen als audittrail.

---

## Registraties

### POST /api/sessions/:id/register

Schrijft een deelnemer in voor een sessie. De capaciteit wordt automatisch gecontroleerd.

**Verplichte velden**
- `participantId`

**Request body**
```json
{
  "participantId": "850e8400-e29b-41d4-a716-446655440000",
  "crmMasterId": "950e8400-e29b-41d4-a716-446655440000"
}
```

**Validatieregels**
- `participantId` — verplicht, moet een geldig UUID zijn
- `crmMasterId` — optioneel, moet een geldig UUID zijn

**Response 201**
```json
{
  "registrationId": "a50e8400-e29b-41d4-a716-446655440000",
  "sessionId": "4e61b896-8ad9-4235-bbba-8ae31d91ba56",
  "participantId": "850e8400-e29b-41d4-a716-446655440000",
  "crmMasterId": "950e8400-e29b-41d4-a716-446655440000",
  "registrationTime": "2026-05-15T09:00:00.000Z"
}
```

**Response 400 — sessie geannuleerd**
```json
{ "error": "Sessie is geannuleerd" }
```

**Response 404 — sessie niet gevonden**
```json
{ "error": "Sessie niet gevonden" }
```

**Response 409 — al ingeschreven**
```json
{ "error": "Deelnemer is al ingeschreven voor deze sessie" }
```

**Response 409 — sessie volzet**
```json
{ "error": "Sessie is volzet" }
```

**RabbitMQ events**
- Exchange: `planning.topic`
- Routing key: `planning.participant.registered`
- Root element: `ParticipantRegistered`

Wanneer de sessie volzet raakt:
- Exchange: `planning.topic`
- Routing key: `planning.session.full`
- Root element: `SessionFull`

---

### DELETE /api/sessions/:id/register

Annuleert de inschrijving van een deelnemer. Als de sessie de status `full` had, kan de status opnieuw aangepast worden.

**Verplichte velden**
- `participantId`

**Request body**
```json
{
  "participantId": "850e8400-e29b-41d4-a716-446655440000"
}
```

**Response 200**
```json
{
  "message": "Inschrijving geannuleerd",
  "registration": {
    "registrationId": "a50e8400-e29b-41d4-a716-446655440000",
    "sessionId": "4e61b896-8ad9-4235-bbba-8ae31d91ba56",
    "participantId": "850e8400-e29b-41d4-a716-446655440000"
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

Geeft alle locaties terug, gesorteerd op `roomName`.

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
    "status": "active"
  },
  {
    "locationId": "550e8400-e29b-41d4-a716-446655440001",
    "roomName": "Zaal B",
    "address": "Straat 124",
    "capacity": 75,
    "status": "inactive"
  }
]
```

---

### GET /api/locations/:id

Geeft één locatie terug op basis van het `locationId`.

**Request**
- Geen body vereist

**Response 200**
```json
{
  "locationId": "550e8400-e29b-41d4-a716-446655440000",
  "roomName": "Zaal A",
  "address": "Straat 123",
  "capacity": 50,
  "status": "active"
}
```

**Response 404**
```json
{ "error": "Locatie niet gevonden" }
```

---

### POST /api/locations

Maakt een nieuwe locatie aan. Na creatie wordt een event gepubliceerd naar `planning.topic`.

**Verplichte velden**
- `roomName`
- `capacity`

**Request body**
```json
{
  "roomName": "Zaal A",
  "address": "Straat 123",
  "capacity": 50,
  "status": "active"
}
```

**Validatie**
- `roomName` — verplicht, minimaal 1 karakter
- `address` — optioneel
- `capacity` — verplicht, groter dan 0
- `status` — optioneel

**Response 201**
```json
{
  "locationId": "550e8400-e29b-41d4-a716-446655440000",
  "roomName": "Zaal A",
  "address": "Straat 123",
  "capacity": 50,
  "status": "active"
}
```

**Response 400 — validatiefout**
```json
{
  "error": {
    "fieldErrors": {
      "capacity": ["Capaciteit moet groter zijn dan 0"]
    }
  }
}
```

**RabbitMQ Event**
- Exchange: `planning.topic`
- Routing key: `planning.location.created`
- Root element: `LocationCreated`

---

### PUT /api/locations/:id

Wijzigt een bestaande locatie. Alle velden zijn optioneel.

**Request body**
```json
{
  "roomName": "Zaal B",
  "capacity": 75,
  "status": "inactive"
}
```

**Response 200**
```json
{
  "locationId": "550e8400-e29b-41d4-a716-446655440000",
  "roomName": "Zaal B",
  "address": "Straat 123",
  "capacity": 75,
  "status": "inactive"
}
```

**Response 400 — validatiefout**
```json
{
  "error": {
    "fieldErrors": {
      "capacity": ["Capaciteit moet groter zijn dan 0"]
    }
  }
}
```

**Response 404**
```json
{ "error": "Locatie niet gevonden" }
```

**RabbitMQ Event**
- Exchange: `planning.topic`
- Routing key: `planning.location.updated`
- Root element: `LocationUpdated`

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
    "status": "active"
  }
}
```

**Response 404**
```json
{ "error": "Locatie niet gevonden" }
```

**RabbitMQ Event**
- Exchange: `planning.topic`
- Routing key: `planning.location.deleted`
- Root element: `LocationDeleted`

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
    "crmMasterId": "950e8400-e29b-41d4-a716-446655440000",
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

Geeft één spreker terug op basis van het `speakerId`.

**Request**
- Geen body vereist

**Response 200**
```json
{
  "speakerId": "650e8400-e29b-41d4-a716-446655440000",
  "crmMasterId": "950e8400-e29b-41d4-a716-446655440000",
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

Maakt een nieuwe spreker aan met Zod-validatie. Na creatie worden events gepubliceerd voor Frontend en CRM.

**Verplichte velden**
- `firstName`
- `lastName`
- `email`

**Request body**
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
- `firstName` — verplicht, minimaal 1 karakter
- `lastName` — verplicht, minimaal 1 karakter
- `email` — verplicht, moet een geldig e-mailadres zijn en uniek zijn
- `phoneNumber` — optioneel
- `company` — optioneel

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

**Response 400 — validatiefout**
```json
{
  "error": {
    "fieldErrors": {
      "email": ["Ongeldig e-mailadres"]
    }
  }
}
```

**Response 409 — email duplicate**
```json
{ "error": "E-mailadres is al in gebruik" }
```

**RabbitMQ Events**
- Exchange: `planning.topic`
- Routing key: `planning.speaker.created`
- Root element: `SpeakerCreated`

- Exchange: `user.topic`
- Routing key: `planning.user.created`
- Root element: `PlanningUserCreated`

---

### PUT /api/speakers/:id

Wijzigt een bestaande spreker. Alle velden zijn optioneel.

**Request body**
```json
{
  "firstName": "Johannes",
  "email": "jan.new@example.com",
  "company": "NewCorp"
}
```

**Validatie**
- `firstName` — optioneel, minimaal 1 karakter
- `lastName` — optioneel, minimaal 1 karakter
- `email` — optioneel, moet een geldig e-mailadres zijn
- `phoneNumber` — optioneel
- `company` — optioneel

**Response 200**
```json
{
  "speakerId": "650e8400-e29b-41d4-a716-446655440000",
  "crmMasterId": "950e8400-e29b-41d4-a716-446655440000",
  "firstName": "Johannes",
  "lastName": "Jansen",
  "email": "jan.new@example.com",
  "phoneNumber": "+31612345678",
  "company": "NewCorp",
  "isActive": true
}
```

**Response 400 — validatiefout**
```json
{
  "error": {
    "fieldErrors": {
      "email": ["Ongeldig e-mailadres"]
    }
  }
}
```

**Response 404**
```json
{ "error": "Spreker niet gevonden" }
```

**RabbitMQ Events**
- Exchange: `planning.topic`
- Routing key: `planning.speaker.updated`
- Root element: `SpeakerUpdated`

- Exchange: `user.topic`
- Routing key: `planning.user.updated`
- Root element: `PlanningUserUpdated`

---

### PATCH /api/speakers/:id/deactivate

Deactiveert een spreker door `isActive` op `false` te zetten.

**Request**
- Geen body vereist

**Response 200**
```json
{
  "message": "Spreker gedeactiveerd",
  "speaker": {
    "speakerId": "650e8400-e29b-41d4-a716-446655440000",
    "crmMasterId": "950e8400-e29b-41d4-a716-446655440000",
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

**RabbitMQ Events**
- Exchange: `planning.topic`
- Routing key: `planning.speaker.deactivated`
- Root element: `SpeakerDeactivated`

- Exchange: `user.topic`
- Routing key: `planning.user.deactivated`
- Root element: `PlanningUserDeactivated`

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

Geeft één user terug op basis van het `userId`.

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

Maakt een nieuwe user aan. Na creatie wordt een event gepubliceerd naar CRM.

**Verplichte velden**
- `firstName`
- `lastName`
- `email`
- `role`

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
- `firstName` — verplicht
- `lastName` — verplicht
- `email` — verplicht, moet uniek zijn
- `role` — verplicht, bijvoorbeeld `EVENT_MANAGER` of `VISITOR`
- `company` — optioneel

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

**Response 400 — validatiefout**
```json
{ "error": "Missing required fields" }
```

**Response 400 — email duplicate**
```json
{ "error": "Email already exists" }
```

**RabbitMQ Event**
- Exchange: `user.topic`
- Routing key: `planning.user.created`
- Root element: `PlanningUserCreated`

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
- `firstName` — optioneel, minimaal 1 karakter
- `lastName` — optioneel, minimaal 1 karakter
- `email` — optioneel, moet een geldig e-mailadres zijn
- `role` — optioneel, bijvoorbeeld `EVENT_MANAGER` of `VISITOR`
- `company` — optioneel

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

**Response 400 — validatiefout**
```json
{
  "error": {
    "fieldErrors": {
      "email": ["Ongeldig e-mailadres"]
    }
  }
}
```

**Response 404**
```json
{ "error": "User niet gevonden" }
```

**RabbitMQ Event**
- Exchange: `user.topic`
- Routing key: `planning.user.updated`
- Root element: `PlanningUserUpdated`

---

### PATCH /api/users/:id/deactivate

Deactiveert een user door `isActive` op `false` te zetten.

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
- Routing key: `planning.user.deactivated`
- Root element: `PlanningUserDeactivated`

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
    "sessionSpeakerId": "d50e8400-e29b-41d4-a716-446655440000",
    "sessionId": "4e61b896-8ad9-4235-bbba-8ae31d91ba56",
    "speakerId": "650e8400-e29b-41d4-a716-446655440000",
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

**Verplichte velden**
- `speakerId`

**Request body**
```json
{
  "speakerId": "650e8400-e29b-41d4-a716-446655440000",
  "role": "hoofdspreker"
}
```

**Response 201**
```json
{
  "sessionSpeakerId": "d50e8400-e29b-41d4-a716-446655440000",
  "sessionId": "4e61b896-8ad9-4235-bbba-8ae31d91ba56",
  "speakerId": "650e8400-e29b-41d4-a716-446655440000",
  "role": "hoofdspreker",
  "confirmed": false
}
```

**Response 400 — validatiefout**
```json
{
  "error": {
    "fieldErrors": {
      "speakerId": ["speakerId moet een geldig UUID zijn"]
    }
  }
}
```

**Response 409 — spreker al gelinkt**
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

---

## Health check

### GET /health

Controleert of de Planning Service actief is.

**Request**
- Geen body vereist

**Response 200**
```json
{
  "status": "ok",
  "service": "planning"
}
```