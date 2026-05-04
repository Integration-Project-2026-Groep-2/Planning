import request from 'supertest';
import app from '../app';
import { query } from '../db';

jest.mock('../db', () => ({ query: jest.fn() }));

jest.mock('../rabbitmq', () => ({
  connectRabbitMQ: jest.fn(),
  getChannel: jest.fn(() => ({
    assertExchange: jest.fn(),
    publish: jest.fn(),
  })),
}));

jest.mock('../producers', () => ({
  startHeartbeatProducer: jest.fn(),
}));

jest.mock('../producers/planning.user.updated.producer', () => ({
  sendPlanningUserUpdated: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../producers/planning.user.deactivated.producer', () => ({
  sendPlanningUserDeactivated: jest.fn().mockResolvedValue(undefined),
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

const SPEAKER_ID = '650e8400-e29b-41d4-a716-446655440000';

const mockSpeaker = {
  speakerId: SPEAKER_ID,
  crmMasterId: '550e8400-e29b-41d4-a716-446655440000',
  firstName: 'Jan',
  lastName: 'Jansen',
  email: 'jan@example.com',
  phoneNumber: '+31612345678',
  company: 'TechCorp',
  isActive: true,
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe('Speaker API', () => {
  it('GET /api/speakers geeft alle sprekers terug', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockSpeaker] });

    const res = await request(app).get('/api/speakers');

    expect(res.status).toBe(200);
    expect(res.body[0].speakerId).toBe(SPEAKER_ID);
  });

  it('GET /api/speakers/:id geeft één spreker terug', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockSpeaker] });

    const res = await request(app).get(`/api/speakers/${SPEAKER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('jan@example.com');
  });

  it('GET /api/speakers/:id geeft 404 als spreker niet bestaat', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get(`/api/speakers/${SPEAKER_ID}`);

    expect(res.status).toBe(404);
  });

  it('PUT /api/speakers/:id wijzigt een spreker', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...mockSpeaker, firstName: 'Johannes' }],
    });

    const res = await request(app)
      .put(`/api/speakers/${SPEAKER_ID}`)
      .send({ firstName: 'Johannes' });

    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('Johannes');
  });

  it('PUT /api/speakers/:id geeft 400 bij ongeldig emailadres', async () => {
    const res = await request(app)
      .put(`/api/speakers/${SPEAKER_ID}`)
      .send({ email: 'fout-email' });

    expect(res.status).toBe(400);
  });

  it('PATCH /api/speakers/:id/deactivate deactiveert een spreker', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...mockSpeaker, isActive: false }],
    });

    const res = await request(app).patch(
      `/api/speakers/${SPEAKER_ID}/deactivate`
    );

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Spreker gedeactiveerd');
    expect(res.body.speaker.isActive).toBe(false);
  });
});