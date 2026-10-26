const mongoose = require('mongoose');
const { User, MenuItem, Order } = require('../../src/models');

describe('User model', () => {
  it('hashes the password on save and never returns it in JSON', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'Test@Example.com',
      password: 'Secret123',
    });
    const stored = await User.findById(user._id).select('+password');

    expect(stored.email).toBe('test@example.com');
    expect(stored.password).not.toBe('Secret123');
    expect(stored.password).toMatch(/^\$2[aby]\$/); // bcrypt hash format
    expect(await stored.comparePassword('Secret123')).toBe(true);
    expect(await stored.comparePassword('wrong')).toBe(false);
    expect(user.toJSON().password).toBeUndefined();
  });

  it('rejects a duplicate email', async () => {
    await User.create({ name: 'First', email: 'dup@example.com', password: 'Secret123' });
    await expect(
      User.create({ name: 'Second', email: 'dup@example.com', password: 'Secret123' })
    ).rejects.toMatchObject({ code: 11000 });
  });
});

describe('MenuItem model', () => {
  it('only accepts whole, non-negative cents', async () => {
    const restaurant = new mongoose.Types.ObjectId();
    await expect(MenuItem.create({ restaurant, name: 'Soup', priceCents: 9.99 })).rejects.toThrow(
      /whole number/
    );
    await expect(MenuItem.create({ restaurant, name: 'Soup', priceCents: -1 })).rejects.toThrow(
      /negative/
    );
    await expect(
      MenuItem.create({ restaurant, name: 'Soup', priceCents: 999 })
    ).resolves.toBeDefined();
  });
});

describe('Order status rules', () => {
  const order = (status) => new Order({ status });

  it('allows only the next step in the lifecycle', () => {
    expect(order('placed').canTransitionTo('preparing')).toBe(true);
    expect(order('placed').canTransitionTo('cancelled')).toBe(true);
    expect(order('preparing').canTransitionTo('out_for_delivery')).toBe(true);
    expect(order('out_for_delivery').canTransitionTo('delivered')).toBe(true);
  });

  it('blocks skipping steps or reopening finished orders', () => {
    expect(order('placed').canTransitionTo('delivered')).toBe(false);
    expect(order('preparing').canTransitionTo('cancelled')).toBe(false);
    expect(order('delivered').canTransitionTo('placed')).toBe(false);
    expect(order('cancelled').canTransitionTo('preparing')).toBe(false);
  });
});
