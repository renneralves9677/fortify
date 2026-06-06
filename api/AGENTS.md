# AGENTS.md — Fortify API

Regras imperativas para agentes de IA que editam `api/`. Leia antes de qualquer alteração.

## Stack

Express 5 + TypeScript strict + Prisma ORM + Vitest + Zod

## Estrutura (sempre)

```
modules/{nome}/{nome}.routes.ts
  → .controller.ts
  → .service.ts
  → .repository.ts
  → .schema.ts
```

- **Prisma ORM** só em `*.repository.ts`, `core/database/prisma.ts`, `middleware/audit.ts` e `prisma/seed.ts`
- Regras puras em `src/domain/` (sem Prisma, sem Express)
- Infra compartilhada em `src/core/` (erros, jwt, asyncHandler)

## Code style (AkitaOnRails adaptado)

- Funções curtas (4–40 linhas); arquivos **< 300 linhas**
- SRP: uma responsabilidade por arquivo de camada
- Nomes grepáveis: `ContractsRepository.findByIdForCompany`, não `data` / `handler` / `Manager`
- Tipos explícitos; **proibido `any`**
- Early return; indentação máx. 2 níveis
- DI: injetar `repository` no `service`, `service` no `controller` (constructor)
- JSDoc/comentários **WHY** em regras não óbvias; não apagar comentários do agente

## Erros

- Lançar `AppError` com mensagem pt-BR; **nunca** expor mensagem Prisma/Postgres
- Services envolvem chamadas ORM com `withPrismaError()` ou checam `null` antes de update
- Controllers usam `parseBody` / `parseQuery` / `parseParams` (zod-mapper); **não** `res.status().json({ error })`
- Params UUID: schemas em `shared/params.ts` (`idParamSchema`, `contractIdParamSchema`, …)
- Resposta JSON: `{ error, code, details? }`

## Testes

- `npm test` (api) — deve passar antes de commit
- Mock: classes `FakeXRepository implements XRepositoryPort`, não `as never`
- Ports: `*.repository.port.ts` com `Pick<Repository, 'method' | …>`; service depende do port
- Nova função de service → teste unitário
- Testes de `prisma-mapper` e `zod-mapper` obrigatórios ao alterar erros

## Comandos

```bash
npm run dev          # api watch
npm test             # vitest
npm run build        # tsc
npx prisma migrate dev
```

## Módulos LGPD

- `modules/legal/` — `GET /api/legal/versions` (público)
- `modules/privacy/` — `GET /api/privacy/me`, `/config`, `/export`
- Consentimento: `UserConsent` + `POST /api/auth/consent`
- Config: `DPO_EMAIL`, `LEGAL_TERMS_VERSION`, `LEGAL_PRIVACY_VERSION`

## Wiring por módulo

```ts
const repo = new XRepository();
const service = new XService(repo);
const controller = new XController(service);
router.get('/', asyncHandler((req, res) => controller.list(req, res)));
```

## Verificação automática

```bash
npm run lint:arch   # camadas, tamanho de arquivo, erros em controllers
```

Rodar antes de commit. O script usa **allowlist temporária** em `scripts/lint-architecture.ts` — remover entradas ao corrigir cada violação.

### Checklist de PR

- [ ] `npm test` e `npm run lint:arch` verdes
- [ ] Nenhum `prisma` novo em `*.service.ts` ou `domain/`
- [ ] Arquivos novos < 300 linhas
- [ ] Controllers: `parseBody` / `parseQuery` / `parseParams`; erros via `AppError`
- [ ] Service test com `FakeXRepository` se alterou regra de negócio

### Allowlist conhecida (em migração)

| Arquivo | Motivo |
|---------|--------|
| `signatures.repository.ts` | > 300 linhas — candidato a split futuro |
| `contracts.service.ts`, `templates.service.ts`, `auth.service.ts` | > 300 linhas — candidato a split |
| `domain/obras/obra-report-images.ts` | Prisma no domain — extrair para repository |

### Sub-services (exemplos)

Monólitos divididos por caso de uso; fachada fina delega:

```
modules/signatures/
  signatures.service.ts          # fachada
  signatures-queue.service.ts
  signatures-flow.service.ts
  signatures-public-read.service.ts
  signatures-public-action.service.ts
  signatures-documents.service.ts
  signatures-shared.ts

modules/obras/
  obras.service.ts               # fachada + listagem/relatório
  obra-steps.service.ts
  obra-custos.service.ts
  obra-vistorias.service.ts
  obra-close.service.ts
  obras-shared.ts
```
