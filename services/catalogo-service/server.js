// catalogo-service — Catálogo de vinhos e controle de estoque da Vinheria Agnello.
// Expõe HTTP (porta 8080, apenas para a demonstração sem segurança) e HTTPS (porta 8443).
const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const { requireScope } = require('./lib/jwt');

const SECRET = process.env.JWT_SECRET || 'troque-este-segredo';
const PORT = Number(process.env.PORT || 8080);
const TLS_PORT = Number(process.env.TLS_PORT || 8443);

const vinhos = [
  { id: 1, nome: 'Agnello Reserva Cabernet Sauvignon', safra: 2019, pais: 'Chile', preco: 189.9, estoque: 24 },
  { id: 2, nome: 'Brunello di Montalcino', safra: 2017, pais: 'Itália', preco: 459.0, estoque: 8 },
  { id: 3, nome: 'Malbec Gran Reserva', safra: 2020, pais: 'Argentina', preco: 149.5, estoque: 40 },
  { id: 4, nome: 'Vinho Verde Alvarinho', safra: 2022, pais: 'Portugal', preco: 99.9, estoque: 15 },
];

const leitura = requireScope(SECRET, 'catalogo:read');
const escrita = requireScope(SECRET, 'estoque:write');

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } });
  });
}

async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const log = (s) => console.log(`[catalogo] ${req.method} ${url.pathname} -> ${s}`);

  if (url.pathname === '/health') { log(200); return send(res, 200, { status: 'ok', servico: 'catalogo-service', host: os.hostname() }); }

  if (req.method === 'GET' && url.pathname === '/vinhos') {
    const a = leitura(req); if (!a.ok) { log(a.status); return send(res, a.status, { erro: a.error }); }
    log(200); return send(res, 200, vinhos);
  }

  const m = url.pathname.match(/^\/vinhos\/(\d+)$/);
  if (req.method === 'GET' && m) {
    const a = leitura(req); if (!a.ok) { log(a.status); return send(res, a.status, { erro: a.error }); }
    const v = vinhos.find((x) => x.id === Number(m[1]));
    log(v ? 200 : 404); return v ? send(res, 200, v) : send(res, 404, { erro: 'vinho não encontrado' });
  }

  if (req.method === 'POST' && url.pathname === '/estoque/reservar') {
    const a = escrita(req); if (!a.ok) { log(a.status); return send(res, a.status, { erro: a.error }); }
    const { vinhoId, quantidade } = await readBody(req);
    const v = vinhos.find((x) => x.id === Number(vinhoId));
    if (!v) { log(404); return send(res, 404, { erro: 'vinho não encontrado' }); }
    if (!(quantidade > 0) || v.estoque < quantidade) { log(409); return send(res, 409, { erro: 'estoque insuficiente' }); }
    v.estoque -= quantidade;
    log(200); return send(res, 200, { reservado: quantidade, estoqueRestante: v.estoque, solicitadoPor: a.claims.sub });
  }

  log(404); send(res, 404, { erro: 'rota não encontrada' });
}

if (require.main === module) {
  // Em produção a porta HTTP fica desligada (DISABLE_HTTP=true): só HTTPS é aceito.
  if (process.env.DISABLE_HTTP !== 'true') {
    http.createServer(handler).listen(PORT, () => console.log(`[catalogo] HTTP  ouvindo na porta ${PORT} (INSEGURO - só demonstração)`));
  }
  if (process.env.TLS_CERT && process.env.TLS_KEY) {
    https.createServer({ cert: fs.readFileSync(process.env.TLS_CERT), key: fs.readFileSync(process.env.TLS_KEY) }, handler)
      .listen(TLS_PORT, () => console.log(`[catalogo] HTTPS ouvindo na porta ${TLS_PORT}`));
  }
}

module.exports = { handler };
