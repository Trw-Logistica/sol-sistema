const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');

const listar = async (req, res) => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, perfil, ativo, criado_em')
    .order('nome');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const criar = async (req, res) => {
  const { nome, email, senha, perfil } = req.body;

  if (!nome || !email || !senha || !perfil) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, email, senha, perfil' });
  }

  if (!['admin', 'operacional'].includes(perfil)) {
    return res.status(400).json({ error: 'Perfil inválido. Use: admin ou operacional' });
  }

  const senha_hash = await bcrypt.hash(senha, 10);

  const { data, error } = await supabase
    .from('usuarios')
    .insert({ nome, email: email.toLowerCase().trim(), senha_hash, perfil })
    .select('id, nome, email, perfil, ativo, criado_em')
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Email já cadastrado' });
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data);
};

const atualizar = async (req, res) => {
  const { id } = req.params;
  const { nome, email, senha, perfil, ativo } = req.body;

  const updates = {};
  if (nome !== undefined) updates.nome = nome;
  if (email !== undefined) updates.email = email.toLowerCase().trim();
  if (perfil !== undefined) {
    if (!['admin', 'operacional'].includes(perfil)) {
      return res.status(400).json({ error: 'Perfil inválido' });
    }
    updates.perfil = perfil;
  }
  if (ativo !== undefined) updates.ativo = ativo;
  if (senha) updates.senha_hash = await bcrypt.hash(senha, 10);

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }

  const { data, error } = await supabase
    .from('usuarios')
    .update(updates)
    .eq('id', id)
    .select('id, nome, email, perfil, ativo, criado_em')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Usuário não encontrado' });

  res.json(data);
};

const deletar = async (req, res) => {
  const { id } = req.params;

  if (req.user.id === id) {
    return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário' });
  }

  const { error } = await supabase.from('usuarios').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  res.status(204).send();
};

module.exports = { listar, criar, atualizar, deletar };
