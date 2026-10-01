const assert = require('assert');
const requireAdmin = require('../../src/hooks/require-admin');
const { INTERNAL_AUTHENTICATION_LOOKUP } = require('../../src/authentication-lookup');

describe('requireAdmin hook', () => {
  it('allows an administrator', async () => {
    const context = { params: { provider: 'socketio', user: { isAdmin: true } } };
    const result = await requireAdmin()(context);

    assert.strictEqual(result, context);
  });

  it('rejects a non-administrator', async () => {
    const context = { params: { provider: 'socketio', user: { isAdmin: false } } };

    await assert.rejects(() => requireAdmin()(context), /Administrator access is required/);
  });

  it('allows internal authentication lookups', async () => {
    const context = { params: { provider: 'socketio', [INTERNAL_AUTHENTICATION_LOOKUP]: true } };
    const result = await requireAdmin()(context);

    assert.strictEqual(result, context);
  });
});