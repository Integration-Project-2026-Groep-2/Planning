import { validateXml } from '../utils/xml.validator';

describe('XML XSD validation', () => {
  it('session.xsd - SessionCreated', async () => {
    const xml = `
      <SessionCreated>
        <sessionId>123e4567-e89b-12d3-a456-426614174000</sessionId>
        <title>Test Session</title>
        <date>2026-05-20</date>
        <startTime>10:00:00</startTime>
        <endTime>12:00:00</endTime>
        <location>Room A</location>
        <status>active</status>
        <capacity>50</capacity>
        <timestamp>2026-05-05T18:00:00Z</timestamp>
      </SessionCreated>
    `;

    await expect(validateXml(xml, 'SessionCreated')).resolves.toBe(true);
  });

  it('session.xsd - SessionRescheduled', async () => {
    const xml = `
      <SessionRescheduled>
        <sessionId>123e4567-e89b-12d3-a456-426614174000</sessionId>
        <sessionName>Test Session</sessionName>
        <oldDate>2026-05-10</oldDate>
        <oldStartTime>10:00:00</oldStartTime>
        <oldEndTime>12:00:00</oldEndTime>
        <newDate>2026-05-12</newDate>
        <newStartTime>11:00:00</newStartTime>
        <newEndTime>13:00:00</newEndTime>
        <timestamp>2026-05-05T18:00:00Z</timestamp>
        <icsData>base64test</icsData>
      </SessionRescheduled>
    `;

    await expect(validateXml(xml, 'SessionRescheduled')).resolves.toBe(true);
  });

  it('location.xsd - PlanningLocationCreated', async () => {
    const xml = `
      <PlanningLocationCreated>
        <locationId>123e4567-e89b-12d3-a456-426614174000</locationId>
        <roomName>Zaal A</roomName>
        <capacity>100</capacity>
        <status>beschikbaar</status>
      </PlanningLocationCreated>
    `;

    await expect(validateXml(xml, 'PlanningLocationCreated')).resolves.toBe(true);
  });

  it('speaker.xsd - PlanningSpeakerCreated', async () => {
    const xml = `
      <PlanningSpeakerCreated>
        <speakerId>123e4567-e89b-12d3-a456-426614174000</speakerId>
        <firstName>Jan</firstName>
        <lastName>Jansen</lastName>
        <email>jan@test.com</email>
        <isActive>true</isActive>
      </PlanningSpeakerCreated>
    `;

    await expect(validateXml(xml, 'PlanningSpeakerCreated')).resolves.toBe(true);
  });

  it('frontend.xsd - FrontendSessionCreated', async () => {
    const xml = `
      <FrontendSessionCreated>
        <title>Frontend Test Session</title>
        <date>2026-05-20</date>
        <startTime>10:00:00</startTime>
        <endTime>12:00:00</endTime>
        <capacity>50</capacity>
      </FrontendSessionCreated>
    `;

    await expect(validateXml(xml, 'FrontendSessionCreated')).resolves.toBe(true);
  });

  it('crm.xsd - UserConfirmed', async () => {
    const xml = `
      <UserConfirmed>
        <id>123e4567-e89b-12d3-a456-426614174000</id>
        <email>user@test.com</email>
        <firstName>Yasmine</firstName>
        <lastName>Test</lastName>
        <role>SPEAKER</role>
        <isActive>true</isActive>
        <gdprConsent>true</gdprConsent>
      </UserConfirmed>
    `;

    await expect(validateXml(xml, 'UserConfirmed')).resolves.toBe(true);
  });

  it('controlroom.xsd - Heartbeat', async () => {
    const xml = `
      <Heartbeat>
        <serviceId>planning</serviceId>
        <timestamp>2026-05-05T18:00:00Z</timestamp>
      </Heartbeat>
    `;

    await expect(validateXml(xml, 'Heartbeat')).resolves.toBe(true);
  });
});