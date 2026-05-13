# S.O.L — Contexto do Projeto

## O que foi feito

### Backend (Node.js + Express)
- API REST completa com autenticação JWT
- Controllers: auth, cargas, motoristas, clientes, usuários, dashboard
- Regras de negócio: usuário `operacional` só vê suas cargas, `admin` vê tudo
- Cargas só deletáveis com status `cancelado`
- Número de carga gerado automaticamente: `CTE-{ANO}-{SEQ}`
- Campo `frete_liquido` adicionado manualmente (coluna criada via ALTER TABLE no Supabase)

### Frontend (React + Vite)
- Login com autenticação JWT persistida no localStorage
- Dashboard com KPIs, sparklines, donut de status e ranking de motoristas
- Kanban de cargas com drag-and-drop e troca de status
- Botão de editar card → abre modal preenchido com dados da carga
- Modal de detalhe com abas: Info, CTE, Financeiro, Ocorrências
- Histórico de cargas concluídas/canceladas com tabela e filtros
- Cadastro de motoristas, clientes e usuários
- Tema claro/dark, sidebar recolhível
- `frete_liquido` é campo manual (não calculado automaticamente)

### Banco de dados (Supabase)
- Tabelas criadas: `usuarios`, `motoristas`, `clientes`, `cargas`
- Schema em `database/schema.sql`
- Coluna extra criada manualmente: `ALTER TABLE cargas ADD COLUMN frete_liquido DECIMAL(10,2)`
- Usuário admin criado via `backend/setup.js`
  - Email: `admin@sol-sistema.com`
  - Senha: `Admin@123`

### Infraestrutura
- Repositório: https://github.com/Trw-Logistica/sol-sistema
- Frontend deployado no **Vercel** (Root Directory: `frontend`)
- Backend deployado no **Railway** (em andamento)
- `frontend/.env.production` aponta para `https://sol-sistema-production.up.railway.app/api`

---

## Onde paramos

Deploy do backend no Railway com erro **502 Bad Gateway** — o servidor está crashando na inicialização.

---

## Problema atual

O Railway não tem as variáveis de ambiente configuradas. O arquivo `.env` é ignorado pelo git (`.gitignore`), então o Railway sobe o servidor sem as credenciais. O `supabase.js` lança um erro imediatamente:

```
throw new Error('SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios no .env')
```

---

## Próximos passos

1. **Resolver o Railway** — adicionar as variáveis na aba *Variables* do projeto:
   - `SUPABASE_URL=https://dbfmanomdgyanxbaqweg.supabase.co`
   - `SUPABASE_SERVICE_KEY=<service role key>`
   - `JWT_SECRET=sol-sistema-jwt-secret-2025-trw-logistica`
   - `PORT=3001`

2. **Verificar CORS em produção** — o `app.js` limita a origem ao `FRONTEND_URL`. Adicionar também no Railway:
   - `FRONTEND_URL=<URL do Vercel>`

3. **Testar login em produção** após o Railway estabilizar.

4. **Trocar a senha do admin** após o primeiro login bem-sucedido.
