# Fortify API

Express + Prisma + PostgreSQL

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor com hot reload |
| `npm run seed` | Dados demo |
| `npx prisma migrate deploy` | Aplica a migration inicial |
| `npx prisma migrate dev` | Nova migration após alterar `schema.prisma` |
| `npx prisma studio` | UI do banco |

## Rotas

- `GET /health`
- `/api/auth/login`, `/api/auth/me`
- `/api/templates`, `/api/contracts`, `/api/signatures`
- `/api/obras`, `/api/purchase-orders`
- `/api/dashboard`, `/api/export/*`

## Env

Crie `api/.env` localmente (não versionado). Variáveis documentadas no [README da raiz](../README.md#variáveis-de-ambiente).

### Custos e ordens de compra

| Variável | Descrição |
|----------|-----------|
| `PO_APPROVAL_THRESHOLD` | Valor (R$) a partir do qual uma O.C. nasce `EMITIDA` e exige aprovação manual por `ADMIN` ou `SUPER_ADMIN`. Abaixo do limiar, a O.C. é criada já como `APROVADA`. Padrão: `5000`. |

**Categorias** (`GET /api/obras/cost-categories`):

| Código | O.C. obrigatória | Fluxo |
|--------|------------------|-------|
| `COMPRA_MATERIAL`, `CONTRATACAO_SERVICO`, `EQUIPAMENTO` | Sim | Emitir O.C. → aprovar (se valor alto) → receber → custo automático |
| `COMBUSTIVEL`, `PEDAGIO`, `DESPESA_ADMINISTRATIVA`, `REEMBOLSO_FUNCIONARIO` | Não | Custo direto via `POST /api/obras/:id/custos` (justificativa mín. 10 caracteres) |

O recebimento de O.C. (`POST /api/purchase-orders/:id/receive`) cria um `ObraCusto` vinculado (`purchaseOrderId`).
