-- Migration: add cargas_monitoramento
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS cargas_monitoramento (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  carga_id      UUID        NOT NULL REFERENCES cargas(id) ON DELETE CASCADE,
  etapa         TEXT        NOT NULL CHECK (etapa IN ('carregamento', 'em_transito', 'descarga')),
  concluido     BOOLEAN     NOT NULL DEFAULT false,
  horario       TIMESTAMPTZ,
  concluido_por UUID        REFERENCES usuarios(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(carga_id, etapa)
);

CREATE INDEX IF NOT EXISTS idx_cargas_mon_carga_id ON cargas_monitoramento(carga_id);
