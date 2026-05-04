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


jest.mock('../services/changelog.service', () => ({
  createLog: jest.fn().mockResolvedValue(undefined),
}));


jest.mock('../services/location.service', () => ({
  getLocationById: jest.fn().mockResolvedValue({ roomName: 'Zaal A' }),
}));

const mockQuery = query as jest.Mock;

const SESSION_ID = '4e61b896-8ad9-4235-bbba-8ae31d91ba56';

const mockSession = {
  sessionId:   SESSION_ID,
  title:       'Workshop TypeScript',
  description: 'Introductie tot TypeScript',
  date:        '2026-05-15',
  startTime:   '09:00:00',
  endTime:     '10:30:00',
  status:      'concept',
  locationId:  null,
  capacity:    30,
  syncStatus:  'pending',
};

beforeEach(() => jest.resetAllMocks());


// GET /api/sessions
describe('GET /api/sessions', () => {
  it('geeft 200 terug met lijst van sessies', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockSession] });

    const res = await request(app).get('/api/sessions');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].sessionId).toBe(SESSION_ID);
  });

  it('geeft lege lijst terug als er geen sessies zijn', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/sessions');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});


// GET /api/sessions/:id
describe('GET /api/sessions/:id', () => {
  it('geeft 200 terug met de juiste sessie', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockSession] });

    const res = await request(app).get(`/api/sessions/${SESSION_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe(SESSION_ID);
    expect(res.body.title).toBe('Workshop TypeScript');
  });

  it('geeft 404 terug als sessie niet bestaat', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`/api/sessions/${SESSION_ID}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Sessie niet gevonden');
  });
});


// POST /api/sessions
describe('POST /api/sessions', () => {
  const validBody = {
    title:     'Workshop TypeScript',
    date:      '2026-05-15',
    startTime: '09:00',
    endTime:   '10:30',
    capacity:  30,
  };

  it('geeft 201 terug bij geldig verzoek', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockSession] }); 

    const res = await request(app).post('/api/sessions').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Workshop TypeScript');
  });

  it('geeft 400 als verplichte velden ontbreken', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ title: 'Geen datum' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('geeft 400 als eindtijd voor starttijd ligt', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ ...validBody, endTime: '08:00' });

    expect(res.status).toBe(400);
  });

  it('geeft 400 als capacity 0 of negatief is', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ ...validBody, capacity: 0 });

    expect(res.status).toBe(400);
  });

  it('geeft 409 bij locatieconflict', async () => {
    
    mockQuery.mockResolvedValueOnce({ rows: [mockSession] });

    const res = await request(app)
      .post('/api/sessions')
      .send({ ...validBody, locationId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('bezet');
  });
});


// PUT /api/sessions/:id
describe('PUT /api/sessions/:id', () => {
  it('geeft 200 terug bij geldige wijziging', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [mockSession] })                           
      .mockResolvedValueOnce({ rows: [{ ...mockSession, title: 'Gewijzigd' }] }) 
      .mockResolvedValueOnce({ rows: [] });                                     

    const res = await request(app)
      .put(`/api/sessions/${SESSION_ID}`)
      .send({ title: 'Gewijzigd' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Gewijzigd');
  });

  it('geeft 404 als sessie niet bestaat', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })  
      .mockResolvedValueOnce({ rows: [] }); 

    const res = await request(app)
      .put(`/api/sessions/${SESSION_ID}`)
      .send({ title: 'Gewijzigd' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Sessie niet gevonden');
  });
});


// DELETE /api/sessions/:id
describe('DELETE /api/sessions/:id', () => {
  it('geeft 200 terug bij succesvol verwijderen', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockSession] });

    const res = await request(app).delete(`/api/sessions/${SESSION_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Sessie verwijderd');
  });

  it('geeft 404 als sessie niet bestaat', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete(`/api/sessions/${SESSION_ID}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Sessie niet gevonden');
  });
});


// PATCH /api/sessions/:id/cancel
describe('PATCH /api/sessions/:id/cancel', () => {
  it('geeft 200 terug en stuurt ICS mee', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [mockSession] })                                  
      .mockResolvedValueOnce({ rows: [{ ...mockSession, status: 'geannuleerd' }] })    
      .mockResolvedValueOnce({ rows: [] });                                            

    const res = await request(app).patch(`/api/sessions/${SESSION_ID}/cancel`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Sessie geannuleerd');
    expect(res.body.session.status).toBe('geannuleerd');
  });

  it('geeft 404 als sessie niet bestaat', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })  
      .mockResolvedValueOnce({ rows: [] }); 

    const res = await request(app).patch(`/api/sessions/${SESSION_ID}/cancel`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Sessie niet gevonden');
  });
});


// PATCH /api/sessions/:id/reschedule
describe('PATCH /api/sessions/:id/reschedule', () => {
  const rescheduleBody = {
    date:      '2026-06-01',
    startTime: '10:00',
    endTime:   '11:30',
    reason:    'Zaal niet beschikbaar',
  };

  it('geeft 200 terug bij geldig verzetten', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [mockSession] })                      
      .mockResolvedValueOnce({ rows: [{ ...mockSession, date: '2026-06-01' }] }) 
      .mockResolvedValueOnce({ rows: [] });                                 

    const res = await request(app)
      .patch(`/api/sessions/${SESSION_ID}/reschedule`)
      .send(rescheduleBody);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Sessie verzet');
  });

  it('geeft 400 als reden ontbreekt', async () => {
    const res = await request(app)
      .patch(`/api/sessions/${SESSION_ID}/reschedule`)
      .send({ date: '2026-06-01', startTime: '10:00', endTime: '11:30' });

    expect(res.status).toBe(400);
  });

  it('geeft 400 als eindtijd voor starttijd ligt', async () => {
    const res = await request(app)
      .patch(`/api/sessions/${SESSION_ID}/reschedule`)
      .send({ ...rescheduleBody, endTime: '09:00' });

    expect(res.status).toBe(400);
  });

  it('geeft 404 als sessie niet bestaat', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })  
      .mockResolvedValueOnce({ rows: [] }); 

    const res = await request(app)
      .patch(`/api/sessions/${SESSION_ID}/reschedule`)
      .send(rescheduleBody);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Sessie niet gevonden');
  });
});