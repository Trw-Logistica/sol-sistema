const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');

const strip = ({ senha_hash, ...u }) => u;

// PostgREST fails with this when a column isn't in its schema cache yet
const isSchemaErr = msg => typeof msg === 'string' && msg.includes('telefone') && msg.includes('schema cache');

const listar = async (req, res) => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('nome');

  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map(strip));
};

const listarResponsaveis = async (req, res) => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('ativo', true)
    .order('nome');

  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map(({ id, nome, telefone, perfil }) => ({ id, nome, telefone: telefone || null, perfil })));
};

const criar = async (req, res) => {
  const { nome, email, senha, perfil, telefone } = req.body;

  if (!nome || !email || !senha || !perfil) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, email, senha, perfil' });
  }
  if (!['admin', 'operacional'].includes(perfil)) {
    return res.status(400).json({ error: 'Perfil inválido. Use: admin ou operacional' });
  }

  const senha_hash = await bcrypt.hash(senha, 10);
  const base = { nome, email: email.toLowerCase().trim(), senha_hash, perfil };

  let { data, error } = await supabase
    .from('usuarios')
    .insert({ ...base, telefone: telefone || null })
    .select('*')
    .single();

  // Retry without telefone if schema cache hasn't picked up the new column yet
  if (error && isSchemaErr(error.message)) {
    const retry = await supabase.from('usuarios').insert(base).select('*').single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Email já cadastrado' });
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(strip(data));
};

const atualizar = async (req, res) => {
  const { id } = req.params;
  const { nome, email, senha, perfil, ativo, telefone } = req.body;

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
  if (telefone !== undefined) updates.telefone = telefone || null;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }

  let { data, error } = await supabase
    .from('usuarios')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  // Retry without telefone if schema cache hasn't picked up the new column yet
  if (error && isSchemaErr(error.message) && updates.telefone !== undefined) {
    const { telefone: _t, ...updatesWithout } = updates;
    const retry = await supabase
      .from('usuarios')
      .update(updatesWithout)
      .eq('id', id)
      .select('*')
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Usuário não encontrado' });

  res.json(strip(data));
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

module.exports = { listar, listarResponsaveis, criar, atualizar, deletar };
