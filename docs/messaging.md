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
  - error wordt gelogd
  - bericht wordt NIET verstuurd

---

# Planning verstuurt (Producers)

## planning.session.created

Exchange: planning.session.created (fanout)

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

Gebruik:
- na createSession

---

## planning.session.updated

Exchange: planning.session.updated (topic)

Root element: SessionUpdated

Velden:
- sessionId
- changeType
- newTime (optioneel)
- newLocation (optioneel)
- newTitle (optioneel)
- newCapacity (optioneel)
- ingeschrevenDeelnemers (optioneel)
- timestamp

Gebruik:
- bij update van sessie

---

## planning.session.updated (CRM)

Exchange: planning.session.updated

Root element: SessionUpdate

Velden:
- sessionId
- sessionName
- newTime
- newLocation
- changeType

changeType:
- updated
- cancelled
- rescheduled

Gebruik:
- communicatie naar CRM

---

## planning.session.cancelled

Exchange: planning.session.cancelled (fanout)

Root element: SessionCancelled

Velden:
- sessionId
- status (cancelled)
- reason
- ingeschrevenDeelnemers
- timestamp

---

## planning.session.rescheduled

Exchange: planning.session.rescheduled (fanout)

Root element: SessionRescheduled

Velden:
- sessionId
- oldDate
- oldStartTime
- oldEndTime
- newDate
- newStartTime
- newEndTime
- newLocation
- reason
- ingeschrevenDeelnemers
- timestamp

---

## planning.session.full

Exchange: planning.session.full (fanout)

Root element: SessionFull

Velden:
- sessionId
- currentRegistrations
- capacity
- crmMasterId
- timestamp

---

## planning.participant.registered

Exchange: planning.participant.registered (fanout)

Root element: ParticipantRegistered

Velden:
- sessionId
- crmMasterId
- currentRegistrations
- capacity
- registrationTime
- timestamp

---

## planning.heartbeat

Exchange: planning.heartbeat (fanout)

Root element: Heartbeat

Velden:
- serviceId
- timestamp
- status
- dbOk
- rabbitmqOk
- outlookOk

---

# Planning ontvangt (Consumers)

Alle CRM events via:

Exchange: contact.topic (topic)

---

## crm.user.confirmed

Routing key: crm.user.confirmed  
Root element: UserConfirmed

Gedrag:
- enkel role = SPEAKER
- insert in Speaker
- geen duplicates

---

## crm.user.updated

Routing key: crm.user.updated  
Root element: UserUpdated

Gedrag:
- update speaker via crmMasterId

---

## crm.user.deactivated

Routing key: crm.user.deactivated  
Root element: UserDeactivated

Gedrag:
- zet isActive = false

---

## crm.company.confirmed

Routing key: crm.company.confirmed  
Root element: CompanyConfirmed

Gedrag:
- vult Speaker.company

---

## crm.company.updated

Routing key: crm.company.updated  
Root element: CompanyUpdated

Gedrag:
- update Speaker.company

---

## crm.company.deactivated

Routing key: crm.company.deactivated  
Root element: CompanyDeactivated

Gedrag:
- zet speakers inactive

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