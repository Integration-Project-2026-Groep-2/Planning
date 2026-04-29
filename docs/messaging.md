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

Ontvangers:
- Frontend  
- Control Room  

---

## planning.session.updated

Exchange: planning.topic (topic)  
Routing key: planning.session.updated  

Root element: SessionUpdated  

Velden:
- sessionId (verplicht)  
- sessionName (verplicht)  
- changeType: rescheduled | cancelled | updated  
- newTime (optioneel)  
- newLocation (optioneel)  
- participantIds[] (optioneel)  
- timestamp (verplicht)  

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
- status (cancelled)  
- reason (optioneel)  
- participantIds[] (optioneel)  
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
- icsData (optioneel) — base64 encoded ICS-bestand voor Outlook/kalender synchronisatie  
- timestamp  

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
- Mailing  

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

# Planning ontvangt (Consumers)

Alle CRM events via exchange: contact.topic (topic)

---

## crm.user.confirmed

Routing key: crm.user.confirmed  
Root element: UserConfirmed  

Gedrag:
- role = SPEAKER → insert in Speaker tabel  
- anders → genegeerd  
- idempotency check  
- bij fout → DLQ  

---

## crm.user.updated

Routing key: crm.user.updated  
Root element: UserUpdated  

Gedrag:
- update Speaker via crmMasterId  
- idempotency check  
- bij fout → DLQ  

---

## crm.user.deactivated

Routing key: crm.user.deactivated  
Root element: UserDeactivated  

Gedrag:
- zet isActive = false  
- idempotency check  
- bij fout → DLQ  

---

## crm.company.confirmed

Routing key: crm.company.confirmed  
Root element: CompanyConfirmed  

Gedrag:
- company opslaan bij Speaker  
- idempotency check  
- bij fout → DLQ  

---

## crm.company.updated

Routing key: crm.company.updated  
Root element: CompanyUpdated  

Gedrag:
- update company gegevens  
- idempotency check  
- bij fout → DLQ  

---

## crm.company.deactivated

Routing key: crm.company.deactivated  
Root element: CompanyDeactivated  

Gedrag:
- zet gekoppelde speakers op inactive  
- controle op toekomstige sessies  
- idempotency check  
- bij fout → DLQ  

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