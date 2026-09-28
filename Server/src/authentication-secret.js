const PLACEHOLDER_SECRET = 'REPLACE_WITH_A_GENERATED_SECRET';

function resolveAuthenticationSecret(configuredSecret, environment = process.env) {
  const secret = environment.NUAGES_AUTH_SECRET || configuredSecret;

  if (!secret || secret === PLACEHOLDER_SECRET) {
    throw new Error('Configure authentication.secret with setup.js or NUAGES_AUTH_SECRET before starting the server.');
  }

  return secret;
}

module.exports = {
  PLACEHOLDER_SECRET,
  resolveAuthenticationSecret
};