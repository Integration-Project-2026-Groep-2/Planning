# Messaging Documentatie – Planning Service

## Message formaat

Alle berichten worden verstuurd via RabbitMQ met:

- content_type: application/xml
- encoding: UTF-8
- datum formaat: YYYY-MM-DD
- tijd formaat: HH:mm:ss

---

## Validatie (producers)

Voor elk uitgaand bericht:

- XML wordt gevalideerd met `xml.validator`
- bij fout:
  - error wordt gelogd
  - bericht wordt **NIET verstuurd**

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
- verstuurd wanneer een sessie via `cancelSession` geannuleerd wordt

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
- verstuurd wanneer een sessie via `rescheduleSession` naar een nieuw tijdslot verplaatst wordt

---

### planning.session.updated.crm
Wordt verstuurd naar CRM bij update, annulatie of verplaatsing van een sessie.

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

**newTime formaat:**
- `YYYY-MM-DD HH:mm:ss - HH:mm:ss`

**Gebruik:**
- verstuurd naar CRM bij update, annulatie of verplaatsing van een sessie

---

### planning.session.updated
Wordt verstuurd naar Frontend en Mailing wanneer een sessie gewijzigd wordt.

**Root element:** `SessionUpdated`

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
- verstuurd naar Frontend en Mailing bij wijziging van een sessie

---

### planning.session.full
Wordt verstuurd wanneer een sessie volzet is.

**Root element:** `SessionFull`

**Velden:**
- sessionId
- title
- capacity

**Gebruik:**
- verstuurd wanneer een sessie haar maximale capaciteit bereikt

---

### planning.participant.registered
Wordt verstuurd wanneer een deelnemer succesvol geregistreerd wordt.

**Root element:** `ParticipantRegistered`

**Velden:**
- sessionId
- participantId

**Gebruik:**
- verstuurd na succesvolle registratie van een deelnemer

---

## Planning ontvangt

### crm.user.confirmed
Consumer verwerkt nieuwe gebruikers uit CRM. Enkel users met `role = SPEAKER` worden toegevoegd aan de Speaker tabel.

**Root element:** `UserConfirmed`

**Validatie:**
- XML wordt gevalideerd met `xml.validator`
- payload wordt gevalideerd met Zod
- bij ongeldige XML:
  - error wordt gelogd
  - bericht wordt niet ge-acknowledged
  - RabbitMQ stuurt het bericht automatisch naar de DLQ (indien geconfigureerd)

**DLQ:**
- `crm.user.confirmed.dlq`

**Gedrag:**
- als `role` niet `SPEAKER` is, wordt het bericht genegeerd
- als speaker al bestaat op basis van `crmMasterId`, wordt geen duplicate aangemaakt

---

### crm.user.updated
Consumer verwerkt updates van speakers uit CRM.

**Root element:** `UserUpdated`

**Validatie:**
- XML wordt gevalideerd met `xml.validator`
- payload wordt gevalideerd met Zod
- bij ongeldige XML:
  - error wordt gelogd
  - bericht wordt niet ge-acknowledged
  - RabbitMQ stuurt het bericht automatisch naar de DLQ (indien geconfigureerd)

**DLQ:**
- `crm.user.updated.dlq`

**Gedrag:**
- bestaande speaker wordt geüpdatet op basis van `crmMasterId`

---

### crm.user.deactivated
Consumer verwerkt deactivatie van speakers uit CRM.

**Root element:** `UserDeactivated`

**Validatie:**
- XML wordt gevalideerd met `xml.validator`
- payload wordt gevalideerd met Zod
- bij ongeldige XML:
  - error wordt gelogd
  - bericht wordt niet ge-acknowledged
  - RabbitMQ stuurt het bericht automatisch naar de DLQ (indien geconfigureerd)

**DLQ:**
- `crm.user.deactivated.dlq`

**Gedrag:**
- `isActive` wordt op `false` gezet op basis van `crmMasterId`

---

### crm.company.confirmed
Consumer verwerkt een nieuw bedrijf uit CRM.

**Root element:** `CompanyConfirmed`

**Validatie:**
- XML wordt gevalideerd met `xml.validator`
- payload wordt gevalideerd met Zod
- bij ongeldige XML:
  - error wordt gelogd
  - bericht wordt niet ge-acknowledged
  - RabbitMQ stuurt het bericht automatisch naar de DLQ (indien geconfigureerd)

**DLQ:**
- `crm.company.confirmed.dlq`

**Gedrag:**
- zoekt speaker op basis van `crmMasterId`
- slaat bedrijfsnaam op in `Speaker.company`

---

### crm.company.updated
Consumer verwerkt een wijziging van een bedrijf uit CRM.

**Root element:** `CompanyUpdated`

**Validatie:**
- XML wordt gevalideerd met `xml.validator`
- payload wordt gevalideerd met Zod
- bij ongeldige XML:
  - error wordt gelogd
  - bericht wordt niet ge-acknowledged
  - RabbitMQ stuurt het bericht automatisch naar de DLQ (indien geconfigureerd)

**DLQ:**
- `crm.company.updated.dlq`

**Gedrag:**
- zoekt speaker op basis van `crmMasterId`
- werkt `Speaker.company` bij

---

### crm.company.deactivated
Consumer verwerkt een deactivatie van een bedrijf uit CRM.

**Root element:** `CompanyDeactivated`

**Validatie:**
- XML wordt gevalideerd met `xml.validator`
- payload wordt gevalideerd met Zod
- bij ongeldige XML:
  - error wordt gelogd
  - bericht wordt niet ge-acknowledged
  - RabbitMQ stuurt het bericht automatisch naar de DLQ (indien geconfigureerd)

**DLQ:**
- `crm.company.deactivated.dlq`

**Gedrag:**
- controleert of het bedrijf nog gekoppeld is aan toekomstige sessies
- logt een warning indien van toepassing
- zet `isActive = false` voor speakers met dezelfde bedrijfsnaam

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