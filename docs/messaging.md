# Messaging Documentatie – Planning Service

## Message formaat

Alle berichten worden verstuurd via RabbitMQ met:

- content_type: application/xml
- encoding: UTF-8

---

## Validatie (producers)

Voor elk uitgaand bericht:

- XML wordt gevalideerd met `xml.validator`
- bij fout: error loggen
- bericht wordt NIET verstuurd

---

## Planning verstuurt

### planning.session.created
Wordt verstuurd wanneer een nieuwe sessie wordt aangemaakt.

**Root element:** `SessionCreated`

**Velden:**
- sessionId
- title
- date
- startTime
- endTime
- locationId
- capacity
- status

**Gebruik:**
- verstuurd na succesvolle create van een sessie

---

### planning.session.cancelled
Wordt verstuurd wanneer een sessie geannuleerd wordt.

**Root element:** `SessionCancelled`

**Velden:**
- sessionId
- title
- date
- startTime
- endTime
- reason

**Gebruik:**
- verstuurd wanneer een sessie via cancelSession geannuleerd wordt

---

### planning.session.rescheduled
Wordt verstuurd wanneer een sessie verzet wordt.

**Root element:** `SessionRescheduled`

**Velden:**
- sessionId
- title
- oldDate
- oldStartTime
- oldEndTime
- newDate
- newStartTime
- newEndTime
- reason

**Gebruik:**
- verstuurd wanneer een sessie via rescheduleSession naar een nieuw tijdslot verplaatst wordt

---

### planning.session.updated
Contract 11 naar CRM.

**Root element:** `SessionUpdate`

**Velden:**
- sessionId
- sessionName
- newTime
- newLocation
- changeType

**Toegelaten waarden voor changeType:**
- `rescheduled`
- `cancelled`
- `updated`

**Gebruik:**
- verstuurd naar CRM bij update, annulatie of verplaatsing van een sessie

---

## Planning ontvangt

### crm.user.confirmed
Consumer verwerkt nieuwe gebruikers uit CRM. Enkel users met `role = SPEAKER` worden toegevoegd aan de Speaker tabel.

**Root element:** `UserConfirmed`

**Validatie:**
- XML wordt gevalideerd met `xml.validator`
- bij ongeldige XML wordt een error gelogd
- bericht wordt niet ge-acknowledged

**DLQ gedrag:**
- RabbitMQ stuurt ongeldige berichten automatisch naar de dead letter queue

**Gedrag:**
- als role niet `SPEAKER` is, wordt het bericht genegeerd
- als speaker al bestaat op basis van `crmMasterId`, wordt geen duplicate aangemaakt

---

### crm.user.updated
Consumer verwerkt updates van speakers uit CRM.

**Root element:** `UserUpdated`

**Validatie:**
- XML wordt gevalideerd met `xml.validator`
- bij ongeldige XML wordt een error gelogd
- bericht wordt niet ge-acknowledged

**DLQ gedrag:**
- RabbitMQ stuurt ongeldige berichten automatisch naar de dead letter queue

**Gedrag:**
- bestaande speaker wordt geüpdatet op basis van `crmMasterId`

---

### crm.user.deactivated
Consumer verwerkt deactivatie van speakers uit CRM.

**Root element:** `UserDeactivated`

**Validatie:**
- XML wordt gevalideerd met `xml.validator`
- bij ongeldige XML wordt een error gelogd
- bericht wordt niet ge-acknowledged

**DLQ gedrag:**
- RabbitMQ stuurt ongeldige berichten automatisch naar de dead letter queue

**Gedrag:**
- `isActive` wordt op `false` gezet op basis van `crmMasterId`

---

## XML conventie

Voor alle berichten gelden deze regels:

- root element in **PascalCase**
- velden in **lowerCamelCase**

**Voorbeeld:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<SessionCreated>
  <sessionId>ec53f94c-6fbf-4708-89ca-9a9bb9f02f07</sessionId>
  <title>Test Session</title>
  <date>2026-04-02</date>
  <startTime>14:00:00</startTime>
  <endTime>15:00:00</endTime>
  <capacity>50</capacity>
  <status>concept</status>
</SessionCreated>