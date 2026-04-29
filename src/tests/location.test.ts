import request from 'supertest';
import app from '../app';
import { query } from '../db';

jest.mock('../db', () => ({ query: jest.fn() }));

jest.mock('../rabbitmq', () => ({
  connectRabbitMQ: jest.fn(),
  getChannel: jest.fn(),
}));

jest.mock('../producers', () => ({
  startHeartbeatProducer: jest.fn(),
}));

jest.mock('../consumers', () => ({
  startUserConfirmedConsumer: jest.fn().mockResolvedValue(undefined),
  startUserUpdatedConsumer: jest.fn().mockResolvedValue(undefined),
  startUserDeactivatedConsumer: jest.fn().mockResolvedValue(undefined),
  startCompanyConfirmedConsumer: jest.fn().mockResolvedValue(undefined),
  startCompanyUpdatedConsumer: jest.fn().mockResolvedValue(undefined),
  startCompanyDeactivatedConsumer: jest.fn().mockResolvedValue(undefined),
}));

const mockQuery = query as jest.Mock;

const LOCATION_ID = '550e8400-e29b-41d4-a716-446655440000';

const mockLocation = {
  locationId: LOCATION_ID,
  roomName: 'Zaal A',
  address: 'Straat 123',
  capacity: 50,
  status: 'beschikbaar',
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe('Location API', () => {
  it('GET /api/locations geeft alle locaties terug', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockLocation] });

    const res = await request(app).get('/api/locations');

    expect(res.status).toBe(200);
    expect(res.body[0].locationId).toBe(LOCATION_ID);
    expect(res.body[0].roomName).toBe('Zaal A');
  });

  it('GET /api/locations/:id geeft één locatie terug', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockLocation] });

    const res = await request(app).get(`/api/locations/${LOCATION_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.locationId).toBe(LOCATION_ID);
    expect(res.body.roomName).toBe('Zaal A');
  });

  it('GET /api/locations/:id geeft 404 als locatie niet bestaat', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`/api/locations/${LOCATION_ID}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Locatie niet gevonden');
  });

  it('POST /api/locations maakt een locatie aan', async () => {
    mockQuery.mockResolvedValue({ rows: [mockLocation] });

    const res = await request(app)
      .post('/api/locations')
      .send({
        roomName: 'Zaal A',
        address: 'Straat 123',
        capacity: 50,
        status: 'beschikbaar',
      });

    expect(res.status).toBe(201);
    expect(res.body.roomName).toBe('Zaal A');
    expect(res.body.capacity).toBe(50);
  });

  it('POST /api/locations geeft 400 bij ongeldige data', async () => {
    const res = await request(app)
      .post('/api/locations')
      .send({
        roomName: '',
        capacity: -1,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('PUT /api/locations/:id wijzigt een locatie', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...mockLocation, roomName: 'Zaal B' }],
    });

    const res = await request(app)
      .put(`/api/locations/${LOCATION_ID}`)
      .send({ roomName: 'Zaal B' });

    expect(res.status).toBe(200);
    expect(res.body.roomName).toBe('Zaal B');
  });

  it('PUT /api/locations/:id geeft 404 als locatie niet bestaat', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/locations/${LOCATION_ID}`)
      .send({ roomName: 'Zaal B' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Locatie niet gevonden');
  });

  it('DELETE /api/locations/:id verwijdert een locatie', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockLocation] });

    const res = await request(app).delete(`/api/locations/${LOCATION_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Locatie verwijderd');
  });

  it('DELETE /api/locations/:id geeft 404 als locatie niet bestaat', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete(`/api/locations/${LOCATION_ID}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Locatie niet gevonden');
  });
});