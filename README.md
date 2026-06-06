# Fortify — Contratos e gestão orçamentária

Sistema SaaS multi-tenant: contratos, assinatura eletrônica, obras e ordens de compra.

| Pacote | Stack |
|--------|-------|
| `web/` | React 19, Vite, Tailwind CSS v4, Zustand, TanStack Query |
| `api/` | Express 5, Prisma, PostgreSQL |
| `docs/brain/` | Vault Obsidian (PARA + Diátaxis) |

## Pré-requisitos

| Ferramenta | Versão mínima | Observação |
|------------|---------------|------------|
| Node.js | 20 LTS | `node -v` |
| npm | 10+ | Incluso com Node |
| Docker Desktop | latest | PostgreSQL local |
| Git | 2.x | Clone do repositório |

## Instalação e execução local

### 1. Clonar e instalar dependências

```powershell
git clone <url-do-repositorio> fortify
cd fortify
npm run setup
```

`npm run setup` instala dependências em `api/` e `web/`.

### 2. Configurar variáveis de ambiente

O runtime **não** usa `.env` na raiz. Crie um arquivo por pacote:

Crie os arquivos localmente (não versionados):

```powershell
New-Item -ItemType File -Path api\.env -Force
New-Item -ItemType File -Path web\.env -Force
```

Edite `api/.env` e defina pelo menos:

- `DATABASE_URL` e `DIRECT_URL` — conexão PostgreSQL
- `JWT_SECRET` — em produção use valor forte (`openssl rand -hex 32`)

Referência completa das variáveis na tabela [Variáveis de ambiente](#variáveis-de-ambiente) abaixo.

### 3. Subir o banco de dados

```powershell
npm run db:up
```

Aguarde o container `fortify-postgres` ficar saudável (porta `5432`).

Credenciais padrão do Docker Compose:

| Campo | Valor |
|-------|-------|
| Usuário | `fortify` |
| Senha | `fortify` |
| Banco | `fortify` |
| URL | `postgresql://fortify:fortify@localhost:5432/fortify` |

### 4. Migrations e seed

O schema está em **uma única migration** (`20250606000000_init`). Em instalação nova:

```powershell
cd api
npx prisma generate
npx prisma migrate deploy
npm run seed
cd ..
```

Se você já tinha o banco com migrations antigas, recrie o volume antes de aplicar:

```powershell
npm run db:reset
cd api
npx prisma migrate deploy
npm run seed
cd ..
```

Para alterar o schema depois: `npx prisma migrate dev --name descricao` (dentro de `api/`).

### 5. Executar API e frontend

**Opção A — um comando (raiz):**

```powershell
npm run dev
```

**Opção B — terminais separados:**

```powershell
# Terminal 1
npm run dev:api

# Terminal 2
npm run dev:web
```

### 6. Acessar a aplicação

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3001/api |
| Health check | http://localhost:3001/health |
| Prisma Studio | `cd api && npx prisma studio` |

### Credenciais demo (após `npm run seed`)

| Campo | Valor |
|-------|-------|
| E-mail | `admin@demo.fortify.local` |
| Senha | `demo123456` |

## Variáveis de ambiente

### API (`api/.env`)

| Variável | Obrigatória | Padrão / comportamento |
|----------|-------------|------------------------|
| `DATABASE_URL` | Sim | URL Prisma (pooler em produção) |
| `DIRECT_URL` | Sim | URL direta para migrations/seed |
| `JWT_SECRET` | Sim (prod) | `dev-secret` em dev se omitido |
| `JWT_ACCESS_EXPIRES_IN` | Não | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Não | `30d` |
| `JWT_EXPIRES_IN` | Não | Legado; fallback do access token |
| `API_PORT` | Não | `3001` |
| `NODE_ENV` | Não | `development`; `production` ativa cookies seguros |
| `WEB_URL` | Não | `http://localhost:5173` — links de assinatura e senha |
| `PUBLIC_API_URL` | Não | `http://localhost:3001/api` — links em e-mails |
| `API_PUBLIC_URL` | Não | Alias de `PUBLIC_API_URL` |
| `CORS_ORIGIN` | Não | `http://localhost:5173` (vírgula para várias origens) |
| `SMTP_HOST` | Não | Vazio = e-mail mock no console |
| `SMTP_PORT` | Não | `587` |
| `SMTP_SECURE` | Não | `false` |
| `SMTP_USER` / `SMTP_PASS` | Não | Credenciais SMTP |
| `SMTP_FROM` / `MAIL_FROM` | Não | Remetente dos e-mails |
| `WHATSAPP_MOCK` | Não | `true` — loga WhatsApp no console |
| `SIGNATURE_PDF_MOCK` | Não | `true` — PDF mock sem Playwright |
| `SIGNATURE_PDF_FIRST` | Não | `true` — fluxo PDF-first |
| `SIGNATURE_OTP_REQUIRED` | Não | `true` — OTP na assinatura pública |
| `UPLOAD_DIR` | Não | `./uploads` |
| `DPO_EMAIL` | Não | E-mail do encarregado LGPD |
| `LEGAL_TERMS_VERSION` | Não | Versão dos termos |
| `LEGAL_PRIVACY_VERSION` | Não | Versão da privacidade |
| `PO_APPROVAL_THRESHOLD` | Não | `5000` — limiar de aprovação de O.C. (R$) |

### Web (`web/.env`)

| Variável | Obrigatória | Padrão |
|----------|-------------|--------|
| `VITE_API_URL` | Não | `http://localhost:3001/api` |

> Variáveis `VITE_*` são embutidas no build do frontend. Reinicie `npm run dev` após alterá-las.

## Scripts úteis (raiz)

| Comando | Descrição |
|---------|-----------|
| `npm run setup` | `npm install` em `api/` e `web/` |
| `npm run db:up` | Sobe PostgreSQL (Docker) |
| `npm run db:down` | Para containers |
| `npm run db:reset` | Remove volume e recria banco |
| `npm run migrate` | `prisma migrate dev` na API |
| `npm run seed` | Dados demo |
| `npm run dev` | API + Web em paralelo |
| `npm run dev:api` | Só API |
| `npm run dev:web` | Só frontend |
| `npm run test` | Testes API + Web (Vitest) |
| `npm run test:api` | Testes da API |
| `npm run test:web` | Testes do frontend |

## Solução de problemas

**`prisma generate` falha com EPERM (Windows)**  
Pare o servidor da API (`Ctrl+C`) e rode novamente. O client Prisma não pode ser reescrito com o processo em execução.

**API não conecta ao banco**  
Confirme `docker compose ps`, que `DATABASE_URL` aponta para `localhost:5432` e que as migrations foram aplicadas.

**Frontend não alcança a API**  
Verifique `VITE_API_URL` em `web/.env` e `CORS_ORIGIN` em `api/.env` (deve incluir `http://localhost:5173`).

**E-mails / WhatsApp em desenvolvimento**  
Sem `SMTP_HOST`, os e-mails aparecem no console como `[MOCK EMAIL]`. Com `WHATSAPP_MOCK=true`, links de assinatura via WhatsApp também são logados.

**PDF de assinatura lento ou falha**  
Use `SIGNATURE_PDF_MOCK=true` localmente ou instale dependências do Playwright (`npx playwright install` em `api/`).
