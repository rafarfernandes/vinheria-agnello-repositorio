// Implementação mínima de JWT (HS256) usando apenas o módulo crypto do Node.
// Usada pelos dois microsserviços para emitir e validar tokens.
const crypto = require('crypto');

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function sign(payload, secret, expiresInSec = 300) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSec };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(body))}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verify(token, secret) {
  const parts = (token || '').split('.');
  if (parts.length !== 3) throw new Error('token malformado');
  const [h, p, s] = parts;
  const header = JSON.parse(Buffer.from(h, 'base64url').toString());
  if (header.alg !== 'HS256') throw new Error('algoritmo não permitido');
  const expected = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest();
  const given = Buffer.from(s, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    throw new Error('assinatura inválida');
  }
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('token expirado');
  return payload;
}

// Middleware: exige "Authorization: Bearer <jwt>" com o escopo informado.
function requireScope(secret, scope) {
  return (req, res) => {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return { ok: false, status: 401, error: 'token ausente' };
    try {
      const claims = verify(token, secret);
      const scopes = (claims.scope || '').split(' ');
      if (scope && !scopes.includes(scope)) return { ok: false, status: 403, error: `escopo ${scope} necessário` };
      return { ok: true, claims };
    } catch (e) {
      return { ok: false, status: 401, error: e.message };
    }
  };
}

module.exports = { sign, verify, requireScope };
