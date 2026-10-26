const { authorize } = require('../../src/middleware/roles');

const run = (middleware, user) => {
  const next = jest.fn();
  middleware({ user }, {}, next);
  return next.mock.calls[0][0]; // the error passed to next(), or undefined
};

describe('authorize() role middleware', () => {
  const ownerOrAdmin = authorize('owner', 'admin');

  it('lets allowed roles through', () => {
    expect(run(ownerOrAdmin, { role: 'owner' })).toBeUndefined();
    expect(run(ownerOrAdmin, { role: 'admin' })).toBeUndefined();
  });

  it('returns 403 for other roles', () => {
    expect(run(ownerOrAdmin, { role: 'customer' })).toMatchObject({ statusCode: 403 });
  });

  it('returns 401 when nobody is logged in', () => {
    expect(run(ownerOrAdmin, undefined)).toMatchObject({ statusCode: 401 });
  });
});
