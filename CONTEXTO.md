# S.O.L — Contexto do Projeto

## O que foi feito

### Backend (Node.js + Express)
- API REST completa com autenticação JWT
- Controllers: auth, cargas, motoristas, clientes, usuários, dashboard
- Regras de negócio: usuário `operacional` só vê suas cargas, `admin` vê tudo
- Cargas só deletáveis com status `cancelado`
- Número de carga gerado automaticamente: `CTE-{ANO}-{SEQ}`
- Campo `frete_liquido` adicionado manualmente (coluna criada via ALTER TABLE no Supabase)
- Comparação de `perfil` no controller de cargas agora é case-insensitive (`.toLowerCase()`)
- SELECT explícito em `motoristasController.listar` para garantir retorno de `placa_carreta2`
- `motoristasController` aceita e persiste campo `placa_carreta2` (criar e atualizar)

### Frontend (React + Vite)
- Login com autenticação JWT persistida no localStorage
- Dashboard com KPIs, sparklines, donut de status e ranking de motoristas/clientes/operacionais
  - KPIs: Frete Cobrado, Frete Líquido (só concluídas), Margem (só concluídas), Cargas Ativas
  - Donut de status na linha de KPIs
  - Top Clientes, Top Operacionais e Top Motoristas em grid de 3 colunas
- Kanban de cargas com drag-and-drop, troca de status e collapse de colunas (estado salvo no localStorage)
- Botão de editar card → abre modal preenchido com dados da carga
- Modal de detalhe com abas: Info, CTE, Financeiro, Ocorrências
  - Admin pode atribuir operacional responsável pela carga
- Histórico de cargas concluídas/canceladas com tabela e filtros
- Cadastro de motoristas com:
  - Nomenclatura "Cavalo" substituída por "Veículo" em todos os labels
  - Campo dinâmico "Placa da Carreta 2" (aparece apenas para Bitrem e Rodotrem)
  - Exibição de `placa_carreta2` no modal de visualização quando preenchido
- Cadastro de clientes e usuários
- Formatação de telefones no padrão brasileiro: `(XX) XXXXX-XXXX` / `(XX) XXXX-XXXX` via `fmtTel()` em `constants/index.js`
- Tema claro/dark, sidebar recolhível
  - Botão de toggle reposicionado para acima do card de perfil (rodapé da sidebar)
  - Logo S.O.L centralizado corretamente com os ícones de nav quando sidebar recolhida
- `frete_liquido` é campo manual (não calculado automaticamente)
- Timing fix no AuthContext: `useEffect` nas páginas Cargas e Histórico depende de `authCarregando`

### Banco de dados (Supabase)
- Tabelas criadas: `usuarios`, `motoristas`, `clientes`, `cargas`
- Schema em `database/schema.sql`
- Colunas extras criadas manualmente:
  - `ALTER TABLE cargas ADD COLUMN frete_liquido DECIMAL(10,2)`
  - `ALTER TABLE motoristas ADD COLUMN placa_carreta2 TEXT`
- Usuário admin criado via `backend/setup.js`
  - Email: `admin@sol-sistema.com`
  - Senha: `Admin@123`

### Infraestrutura
- Repositório: https://github.com/Trw-Logistica/sol-sistema
- Frontend deployado no **Vercel** (Root Directory: `frontend`)
- Backend deployado no **Railway**
- `frontend/.env.production` aponta para `https://sol-sistema-production.up.railway.app/api`

---

## Onde paramos

Build local (`npm run build`) passou sem erros — 102 módulos, sem warnings.
Commit vazio enviado para forçar redeploy no Vercel.
**Verificar se o Vercel concluiu o deploy sem 404.**

---

## Próximos passos

1. **Confirmar deploy Vercel** — acessar a URL do Vercel e verificar se a aplicação carrega sem erros 404 ou de build.
2. **Verificar variáveis de ambiente no Railway** (se o backend ainda não estiver estável):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `JWT_SECRET`
   - `PORT=3001`
   - `FRONTEND_URL=<URL do Vercel>`
3. **Testar login em produção** após ambiente estabilizar.
4. **Trocar a senha do admin** após o primeiro login bem-sucedido.
