# Messaging Documentatie – Planning Service (AsyncAPI compliant)

## Message formaat

Alle berichten worden verstuurd via RabbitMQ exchanges:

- content_type: application/xml
- encoding: UTF-8
- datum formaat: YYYY-MM-DD
- tijd formaat: HH:mm:ss
- datetime formaat: ISO 8601

---

## Architectuur

De Planning Service gebruikt exchange-based messaging:

- Planning publiceert naar een exchange
- Andere systemen binden hun eigen queue
- Planning weet niet wie luistert → loosely coupled

---

## Validatie (producers)

Voor elk uitgaand bericht:

- XML wordt gevalideerd met `xml.validator`
- bij fout:
  - error wordt gelogd met Pino
  - bericht wordt NIET verstuurd
  - `sendSessionError` wordt aangeroepen naar Control Room
  - bericht wordt naar DLQ gestuurd via `sendToDlq`

---

## Error handling

Bij een fout in een producer of consumer:

- `src/producers/session.error.producer.ts` → verstuurt `<SessionError>` naar Control Room via `planning.topic`
- `src/utils/dlq.ts` → stuurt ongeldig bericht naar `planning.dlq` queue

## Idempotency

Dubbele berichten worden herkend en genegeerd:

- `src/utils/idempotency.ts` → checkt via `ProcessedMessages` tabel in de database
- Bij ontvangst: check of `messageId` al verwerkt is
- Na verwerking: sla `messageId` op in `ProcessedMessages`

---

# Planning verstuurt (Producers)

## planning.heartbeat

Exchange: heartbeat.direct (direct)
Routing key: routing.heartbeat

Root element: Heartbeat

Velden:
- serviceId (planning)
- timestamp

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
- status
- capacity
- timestamp

Ontvangers: Frontend, Control Room

---

## planning.session.updated

Exchange: planning.topic (topic)
Routing key: planning.session.updated

Root element: SessionUpdated

Velden:
- sessionId (verplicht)
- sessionName (verplicht)
- changeType: rescheduled | cancelled | updated (verplicht)
- newTime (optioneel)
- newLocation (optioneel)
- participantIds[] (optioneel)
- timestamp (verplicht)

Ontvangers: CRM, Frontend, Mailing

---

## planning.session.cancelled

Exchange: planning.topic (topic)
Routing key: planning.session.cancelled

Root element: SessionCancelled

Velden:
- sessionId
- status (cancelled)
- reason (optioneel)
- participantIds[] (optioneel)
- timestamp

Ontvangers: Frontend, Mailing, Control Room

---

## planning.session.rescheduled

Exchange: planning.topic (topic)
Routing key: planning.session.rescheduled

Root element: SessionRescheduled

Velden:
- sessionId
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

Ontvangers: Frontend, Mailing

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

Ontvangers: Frontend, Mailing

---

## planning.session.error

Exchange: planning.topic (topic)
Routing key: planning.session.error

Root element: SessionError

Velden:
- errorType (VALIDATION_ERROR | OUTLOOK_SYNC_FAILED | DATABASE_ERROR | RABBITMQ_ERROR | CONFLICT_ERROR | NOT_FOUND | IDEMPOTENCY_VIOLATION | UNKNOWN_ERROR)
- message
- sessionId (optioneel)
- service (planning)
- timestamp

Ontvangers: Control Room

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

Ontvangers: Control Room

---

## planning.user.created

Exchange: user.topic (topic)
Routing key: planning.user.created

Root element: PlanningUserCreated

Velden:
- id (verplicht)
- email (verplicht)
- firstName (verplicht)
- lastName (verplicht)
- role: SPEAKER | VISITOR (verplicht)
- gdprConsent (verplicht)
- phoneNumber (optioneel)
- company (optioneel)

Ontvangers: CRM

---

## planning.user.updated

Exchange: user.topic (topic)
Routing key: planning.user.updated

Root element: PlanningUserUpdated

Velden: zelfde als PlanningUserCreated

Ontvangers: CRM

---

## planning.user.deactivated

Exchange: user.topic (topic)
Routing key: planning.user.deactivated

Root element: PlanningUserDeactivated

Velden:
- id
- email
- deactivatedAt

Ontvangers: CRM

---

# Planning ontvangt (Consumers)

Alle CRM events via exchange: contact.topic (topic)

---

## crm.user.confirmed

Routing key: crm.user.confirmed
Root element: UserConfirmed

Gedrag:
- role = SPEAKER → insert in Speaker tabel
- anders → opslaan als Participant referentie
- idempotency check via ProcessedMessages
- bij validatiefout → DLQ + SessionError

---

## crm.user.updated

Routing key: crm.user.updated
Root element: UserUpdated

Gedrag:
- update Speaker via crmMasterId
- idempotency check via ProcessedMessages
- bij validatiefout → DLQ + SessionError

---

## crm.user.deactivated

Routing key: crm.user.deactivated
Root element: UserDeactivated

Gedrag:
- zet isActive = false in Speaker tabel
- idempotency check via ProcessedMessages
- bij validatiefout → DLQ + SessionError

---

## crm.company.confirmed

Routing key: crm.company.confirmed
Root element: CompanyConfirmed

Gedrag:
- bedrijfsnaam opslaan als referentie
- idempotency check via ProcessedMessages

---

## crm.company.updated

Routing key: crm.company.updated
Root element: CompanyUpdated

Gedrag:
- bedrijfsdata bijwerken
- idempotency check via ProcessedMessages

---

## crm.company.deactivated

Routing key: crm.company.deactivated
Root element: CompanyDeactivated

Gedrag:
- bedrijf deactiveren
- controleer of gekoppeld aan toekomstige sessies
- idempotency check via ProcessedMessages

---

# XML conventie

- Root = PascalCase
- Velden = lowerCamelCase

---

## Voorbeeld
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