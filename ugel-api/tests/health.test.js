const request = require('supertest');
const app = require('../app');

describe('Health Check Endpoints', () => {
  it('should return 200 OK for public health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'OK');
  });

  it('should return 401 for protected database health check without token', async () => {
    const res = await request(app).get('/api/health/database');
    expect(res.statusCode).toEqual(401);
  });
});
