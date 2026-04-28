import request from 'supertest';
import app from '../app';
import { query } from '../db';

// ── Mock: database ──
jest.mock('../db', () => ({ query: jest.fn() }));

// ── Mock: RabbitMQ connectie ──
jest.mock('../rabbitmq', () => ({
  connectRabbitMQ: jest.fn(),
  getChannel:      jest.fn(),
}));


jest.mock('../producers', () => ({
  sendSessionCreated:      jest.fn().mockResolvedValue(undefined),
  sendSessionCancelled:    jest.fn().mockResolvedValue(undefined),
  sendSessionRescheduled:  jest.fn().mockResolvedValue(undefined),
  sendSessionUpdated:      jest.fn().mockResolvedValue(undefined),
  startHeartbeatProducer:  jest.fn(),
}));

jest.mock('../producers/participant.registered.producer', () => ({
  sendParticipantRegistered: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../producers/session.full.producer', () => ({
  sendSessionFull: jest.fn().mockResolvedValue(undefined),
}));


jest.mock('../consumers', () => ({
  startUserConfirmedConsumer:      jest.fn().mockResolvedValue(undefined),
  startUserUpdatedConsumer:        jest.fn().mockResolvedValue(undefined),
  startUserDeactivatedConsumer:    jest.fn().mockResolvedValue(undefined),
  startCompanyConfirmedConsumer:   jest.fn().mockResolvedValue(undefined),
  startCompanyUpdatedConsumer:     jest.fn().mockResolvedValue(undefined),
  startCompanyDeactivatedConsumer: jest.fn().mockResolvedValue(undefined),
}));


jest.mock('../utils/ics.generator', () => ({
  generateIcsBase64: jest.fn().mockReturnValue('base64mockics=='),
}));

const mockQuery = query as jest.Mock;


const SESSION_ID     = '4e61b896-8ad9-4235-bbba-8ae31d91ba56';
const PARTICIPANT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const mockSession = {
  sessionId:  SESSION_ID,
  title:      'Workshop TypeScript',
  date:       '2026-05-15',
  startTime:  '09:00:00',
  endTime:    '10:30:00',
  status:     'actief',
  capacity:   30,
};

const mockRegistration = {
  registrationId:   'r1b2c3d4-e5f6-7890-abcd-ef1234567891',
  sessionId:        SESSION_ID,
  participantId:    PARTICIPANT_ID,
  crmMasterId:      null,
  registrationTime: new Date().toISOString(),
};

beforeEach(() => jest.resetAllMocks());


// POST /api/sessions/:id/register
describe('POST /api/sessions/:id/register', () => {
  const validBody = { participantId: PARTICIPANT_ID };

  it('geeft 201 terug bij geldige inschrijving', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [mockSession] })         
      .mockResolvedValueOnce({ rows: [] })                    
      .mockResolvedValueOnce({ rows: [{ count: '5' }] })      
      .mockResolvedValueOnce({ rows: [mockRegistration] });    

    const res = await request(app)
      .post(`/api/sessions/${SESSION_ID}/register`)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.sessionId).toBe(SESSION_ID);
    expect(res.body.participantId).toBe(PARTICIPANT_ID);
  });

  it('geeft 400 als participantId geen geldig UUID is', async () => {
    const res = await request(app)
      .post(`/api/sessions/${SESSION_ID}/register`)
      .send({ participantId: 'geen-uuid' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('geeft 400 als participantId ontbreekt', async () => {
    const res = await request(app)
      .post(`/api/sessions/${SESSION_ID}/register`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('geeft 404 als de sessie niet bestaat', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); 

    const res = await request(app)
      .post(`/api/sessions/${SESSION_ID}/register`)
      .send(validBody);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Sessie niet gevonden');
  });

  it('geeft 400 als de sessie geannuleerd is', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...mockSession, status: 'geannuleerd' }],
    });

    const res = await request(app)
      .post(`/api/sessions/${SESSION_ID}/register`)
      .send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Sessie is geannuleerd');
  });

  it('geeft 409 als deelnemer al ingeschreven is', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [mockSession] })         
      .mockResolvedValueOnce({ rows: [mockRegistration] });   

    const res = await request(app)
      .post(`/api/sessions/${SESSION_ID}/register`)
      .send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('al ingeschreven');
  });

  it('geeft 409 als de sessie volzet is', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [mockSession] })          
      .mockResolvedValueOnce({ rows: [] })                     
      .mockResolvedValueOnce({ rows: [{ count: '30' }] });     

    const res = await request(app)
      .post(`/api/sessions/${SESSION_ID}/register`)
      .send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Sessie is volzet');
  });
});


// DELETE /api/sessions/:id/register

describe('DELETE /api/sessions/:id/register', () => {
  const validBody = { participantId: PARTICIPANT_ID };

  it('geeft 200 terug bij succesvol annuleren van inschrijving', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [mockRegistration] })   
      .mockResolvedValueOnce({ rows: [mockRegistration] })   
      .mockResolvedValueOnce({ rows: [mockSession] });       

    const res = await request(app)
      .delete(`/api/sessions/${SESSION_ID}/register`)
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Inschrijving geannuleerd');
  });

  it('geeft 400 als participantId geen geldig UUID is', async () => {
    const res = await request(app)
      .delete(`/api/sessions/${SESSION_ID}/register`)
      .send({ participantId: 'geen-uuid' });

    expect(res.status).toBe(400);
  });

  it('geeft 400 als participantId ontbreekt', async () => {
    const res = await request(app)
      .delete(`/api/sessions/${SESSION_ID}/register`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('geeft 404 als inschrijving niet bestaat', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); 

    const res = await request(app)
      .delete(`/api/sessions/${SESSION_ID}/register`)
      .send(validBody);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Inschrijving niet gevonden');
  });
});