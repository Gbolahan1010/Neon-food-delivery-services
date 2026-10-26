const request = require('supertest');
const app = require('../src/app');
const Restaurant = require('../src/models/Restaurant');
const MenuItem = require('../src/models/MenuItem');
const { createUser, createRestaurant, createMenuItem } = require('./helpers');

const newRestaurant = {
  name: 'Neon Noodles',
  description: 'Ramen and bao',
  cuisines: ['Japanese', 'asian'],
  address: { line1: '12 Capel Street', city: 'Dublin 1', lat: 53.3478, lng: -6.2701 },
};

describe('Public restaurant browsing', () => {
  let owner;
  beforeEach(async () => {
    ({ user: owner } = await createUser('owner'));
  });

  it('lists only approved restaurants, with pagination info', async () => {
    await createRestaurant(owner, { name: 'Approved Place' });
    await createRestaurant(owner, { name: 'Pending Place', isApproved: false });

    const res = await request(app).get('/api/restaurants');
    expect(res.status).toBe(200);
    expect(res.body.data.map((r) => r.name)).toEqual(['Approved Place']);
    expect(res.body.meta).toMatchObject({ page: 1, total: 1, pages: 1 });
  });

  it('searches by name (partial, case-insensitive) and filters by cuisine', async () => {
    await createRestaurant(owner, { name: 'Bella Napoli', cuisines: ['italian'] });
    await createRestaurant(owner, { name: 'Lagos Kitchen', cuisines: ['nigerian'] });

    const search = await request(app).get('/api/restaurants?search=napo');
    expect(search.body.data.map((r) => r.name)).toEqual(['Bella Napoli']);

    const cuisine = await request(app).get('/api/restaurants?cuisine=Nigerian');
    expect(cuisine.body.data.map((r) => r.name)).toEqual(['Lagos Kitchen']);
  });

  it('treats search text literally (regex characters cannot break the query)', async () => {
    await createRestaurant(owner, { name: 'Bella Napoli' });
    const res = await request(app).get('/api/restaurants?search=.*');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('paginates and rejects a limit above 50', async () => {
    for (let i = 0; i < 3; i += 1) await createRestaurant(owner, { name: `Place ${i}` });
    const page2 = await request(app).get('/api/restaurants?limit=2&page=2');
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.meta).toMatchObject({ page: 2, limit: 2, total: 3, pages: 2 });

    const tooMany = await request(app).get('/api/restaurants?limit=500');
    expect(tooMany.status).toBe(400);
  });

  it('shows a restaurant with only its available dishes', async () => {
    const r = await createRestaurant(owner);
    await createMenuItem(r, { name: 'On the menu' });
    await createMenuItem(r, { name: 'Sold out', isAvailable: false });

    const res = await request(app).get(`/api/restaurants/${r._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.restaurant.name).toBe('Test Kitchen');
    expect(res.body.data.menu.map((m) => m.name)).toEqual(['On the menu']);
  });

  it('hides unapproved restaurants and rejects invalid ids', async () => {
    const pending = await createRestaurant(owner, { isApproved: false });
    expect((await request(app).get(`/api/restaurants/${pending._id}`)).status).toBe(404);
    expect((await request(app).get('/api/restaurants/not-an-id')).status).toBe(400);
  });
});

describe('Owners managing restaurants', () => {
  it('lets an owner create a restaurant that waits for approval', async () => {
    const { user, cookie } = await createUser('owner');
    const res = await request(app)
      .post('/api/restaurants')
      .set('Cookie', cookie)
      .send({ ...newRestaurant, isApproved: true, owner: '507f1f77bcf86cd799439011' });

    expect(res.status).toBe(201);
    expect(res.body.data.isApproved).toBe(false); // the body cannot approve itself
    expect(res.body.data.owner).toBe(user._id.toString()); // the owner comes from the session
    expect(res.body.data.cuisines).toEqual(['japanese', 'asian']);
  });

  it('requires login and the owner role', async () => {
    const { cookie } = await createUser('customer');
    expect((await request(app).post('/api/restaurants').send(newRestaurant)).status).toBe(401);
    expect(
      (await request(app).post('/api/restaurants').set('Cookie', cookie).send(newRestaurant)).status
    ).toBe(403);
  });

  it('validates the input', async () => {
    const { cookie } = await createUser('owner');
    const res = await request(app)
      .post('/api/restaurants')
      .set('Cookie', cookie)
      .send({ name: 'X', cuisines: 'italian', address: { line1: '' } });
    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'cuisines', 'address.city']));
  });

  it("lists the owner's own restaurants, including pending ones", async () => {
    const { user, cookie } = await createUser('owner');
    const { user: other } = await createUser('owner');
    await createRestaurant(user, { name: 'Mine', isApproved: false });
    await createRestaurant(other, { name: 'Not mine' });

    const res = await request(app).get('/api/restaurants/mine').set('Cookie', cookie);
    expect(res.body.data.map((r) => r.name)).toEqual(['Mine']);
  });

  it('lets an owner update their own restaurant, merging the address', async () => {
    const { user, cookie } = await createUser('owner');
    const r = await createRestaurant(user);
    const res = await request(app)
      .put(`/api/restaurants/${r._id}`)
      .set('Cookie', cookie)
      .send({ name: 'Renamed Kitchen', address: { city: 'Cork' }, isApproved: false });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Renamed Kitchen');
    expect(res.body.data.address).toMatchObject({ line1: '1 Main Street', city: 'Cork' });
    expect(res.body.data.isApproved).toBe(true); // isApproved ignored
  });

  it("blocks owners from editing someone else's restaurant, but allows admins", async () => {
    const { user: owner } = await createUser('owner');
    const { cookie: otherCookie } = await createUser('owner');
    const { cookie: adminCookie } = await createUser('admin');
    const r = await createRestaurant(owner);

    const other = await request(app)
      .put(`/api/restaurants/${r._id}`)
      .set('Cookie', otherCookie)
      .send({ name: 'Hijacked' });
    expect(other.status).toBe(403);

    const admin = await request(app)
      .put(`/api/restaurants/${r._id}`)
      .set('Cookie', adminCookie)
      .send({ name: 'Fixed by admin' });
    expect(admin.status).toBe(200);
  });

  it('deletes a restaurant together with its menu', async () => {
    const { user, cookie } = await createUser('owner');
    const r = await createRestaurant(user);
    await createMenuItem(r);

    const res = await request(app).delete(`/api/restaurants/${r._id}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(await Restaurant.countDocuments()).toBe(0);
    expect(await MenuItem.countDocuments()).toBe(0);
  });
});
