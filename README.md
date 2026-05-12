# S.O.L - Super Operador Logístico

Sistema de gestão logística completo com backend Node.js/Express e frontend React.

---

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)

---

## 1. Configurar o Banco de Dados (Supabase)

1. Crie um novo projeto no Supabase
2. Acesse **SQL Editor**
3. Execute o arquivo `database/schema.sql` completo
4. Em **Project Settings > API**, copie:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` secret → `SUPABASE_SERVICE_KEY`

> **ATENÇÃO:** Use sempre a `service_role` key no backend (nunca a `anon` key). Desabilite o RLS nas tabelas ou configure as policies adequadamente.

---

## 2. Backend

```bash
cd backend
cp .env.example .env
# Edite o .env com suas credenciais
npm install
npm run dev
```

O servidor sobe em `http://localhost:3001`.

### Variáveis de ambiente (`.env`)

| Variável | Descrição |
|---|---|
| `PORT` | Porta do servidor (padrão: 3001) |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_KEY` | Service Role Key do Supabase |
| `JWT_SECRET` | String aleatória longa para assinar tokens |
| `FRONTEND_URL` | URL do frontend para CORS |

---

## 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

O app sobe em `http://localhost:5173`.

---

## 4. Login inicial

Após executar o schema, use as credenciais padrão:

- **Email:** `admin@sol-sistema.com`
- **Senha:** `Admin@123`

> Troque a senha imediatamente após o primeiro login.

---

## Estrutura do Projeto

```
sol-sistema/
├── backend/
│   ├── src/
│   │   ├── config/        # Conexão Supabase
│   │   ├── controllers/   # Lógica de negócio
│   │   ├── middleware/    # Auth JWT + Admin
│   │   └── routes/        # Definição de rotas
│   ├── server.js
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── contexts/      # AuthContext
│   │   ├── pages/         # Páginas da aplicação
│   │   └── services/      # Axios + chamadas API
│   └── vite.config.js
├── database/
│   └── schema.sql         # DDL completo para Supabase
└── README.md
```

---

## API — Referência rápida

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/auth/login` | Público | Login |
| GET | `/api/auth/me` | JWT | Usuário logado |
| GET | `/api/cargas` | JWT | Listar cargas |
| POST | `/api/cargas` | JWT | Criar carga |
| PATCH | `/api/cargas/:id/status` | JWT | Atualizar status |
| POST | `/api/cargas/:id/ocorrencia` | JWT | Registrar ocorrência |
| GET | `/api/dashboard/resumo` | Admin | KPIs |
| GET | `/api/dashboard/ranking` | Admin | Ranking motoristas |

---

## Deploy

**Backend (Railway / Render / Fly.io):**
1. Configure as variáveis de ambiente na plataforma
2. Comando de start: `npm start`

**Frontend (Vercel / Netlify):**
1. Build: `npm run build`
2. Diretório de saída: `dist`
3. Configure `VITE_API_URL` se o backend estiver em domínio diferente (ajuste `api.js`)
