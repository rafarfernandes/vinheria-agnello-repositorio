// Testes unitários simples (sem dependências): JWT e regras de acesso do catálogo.
const assert = require('assert');
const { sign, verify } = require('./lib/jwt');
const S = 'segredo-teste';
const t = sign({ sub: 'x', scope: 'catalogo:read' }, S, 60);
assert.strictEqual(verify(t, S).sub, 'x');
assert.throws(() => verify(t, 'outro-segredo'), /assinatura inválida/);
const adulterado = t.split('.'); adulterado[1] = Buffer.from(JSON.stringify({ sub: 'admin', scope: 'estoque:write' })).toString('base64url');
assert.throws(() => verify(adulterado.join('.'), S), /assinatura inválida/);
assert.throws(() => verify(sign({ sub: 'x' }, S, -1), S), /expirado/);
console.log('catalogo-service: 4 testes OK');
