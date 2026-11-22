// pedidos-service — Recebe pedidos dos clientes da Vinheria Agnello.
// 1) O cliente faz login (POST /auth/login) e recebe um JWT de usuário.
// 2) Com esse JWT, cria um pedido (POST /pedidos).
// 3) O serviço emite um JWT de serviço (client credentials) e chama o catalogo-service
//    para consultar o vinho e reservar o estoque.
const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const { sign, requireScope } = require('./lib/jwt');

const SECRET = process.env.JWT_SECRET || 'troque-este-segredo';
const PORT = Number(process.env.PORT || 8081);
const CATALOGO_URL = process.env.CATALOGO_URL || 'http://localhost:8080';
const CA_FILE = process.env.CA_FILE; // CA interna da Vinheria (para confiar no certificado do catálogo)

// Usuário de demonstração. Em produção viria de um banco/IdP, com senha em hash (bcrypt/argon2).
const USUARIOS = { cliente: process.env.DEMO_PASSWORD || 'vinho123' };
const pedidos = [];
const autenticado = requireScope(SECRET, 'pedidos:write');

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve) => {
    let d = ''; req.on('data', (c) => (d += c));
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
  });
}

// Chamada ao catálogo com token de serviço.
function chamarCatalogo(method, path, body) {
  const token = sign({ sub: 'pedidos-service', scope: 'catalogo:read estoque:write' }, SECRET, 60);
  const url = new URL(path, CATALOGO_URL);
  const lib = url.protocol === 'https:' ? https : http;
  const opts = {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(url.protocol === 'https:' && CA_FILE ? { ca: fs.readFileSync(CA_FILE) } : {}),
  };
  return new Promise((resolve, reject) => {
    const r = lib.request(url, opts, (resp) => {
      let d = ''; resp.on('data', (c) => (d += c));
      resp.on('end', () => resolve({ status: resp.statusCode, body: JSON.parse(d || '{}') }));
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const log = (s) => console.log(`[pedidos] ${req.method} ${url.pathname} -> ${s}`);

  if (url.pathname === '/health') { log(200); return send(res, 200, { status: 'ok', servico: 'pedidos-service', host: os.hostname(), catalogo: CATALOGO_URL }); }

  if (req.method === 'POST' && url.pathname === '/auth/login') {
    const { usuario, senha } = await readBody(req);
    if (!USUARIOS[usuario] || USUARIOS[usuario] !== senha) { log(401); return send(res, 401, { erro: 'credenciais inválidas' }); }
    log(200); return send(res, 200, { access_token: sign({ sub: usuario, scope: 'pedidos:write' }, SECRET, 900), token_type: 'Bearer', expires_in: 900 });
  }

  if (req.method === 'POST' && url.pathname === '/pedidos') {
    const a = autenticado(req); if (!a.ok) { log(a.status); return send(res, a.status, { erro: a.error }); }
    const { vinhoId, quantidade } = await readBody(req);
    try {
      const vinho = await chamarCatalogo('GET', `/vinhos/${vinhoId}`);
      if (vinho.status !== 200) { log(vinho.status); return send(res, vinho.status, vinho.body); }
      const reserva = await chamarCatalogo('POST', '/estoque/reservar', { vinhoId, quantidade });
      if (reserva.status !== 200) { log(reserva.status); return send(res, reserva.status, reserva.body); }
      const pedido = { id: pedidos.length + 1, cliente: a.claims.sub, vinho: vinho.body.nome, quantidade,
        total: +(vinho.body.preco * quantidade).toFixed(2), estoqueRestante: reserva.body.estoqueRestante };
      pedidos.push(pedido);
      log(201); return send(res, 201, pedido);
    } catch (e) {
      log(502); return send(res, 502, { erro: `falha ao falar com o catálogo: ${e.message}` });
    }
  }

  log(404); send(res, 404, { erro: 'rota não encontrada' });
}

if (require.main === module) {
  http.createServer(handler).listen(PORT, () => console.log(`[pedidos] ouvindo na porta ${PORT} (catálogo em ${CATALOGO_URL})`));
}
module.exports = { handler };
