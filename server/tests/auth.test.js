const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const { signToken } = require('../src/utils/token');

const validUser = { name: 'Chloe Customer', email: 'chloe@example.com', password: 'Password123' };

const register = (body = validUser) => request(app).post('/api/auth/register').send(body);
const login = (body) => request(app).post('/api/auth/login').send(body);
const tokenCookie = (res) => (res.headers['set-cookie'] || []).find((c) => c.startsWith('token='));

describe('POST /api/auth/register', () => {
  it('creates a customer, sets an httpOnly cookie and hides the password', async () => {
    const res = await register();
    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email: 'chloe@example.com', role: 'customer' });
    expect(res.body.data.user.password).toBeUndefined();

    const cookie = tokenCookie(res);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
  });

  it('lets someone register as a restaurant owner', async () => {
    const res = await register({ ...validUser, role: 'owner' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('owner');
  });

  it('refuses to create an admin through the public API', async () => {
    const res = await register({ ...validUser, role: 'admin' });
    expect(res.status).toBe(400);
    expect(await User.countDocuments()).toBe(0);
  });

  it('ignores fields that are not allowed (mass assignment)', async () => {
    const res = await register({ ...validUser, isActive: false, _id: '507f1f77bcf86cd799439011' });
    expect(res.status).toBe(201);
    const user = await User.findOne({ email: validUser.email });
    expect(user.isActive).toBe(true);
    expect(user._id.toString()).not.toBe('507f1f77bcf86cd799439011');
  });

  it('returns field errors for invalid input', async () => {
    const res = await register({ name: 'A', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e) => e.field).sort();
    expect(fields).toEqual(['email', 'name', 'password']);
  });

  it('rejects a duplicate email with 409', async () => {
    await register();
    const res = await register({ ...validUser, email: 'CHLOE@example.com' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => register());

  it('logs in with the right password', async () => {
    const res = await login({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(tokenCookie(res)).toBeDefined();
  });

  it('gives the same generic message for a wrong password and an unknown email', async () => {
    const wrongPassword = await login({ email: validUser.email, password: 'Wrong12345' });
    const unknownEmail = await login({ email: 'nobody@example.com', password: 'Wrong12345' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it('blocks NoSQL injection payloads', async () => {
    const res = await login({ email: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(400);
    expect(tokenCookie(res)).toBeUndefined();
  });

  it('refuses suspended accounts', async () => {
    await User.updateOne({ email: validUser.email }, { isActive: false });
    const res = await login({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(403);
  });
});

describe('Session: GET /api/auth/me and logout', () => {
  it('returns 401 without a cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user with a valid cookie', async () => {
    const agent = request.agent(app); // keeps cookies between requests, like a browser
    await agent.post('/api/auth/register').send(validUser);
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validUser.email);
  });

  it('rejects a tampered token', async () => {
    const user = await User.create(validUser);
    const token = signToken(user);
    const tampered = `${token.slice(0, -2)}xx`;
    const res = await request(app).get('/api/auth/me').set('Cookie', `token=${tampered}`);
    expect(res.status).toBe(401);
  });

  it('rejects a token signed with a different secret', async () => {
    const user = await User.create(validUser);
    const forged = jwt.sign({ id: user._id.toString(), role: 'admin' }, 'attacker-secret');
    const res = await request(app).get('/api/auth/me').set('Cookie', `token=${forged}`);
    expect(res.status).toBe(401);
  });

  it('clears the cookie on logout', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(validUser);
    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(200);
    expect(tokenCookie(logout)).toMatch(/Expires=Thu, 01 Jan 1970/);

    const after = await agent.get('/api/auth/me');
    expect(after.status).toBe(401);
  });
});
