const request = require('supertest');
const app = require('../src/app');
const { createUser, createRestaurant } = require('./helpers');

describe('Admin tools', () => {
  let admin;
  let adminCookie;
  let owner;

  beforeEach(async () => {
    ({ user: admin, cookie: adminCookie } = await createUser('admin'));
    ({ user: owner } = await createUser('owner'));
  });

  it('is for admins only', async () => {
    const { cookie: ownerCookie } = await createUser('owner');
    expect((await request(app).get('/api/admin/users')).status).toBe(401);
    expect((await request(app).get('/api/admin/users').set('Cookie', ownerCookie)).status).toBe(
      403
    );
  });

  it('shows the approval queue and approving makes a restaurant public', async () => {
    const pending = await createRestaurant(owner, { name: 'Waiting', isApproved: false });
    await createRestaurant(owner, { name: 'Live' });

    const queue = await request(app)
      .get('/api/admin/restaurants?approved=false')
      .set('Cookie', adminCookie);
    expect(queue.body.data.map((r) => r.name)).toEqual(['Waiting']);
    expect(queue.body.data[0].owner.email).toBe(owner.email);

    const approve = await request(app)
      .patch(`/api/admin/restaurants/${pending._id}/approval`)
      .set('Cookie', adminCookie)
      .send({ isApproved: true });
    expect(approve.status).toBe(200);

    const publicList = await request(app).get('/api/restaurants');
    expect(publicList.body.data.map((r) => r.name).sort()).toEqual(['Live', 'Waiting']);
  });

  it('lists users without ever exposing passwords', async () => {
    const res = await request(app).get('/api/admin/users?role=owner').set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].password).toBeUndefined();
  });

  it('suspends a user, who is then logged out', async () => {
    const { user: customer, cookie: customerCookie } = await createUser('customer');
    const suspend = await request(app)
      .patch(`/api/admin/users/${customer._id}/status`)
      .set('Cookie', adminCookie)
      .send({ isActive: false });
    expect(suspend.status).toBe(200);
    expect(suspend.body.data.isActive).toBe(false);

    const me = await request(app).get('/api/auth/me').set('Cookie', customerCookie);
    expect(me.status).toBe(401);
  });

  it('stops an admin suspending their own account', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${admin._id}/status`)
      .set('Cookie', adminCookie)
      .send({ isActive: false });
    expect(res.status).toBe(400);
  });
});
