const crypto = require('crypto');
const { Forbidden } = require('@feathersjs/errors');

function createCapability() {
  return crypto.randomBytes(32).toString('hex');
}

function hashCapability(capability) {
  return crypto.createHash('sha256').update(capability).digest('hex');
}

async function findByCapability(service, field, capability) {
  if (typeof capability !== 'string' || capability.length !== 64) {
    throw new Forbidden('Unauthorized');
  }

  const result = await service.find({ query: { [field]: hashCapability(capability) } });
  const matches = Array.isArray(result) ? result : result.data || [];

  if (matches.length !== 1) {
    throw new Forbidden('Unauthorized');
  }

  return matches[0];
}

module.exports = {
  createCapability,
  hashCapability,
  findByCapability
};