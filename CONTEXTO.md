# S.O.L — Contexto do Projeto

## Informações do Projeto

| Item | Valor |
|------|-------|
| Repositório | https://github.com/Trw-Logistica/sol-sistema |
| Frontend | https://sol-sistema.vercel.app |
| Backend | https://sol-sistema-production.up.railway.app |
| Stack | React + Vite (Vercel) · Node.js Express (Railway) · Supabase (PostgreSQL) |
| Auth | JWT + bcryptjs · token 8h · localStorage |

---

## Credenciais de acesso (produção)

- **Admin padrão:** `admin@sol-sistema.com` / `Admin@123` ← trocar após primeiro login

---

## Estrutura de pastas

```
sol-sistema/
├── backend/
│   └── src/
│       ├── controllers/   authController, usuariosController, motoristasController,
│       │                  clientesController, cargasController, dashboardController,
│       │                  templatesController, gruposWhatsappController
│       ├── routes/        auth, usuarios, motoristas, clientes, cargas, dashboard,
│       │                  templates, gruposWhatsapp
│       ├── middleware/    auth.js (JWT), adminOnly.js
│       └── config/        supabase.js (service key)
├── frontend/
│   └── src/
│       ├── contexts/      AuthContext.jsx
│       ├── services/      api.js (Axios + JWT interceptor), usuarios.js, cargas.js,
│       │                  motoristas.js, clientes.js, templates.js, grupos.js
│       ├── pages/         Login, Dashboard, Cargas (Kanban), Historico, Motoristas,
│       │                  Clientes, Usuarios, Templates
│       ├── components/    CidadeSelect, Icon, ...
│       └── constants/     index.js (VEICULOS, fmtD, fmtTel, ~5.500 municípios)
└── database/
    └── schema.sql
```

---

## Banco de dados — Tabelas

| Tabela | Descrição |
|--------|-----------|
| `usuarios` | Auth · perfil: `admin` ou `operacional` · campo `telefone` (WhatsApp) |
| `motoristas` | `placa_carreta2` para Bitrem/Rodotrem |
| `clientes` | Cadastro de clientes |
| `cargas` | Principal · `frete_liquido` campo manual · número `CTE-{ANO}-{SEQ}` |
| `cargas_monitoramento` | Etapas de monitoramento por carga (Carga · Trânsito · Descarga) |
| `templates` | Templates de anúncio WhatsApp salvos por cliente |
| `anuncios_historico` | Histórico de divulgações |
| `grupos_whatsapp` | Grupos com nome e link |

Colunas criadas via ALTER TABLE:
```sql
ALTER TABLE cargas ADD COLUMN frete_liquido DECIMAL(10,2);
ALTER TABLE motoristas ADD COLUMN placa_carreta2 TEXT;
ALTER TABLE usuarios ADD COLUMN telefone TEXT;
```

---

## Regras de negócio importantes

- Usuário `operacional` só vê cargas que ele mesmo criou (filtro no backend)
- Usuário `admin` vê tudo + acesso a `/dashboard` e `/usuarios`
- Cargas só deletáveis com status `cancelado`
- Número de carga: `CTE-{ANO}-{SEQ:3d}` (gerado automaticamente)
- `frete_liquido` é campo manual — nunca calculado automaticamente no backend
- Frete Líquido nos KPIs e rankings: soma apenas cargas com `status = 'concluido'` e `frete_liquido > 0` (sem fallback para `frete_cobrado - frete_pago`)
- Monitoramento: ao concluir etapa Descarga → status da carga muda automaticamente para `concluido`

---

## O que foi implementado (histórico completo)

### Infraestrutura
- API REST com JWT, bcrypt, Supabase client (service key)
- Deploy Railway (backend) + Vercel (frontend, Root Directory: `frontend/`)
- `vercel.json` dentro de `frontend/` com SPA rewrite (`"destination": "/index.html"`)
- `frontend/.env.production` aponta para Railway

### Dashboard
- KPIs: Frete Cobrado, Frete Pago, Frete Líquido, Margem %, Cargas Ativas
  - Cobrado/Pago somam: `em_transito`, `entregue`, `concluido`, `cancelado`
  - Líquido/Margem somam apenas `frete_liquido` com `status = 'concluido'`
- Donut de status (sem coluna "Entregue" — cards entregue agrupados em "Em Andamento")
- Sparklines por período
- Rankings: Top Clientes, Top Operacionais, Top Motoristas — baseados em `frete_liquido` concluído
- Contador de cargas em cada card de ranking

### Kanban (página Cargas)
- Colunas: **Divulgação** (aguardando) · **Em Andamento** (em_transito + entregue) · **Concluído** · **Cancelado**
- Background por coluna: amarelo · azul · verde · vermelho
- Cards com altura fixa, borda esquerda colorida por status
- Collapse de colunas (estado salvo no localStorage)
- Botão **Duplicar** carga (cria cópia sem motorista, status `aguardando`)
- Botão **Excluir** com confirmação (admin only, só `cancelado`)
- Botão **📲 Divulgar** nas colunas Divulgação e Em Andamento → navega para Templates com carga pré-preenchida
- Drag-and-drop entre colunas para troca de status

### Modal de Carga
- Abas: **Info** · **CTE** · **Monitoramento** · **Ocorrências**
- Info: dados básicos + motorista + operacional responsável (admin pode atribuir)
- CTE: número CTE, datas, financeiro completo (Frete Cobrado, Pago, Líquido em destaque verde com margem %)
- Monitoramento: timeline Carga → Trânsito → Descarga (ver seção abaixo)
- Ocorrências: registro livre de observações
- Altura fixa (sem resize ao trocar abas)

### Monitoramento
- Tabela `cargas_monitoramento` no Supabase
- Progress bar mostrando etapa atual (Carga · Trânsito · Descarga)
- Checkbox interativo por etapa: registra horário automaticamente ao marcar
- Ao completar Descarga → status da carga vira `concluido` automaticamente
- Status da etapa aparece no card do kanban (ex: `• Carga`, `• Trânsito`)
- Permissões: admin edita qualquer carga · operacional edita apenas as suas

### Motoristas
- Campo `placa_carreta2` dinâmico (aparece só para Bitrem e Rodotrem)
- Exibido no modal quando preenchido
- Labels: "Cavalo" substituído por "Veículo" em toda a UI

### CidadeSelect (autocomplete)
- Base local com ~5.500 municípios brasileiros em `constants/index.js`
- Input nativo (sem react-select — causava crash)
- Ordenação inteligente: cidades que começam com o texto digitado aparecem primeiro

### Usuários
- Campo `telefone` (WhatsApp) na tabela e no formulário de edição
- Coluna WhatsApp exibida na listagem (mostra `—` se vazio)
- Backend com retry logic para schema cache do PostgREST:
  - `isSchemaErr` detecta erro de cache · retenta INSERT/UPDATE sem o campo `telefone`
  - Todos os `select()` usam `select('*')` + helper `strip({ senha_hash, ...u })` (resiliente a novas colunas)
- `/api/usuarios/responsaveis` — rota acessível a todos os autenticados (registrada antes do middleware `adminOnly`)

### Página Templates (nova)
- Rota e item de sidebar: `templates` (ícone `layers`)
- **Formulário de anúncio:**
  - Toggles Coleta / Entrega (modo imediato ou com data)
  - Origem / Destino via CidadeSelect
  - Peso, Produto
  - Tipo de Veículo: `VeiculoInput` — autocomplete com digitação livre (lista `VEICULOS` de constants)
  - Dropdown Responsável → ao selecionar, puxa o telefone para a lista de números
  - Lista de números WhatsApp (adicionar/remover)
- **Live preview** estilo WhatsApp (fundo `#111b21`, bolha `#005c4b`, `pre` com `white-space: pre-wrap`)
- **Ações:** Abrir no WhatsApp Web · Copiar mensagem · Salvar como template
- **Templates salvos:** grid com filtro por cliente · botão Usar · botão Excluir
- **Grupos WhatsApp:** lista com botão 📲 Divulgar (copia mensagem + abre link) · admin pode adicionar/remover grupos
- **Navegação cruzada:** botão Divulgar no Kanban dispara `CustomEvent('sol:navigate', { detail: { page: 'templates', cargaId } })` → `App.jsx` escuta e pré-preenche o formulário com dados da carga

### Rotas backend registradas em app.js
```
GET/POST/PUT/DELETE  /api/auth
GET/POST/PUT/DELETE  /api/usuarios
GET                  /api/usuarios/responsaveis   (todos os autenticados)
GET/POST/PUT/DELETE  /api/motoristas
GET/POST/PUT/DELETE  /api/clientes
GET/POST/PUT/DELETE  /api/cargas
GET                  /api/dashboard
GET/POST/PUT/DELETE  /api/templates
GET/POST/DELETE      /api/grupos-whatsapp
```

---

## Bugs corrigidos nesta sessão (15/05/2026)

### Usuários — listagem vazia após ALTER TABLE
- **Causa:** `select('id, nome, email, ..., telefone')` falhava com PGRST204 porque PostgREST não tinha o campo `telefone` no cache de schema ainda. O `.catch()` silencioso deixava `users = []`.
- **Fix:** Mudado para `select('*')` + helper `strip` que remove `senha_hash`. Schema cache nunca falha em `SELECT *`.

### Schema cache — erro "Could not find the 'telefone' column"
- **Causa:** INSERT e UPDATE com `telefone` no payload falham se PostgREST ainda não cacheou a coluna.
- **Fix:** Helper `isSchemaErr` detecta a mensagem de erro. Em `criar` e `atualizar`: tenta com `telefone`, se falhar por schema cache, retenta sem ele.

### Templates — dropdown Responsável vazio
- **Causa 1:** `Promise.all([listarTemplates(), listarClientes(), ...])` — se `listarTemplates()` ou `listarClientes()` lançasse exceção, o `Promise.all` rejeitava inteiro e `setOperacionais` nunca era chamado. O `.catch(() => [])` só protegia o fetch de usuários individualmente, não o chain todo.
- **Causa 2:** Condicional `admin ? listarUsuarios() : listarResponsaveis()` com `useCallback([admin])` — timing de quando `admin` é resolvido na primeira renderização podia invocar o endpoint errado silenciosamente.
- **Fix:** Cada promise no `Promise.all` tem seu próprio `.catch(err => { console.error(...); return []; })`. Removido o branch `admin` — sempre usa `listarResponsaveis()` (retorna todos os usuários ativos, acessível a qualquer autenticado, tem os campos necessários para o dropdown).

---

## Estado atual do sistema

- Todas as páginas funcionais em produção
- Monitoramento integrado ao kanban
- Templates com live preview e grupos WhatsApp
- Usuários com campo WhatsApp + retry logic para schema cache

---

## Pendente / Próximos passos

1. **Testar dropdown Responsável** em produção após último fix (commit `c70569b`)
2. **Preview Templates** — verificar se `{ORIGEM}` e `{DESTINO}` aparecem corretamente ao digitar (o placeholder literal só aparece quando o campo está vazio, por design)
3. **Trocar senha do admin** no primeiro login em produção
4. **Modo escuro** — botão de toggle já existe na UI, implementação pendente
5. **Histórico de divulgações** — tabela `anuncios_historico` criada mas sem UI ainda
