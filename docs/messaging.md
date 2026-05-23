# Messaging Documentatie – Planning Service (AsyncAPI compliant)

## Message formaat

Alle berichten worden verstuurd via RabbitMQ exchanges:

- content_type: application/xml
- encoding: UTF-8
- datum formaat: YYYY-MM-DD
- tijd formaat: HH:mm:ss
- datetime formaat: ISO 8601
- ICS bestanden worden meegestuurd als base64 string in het veld `icsData`

---

## Architectuur

De Planning Service gebruikt exchange-based messaging:

- Planning publiceert naar een exchange
- Andere systemen binden hun eigen queue
- Planning weet niet wie luistert → loosely coupled

Dit zorgt voor:
- schaalbaarheid
- fouttolerantie
- flexibiliteit tussen systemen

---

## Validatie (producers)

Voor elk uitgaand bericht:

- XML wordt gevalideerd met `xml.validator`
- bij fout:
  - error wordt gelogd
  - bericht wordt NIET verstuurd
  - bericht wordt naar DLQ gestuurd via `sendToDlq`

---

## Error handling

Bij een fout in een producer of consumer:

- Ongeldige berichten worden naar `planning.dlq` gestuurd
- Errors worden gelogd
- Consumer blijft draaien (geen crash)

---

## Idempotency

Dubbele berichten worden herkend en genegeerd:

- `src/utils/idempotency.ts` controleert via `ProcessedMessages`
- Bij ontvangst:
  - check of `messageId` al verwerkt is
- Na verwerking:
  - `messageId` wordt opgeslagen

Dit voorkomt:
- dubbele inserts
- dubbele updates
- inconsistente data

---

# Planning verstuurt (Producers)

## planning.heartbeat

Exchange: heartbeat.direct (direct)
Routing key: routing.heartbeat

Root element: Heartbeat

Velden:
- serviceId
- timestamp

Ontvangers:
- Control Room

---

## planning.status.check

Exchange: heartbeat.direct (direct)
Routing key: routing.statuscheck

Root element: StatusCheck

Velden:
- serviceId
- timestamp
- uptime
- memory
- disk

Ontvangers:
- Control Room

---

## planning.session.created

Exchange: planning.topic (topic)
Routing key: planning.session.created

Root element: SessionCreated

Velden:
- sessionId
- title
- date
- startTime
- endTime
- location
- locationId
- status
- capacity
- icsData (optioneel)
- timestamp

Ontvangers:
- Frontend
- Control Room

---

## planning.session.updated

Exchange: planning.topic (topic)
Routing key: planning.session.updated

Root element: SessionUpdated

Velden:
- sessionId
- sessionName
- changeType
- newTime (optioneel)
- newLocation (optioneel)
- participantIds[] (optioneel)
- icsData (optioneel)
- timestamp

Ontvangers:
- CRM
- Frontend
- Mailing

---

## planning.session.cancelled

Exchange: planning.topic (topic)
Routing key: planning.session.cancelled

Root element: SessionCancelled

Velden:
- sessionId
- sessionName
- status
- reason (optioneel)
- participantIds[] (optioneel)
- icsData (optioneel)
- timestamp

Ontvangers:
- Frontend
- Mailing
- Control Room

---

## planning.session.rescheduled

Exchange: planning.topic (topic)
Routing key: planning.session.rescheduled

Root element: SessionRescheduled

Velden:
- sessionId
- sessionName
- oldDate
- oldStartTime
- oldEndTime
- newDate
- newStartTime
- newEndTime
- newLocation (optioneel)
- reason (optioneel)
- participantIds[] (optioneel)
- timestamp
- icsData (optioneel)

BELANGRIJK:
Volgorde moet exact overeenkomen met `session.xsd`.
`timestamp` moet vóór `icsData` staan.

Ontvangers:
- Frontend
- Mailing

---

## planning.session.full

Exchange: planning.topic (topic)
Routing key: planning.session.full

Root element: SessionFull

Velden:
- sessionId
- currentRegistrations
- capacity
- crmMasterId (optioneel)
- timestamp

Ontvangers:
- Frontend

---

## planning.participant.registered

Exchange: planning.topic (topic)
Routing key: planning.participant.registered

Root element: ParticipantRegistered

Velden:
- sessionId
- crmMasterId
- currentRegistrations
- capacity
- registrationTime
- timestamp

Ontvangers:
- Control Room

---

## planning.session.error

Exchange: planning.topic (topic)
Routing key: planning.session.error

Root element: SessionError

Velden:
- errorType
- message
- timestamp

Ontvangers:
- Control Room

---

## planning.location.created

Exchange: planning.topic (topic)
Routing key: planning.location.created

Root element: LocationCreated

Velden:
- locationId
- roomName
- capacity
- address (optioneel)
- status (optioneel)
- timestamp

Ontvangers:
- Frontend

---

## planning.location.updated

Exchange: planning.topic (topic)
Routing key: planning.location.updated

Root element: LocationUpdated

Velden:
- locationId
- roomName
- capacity
- address (optioneel)
- status (optioneel)
- timestamp

Ontvangers:
- Frontend

---

## planning.location.deleted

Exchange: planning.topic (topic)
Routing key: planning.location.deleted

Root element: LocationDeleted

Velden:
- locationId
- timestamp

Ontvangers:
- Frontend

---

## planning.speaker.created

Exchange: planning.topic (topic)
Routing key: planning.speaker.created

Root element: SpeakerCreated

Velden:
- speakerId
- firstName
- lastName
- email
- phoneNumber (optioneel)
- company (optioneel)
- isActive (optioneel)
- timestamp

Ontvangers:
- Frontend

---

## planning.speaker.updated

Exchange: planning.topic (topic)
Routing key: planning.speaker.updated

Root element: SpeakerUpdated

Velden:
- speakerId
- firstName
- lastName
- email
- phoneNumber (optioneel)
- company (optioneel)
- isActive (optioneel)
- timestamp

Ontvangers:
- Frontend

---

## planning.speaker.deactivated

Exchange: planning.topic (topic)
Routing key: planning.speaker.deactivated

Root element: SpeakerDeactivated

Velden:
- speakerId
- email (optioneel)
- deactivatedAt (optioneel)

Ontvangers:
- Frontend

---

## planning.registration.confirmed

Exchange: planning.topic (topic)
Routing key: planning.registration.confirmed

Root element: RegistrationConfirmed

Velden:
- registrationId
- sessionId
- crmMasterId
- timestamp

Ontvangers:
- Frontend

---

## planning.user.created

Exchange: user.topic (topic)
Routing key: planning.user.created

Root element: PlanningUserCreated

Velden:
- id
- email
- firstName
- lastName
- role
- isActive
- phoneNumber (optioneel)
- company (optioneel)

Ontvangers:
- CRM

---

## planning.user.updated

Exchange: user.topic (topic)
Routing key: planning.user.updated

Root element: PlanningUserUpdated

Velden:
- id
- email
- firstName
- lastName
- role
- isActive
- phoneNumber (optioneel)
- company (optioneel)

Ontvangers:
- CRM

---

## planning.user.deactivated

Exchange: user.topic (topic)
Routing key: planning.user.deactivated

Root element: PlanningUserDeactivated

Velden:
- id
- email
- deactivatedAt

Ontvangers:
- CRM

---

# Planning ontvangt (Consumers)

---

## crm.user.confirmed

Exchange: contact.topic (topic)
Routing key: crm.user.confirmed

Root element: UserConfirmed

Gedrag:
- role = SPEAKER → insert in Speaker tabel
- anders → genegeerd
- idempotency check
- bij fout → DLQ

---

## crm.user.updated

Exchange: contact.topic (topic)
Routing key: crm.user.updated

Root element: UserUpdated

Gedrag:
- update Speaker via crmMasterId
- gebruikt xs:all → volgorde van XML velden maakt niet uit
- idempotency check
- bij fout → DLQ

---

## crm.user.deactivated

Exchange: contact.topic (topic)
Routing key: crm.user.deactivated

Root element: UserDeactivated

Gedrag:
- zet isActive = false
- idempotency check
- bij fout → DLQ

---

## frontend.location.created

Exchange: frontend.topic (topic)
Routing key: frontend.location.created

Root element: FrontendLocationCreated

Gedrag:
- maakt nieuwe locatie aan
- XML validatie
- idempotency check
- bij fout → DLQ

---

## frontend.location.updated

Exchange: frontend.topic (topic)
Routing key: frontend.location.updated

Root element: FrontendLocationUpdated

Gedrag:
- update locatie
- XML validatie
- idempotency check
- bij fout → DLQ

---

## frontend.location.deleted

Exchange: frontend.topic (topic)
Routing key: frontend.location.deleted

Root element: FrontendLocationDeleted

Gedrag:
- verwijdert locatie
- XML validatie
- idempotency check
- bij fout → DLQ

---

## frontend.speaker.created

Exchange: frontend.topic (topic)
Routing key: frontend.speaker.created

Root element: FrontendSpeakerCreated

Gedrag:
- maakt speaker aan
- XML validatie
- idempotency check
- bij fout → DLQ

---

## frontend.speaker.updated

Exchange: frontend.topic (topic)
Routing key: frontend.speaker.updated

Root element: FrontendSpeakerUpdated

Gedrag:
- update speaker
- XML validatie
- idempotency check
- bij fout → DLQ

---

## frontend.speaker.deactivated

Exchange: frontend.topic (topic)
Routing key: frontend.speaker.deactivated

Root element: FrontendSpeakerDeactivated

Gedrag:
- zet speaker inactive
- XML validatie
- idempotency check
- bij fout → DLQ

---

## frontend.session.created

Exchange: frontend.topic (topic)
Routing key: frontend.session.created

Root element: FrontendSessionCreated

Gedrag:
- maak nieuwe sessie aan
- XML validatie
- idempotency check
- bij fout → DLQ

---

## frontend.session.updated

Exchange: frontend.topic (topic)
Routing key: frontend.session.updated

Root element: FrontendSessionUpdated

Gedrag:
- update bestaande sessie
- XML validatie
- idempotency check
- bij fout → DLQ

---

## frontend.session.cancelled

Exchange: frontend.topic (topic)
Routing key: frontend.session.cancelled

Root element: FrontendSessionCancelled

Gedrag:
- annuleer sessie
- XML validatie
- idempotency check
- bij fout → DLQ

---

## frontend.session.rescheduled

Exchange: frontend.topic (topic)
Routing key: frontend.session.rescheduled

Root element: FrontendSessionRescheduled

Gedrag:
- verzet sessie
- XML validatie
- idempotency check
- bij fout → DLQ

---

## frontend.registration.created

Exchange: frontend.topic (topic)
Routing key: frontend.registration.created

Root element: RegistrationCreated

Gedrag:
- registreert deelnemer voor sessie
- controle capaciteit
- stuurt participant.registered event
- bij full → session.full event
- XML validatie
- idempotency check
- bij fout → DLQ

---

# XML conventie

## Root elements

PascalCase:

```xml
<SessionCreated>
```

## Velden

lowerCamelCase:

```xml
<sessionId>
<startTime>
<newLocation>
```

---

# Voorbeeld XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<SessionCreated>
  <sessionId>ec53f94c-6fbf-4708-89ca-9a9bb9f02f07</sessionId>
  <title>Test Session</title>
  <date>2026-04-02</date>
  <startTime>14:00:00</startTime>
  <endTime>15:00:00</endTime>
  <location>Room A</location>
  <capacity>50</capacity>
  <status>concept</status>
  <timestamp>2026-03-30T12:00:00Z</timestamp>
</SessionCreated>
```