const request = require('supertest');
const app = require('../src/app');
const MenuItem = require('../src/models/MenuItem');
const { createUser, createRestaurant, createMenuItem } = require('./helpers');

describe('Menu management', () => {
  let owner;
  let ownerCookie;
  let restaurant;

  beforeEach(async () => {
    ({ user: owner, cookie: ownerCookie } = await createUser('owner'));
    restaurant = await createRestaurant(owner);
  });

  it('lets the owner add a dish', async () => {
    const res = await request(app)
      .post(`/api/restaurants/${restaurant._id}/menu`)
      .set('Cookie', ownerCookie)
      .send({ name: 'Diavola', priceCents: 1450, category: 'Pizza', dietary: ['spicy'] });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Diavola', priceCents: 1450, dietary: ['spicy'] });
    expect(res.body.data.restaurant).toBe(restaurant._id.toString());
  });

  it('rejects prices that are not whole cents and unknown dietary tags', async () => {
    const res = await request(app)
      .post(`/api/restaurants/${restaurant._id}/menu`)
      .set('Cookie', ownerCookie)
      .send({ name: 'Soup', priceCents: 9.99, dietary: ['keto'] });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toEqual(
      expect.arrayContaining(['priceCents', 'dietary[0]'])
    );
  });

  it('blocks customers and other owners', async () => {
    const { cookie: customerCookie } = await createUser('customer');
    const { cookie: otherOwnerCookie } = await createUser('owner');
    const dish = { name: 'Sneaky dish', priceCents: 100 };

    const asCustomer = await request(app)
      .post(`/api/restaurants/${restaurant._id}/menu`)
      .set('Cookie', customerCookie)
      .send(dish);
    const asOtherOwner = await request(app)
      .post(`/api/restaurants/${restaurant._id}/menu`)
      .set('Cookie', otherOwnerCookie)
      .send(dish);

    expect(asCustomer.status).toBe(403);
    expect(asOtherOwner.status).toBe(403);
    expect(await MenuItem.countDocuments()).toBe(0);
  });

  it('shows the owner every dish, including unavailable ones', async () => {
    await createMenuItem(restaurant, { name: 'Available' });
    await createMenuItem(restaurant, { name: 'Hidden', isAvailable: false });
    const res = await request(app)
      .get(`/api/restaurants/${restaurant._id}/menu`)
      .set('Cookie', ownerCookie);
    expect(res.body.data).toHaveLength(2);
  });

  it('lets the owner edit and delete a dish', async () => {
    const item = await createMenuItem(restaurant);

    const edit = await request(app)
      .put(`/api/menu/${item._id}`)
      .set('Cookie', ownerCookie)
      .send({ priceCents: 1300, isAvailable: false });
    expect(edit.status).toBe(200);
    expect(edit.body.data).toMatchObject({
      priceCents: 1300,
      isAvailable: false,
      name: 'Margherita',
    });

    const del = await request(app).delete(`/api/menu/${item._id}`).set('Cookie', ownerCookie);
    expect(del.status).toBe(200);
    expect(await MenuItem.countDocuments()).toBe(0);
  });

  it('returns 404 for a dish that does not exist', async () => {
    const res = await request(app)
      .put('/api/menu/507f1f77bcf86cd799439011')
      .set('Cookie', ownerCookie)
      .send({ priceCents: 100 });
    expect(res.status).toBe(404);
  });
});
