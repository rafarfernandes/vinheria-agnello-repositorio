# Vinheria Agnello — Fase 7 (Infraestrutura, DevOps e DevSecOps)

Dois microsserviços da Vinheria Agnello, com rede simulada (DHCP + DNS), pipeline Jenkins e comunicação segura.

| Serviço | Porta | Função |
|---|---|---|
| `catalogo-service` | 8443 (HTTPS) / 8080 (HTTP, só demo) | Catálogo de vinhos e reserva de estoque |
| `pedidos-service` | 8081 | Login do cliente (JWT) e criação de pedidos; chama o catálogo com JWT de serviço |

## Estrutura
```
services/        código dos microsserviços (Node.js, sem dependências externas)
infra/           dnsmasq.conf (DHCP/DNS), simular-rede.sh, gerar-certificados.sh
scripts/         deploy.sh, smoke-test.sh, check-secrets.sh, subir-servicos.sh
ci/              run-pipeline-local.sh (mesmos estágios do Jenkinsfile)
Jenkinsfile      pipeline de build e deploy
docker-compose.yml  mesmo ambiente em containers Docker
```

## Como rodar
**Rede simulada (Linux):**
```bash
sudo infra/simular-rede.sh up            # bridge + dnsmasq + 3 namespaces recebendo IP por DHCP
infra/gerar-certificados.sh              # CA interna + certificado do catálogo
echo "JWT_SECRET=$(openssl rand -hex 32)" > /tmp/vinheria.env
sudo scripts/subir-servicos.sh https     # ou "http" para a demonstração insegura
```

**Docker:**
```bash
infra/gerar-certificados.sh
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
docker compose up --build
```

**Jenkins:** crie um job *Pipeline* → *Pipeline script from SCM* → aponte para este repositório (branch `main`, script `Jenkinsfile`).
