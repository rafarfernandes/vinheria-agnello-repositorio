const assert = require('assert');
const { sign, verify } = require('./lib/jwt');
const S = 'segredo-teste';
const t = sign({ sub: 'pedidos-service', scope: 'catalogo:read estoque:write' }, S, 60);
assert.ok(verify(t, S).scope.includes('estoque:write'));
assert.throws(() => verify('abc.def', S), /malformado/);
const none = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url') + '.' + t.split('.')[1] + '.';
assert.throws(() => verify(none, S));
console.log('pedidos-service: 3 testes OK');
