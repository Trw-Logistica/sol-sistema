-- ============================================================
-- S.O.L - Super Operador Logístico
-- Schema SQL para Supabase
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE perfil_usuario AS ENUM ('admin', 'operacional');
CREATE TYPE status_carga   AS ENUM ('aguardando', 'em_transito', 'entregue', 'concluido', 'cancelado');

-- --------------------------------------------------------
-- Tabela: usuarios
-- --------------------------------------------------------
CREATE TABLE usuarios (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  perfil     perfil_usuario NOT NULL DEFAULT 'operacional',
  ativo      BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- Tabela: motoristas
-- --------------------------------------------------------
CREATE TABLE motoristas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          TEXT NOT NULL,
  telefone      TEXT,
  tipo_veiculo  TEXT,
  placa_cavalo  TEXT,
  placa_carreta TEXT,
  carroceria    TEXT,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- Tabela: clientes
-- --------------------------------------------------------
CREATE TABLE clientes (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome      TEXT NOT NULL,
  cnpj      TEXT,
  telefone  TEXT,
  email     TEXT,
  cidade    TEXT,
  uf        TEXT,
  ativo     BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- Tabela: cargas
-- --------------------------------------------------------
CREATE TABLE cargas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero            TEXT NOT NULL UNIQUE,
  status            status_carga NOT NULL DEFAULT 'aguardando',
  cliente_id        UUID REFERENCES clientes(id) ON DELETE SET NULL,
  motorista_id      UUID REFERENCES motoristas(id) ON DELETE SET NULL,
  origem            TEXT NOT NULL,
  destino           TEXT NOT NULL,
  data_coleta       DATE,
  previsao_entrega  DATE,
  data_entrega_real DATE,
  frete_cobrado     DECIMAL(10, 2),
  frete_pago        DECIMAL(10, 2),
  cte               TEXT,
  comprovante_url   TEXT,
  ocorrencias       JSONB NOT NULL DEFAULT '[]',
  criado_por        UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em         TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_cargas_status       ON cargas(status);
CREATE INDEX idx_cargas_cliente      ON cargas(cliente_id);
CREATE INDEX idx_cargas_motorista    ON cargas(motorista_id);
CREATE INDEX idx_cargas_criado_por   ON cargas(criado_por);
CREATE INDEX idx_cargas_criado_em    ON cargas(criado_em DESC);
CREATE INDEX idx_cargas_numero       ON cargas(numero);

-- --------------------------------------------------------
-- Usuário admin inicial
-- Senha padrão: Admin@123
-- TROQUE a senha imediatamente após o primeiro login!
-- Hash gerado com bcrypt (10 rounds)
-- --------------------------------------------------------
INSERT INTO usuarios (nome, email, senha_hash, perfil)
VALUES (
  'Administrador',
  'admin@sol-sistema.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',  -- Admin@123
  'admin'
);

-- ============================================================
-- ATENÇÃO: Desabilite o Row Level Security (RLS) nas tabelas
-- pois o backend usa a Service Key com acesso total.
-- Ou configure as policies conforme sua necessidade.
-- ============================================================
