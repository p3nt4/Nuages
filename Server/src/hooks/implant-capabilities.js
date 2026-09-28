const crypto = require('crypto');
const { Forbidden } = require('@feathersjs/errors');

function createCapability() {
  return crypto.randomBytes(32).toString('hex');
}

function hashCapability(capability) {
  return crypto.createHash('sha256').update(capability).digest('hex');
}

function ensurePipeCapabilityCache(app) {
  if (!app.pipe_capability_map) {
    app.pipe_capability_map = Object.create(null);
    app.pipe_capability_hashes = Object.create(null);
  }
}

function registerPipeCapability(app, pipeId, capabilityHash) {
  ensurePipeCapabilityCache(app);
  app.pipe_capability_map[capabilityHash] = pipeId;
  app.pipe_capability_hashes[pipeId] = capabilityHash;
}

function resolvePipeCapability(app, capability) {
  if (typeof capability !== 'string' || !/^[a-f0-9]{64}$/.test(capability)) {
    throw new Forbidden('Unauthorized');
  }

  ensurePipeCapabilityCache(app);
  const pipeId = app.pipe_capability_map[hashCapability(capability)];
  if (!pipeId) {
    throw new Forbidden('Unauthorized');
  }

  return pipeId;
}

function unregisterPipeCapability(app, pipeId) {
  if (!app.pipe_capability_hashes) {
    return;
  }

  const capabilityHash = app.pipe_capability_hashes[pipeId];
  if (capabilityHash) {
    delete app.pipe_capability_map[capabilityHash];
    delete app.pipe_capability_hashes[pipeId];
  }
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
  findByCapability,
  registerPipeCapability,
  resolvePipeCapability,
  unregisterPipeCapability
};