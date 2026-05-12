const supabase = require('../config/supabase');

const listar = async (req, res) => {
  const { ativo } = req.query;

  let query = supabase.from('clientes').select('*').order('nome');
  if (ativo !== undefined) query = query.eq('ativo', ativo === 'true');

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const criar = async (req, res) => {
  const { nome, cnpj, telefone, email, cidade, uf } = req.body;

  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

  const { data, error } = await supabase
    .from('clientes')
    .insert({ nome, cnpj, telefone, email, cidade, uf })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
};

const atualizar = async (req, res) => {
  const { id } = req.params;
  const { nome, cnpj, telefone, email, cidade, uf, ativo } = req.body;

  const updates = {};
  if (nome !== undefined) updates.nome = nome;
  if (cnpj !== undefined) updates.cnpj = cnpj;
  if (telefone !== undefined) updates.telefone = telefone;
  if (email !== undefined) updates.email = email;
  if (cidade !== undefined) updates.cidade = cidade;
  if (uf !== undefined) updates.uf = uf;
  if (ativo !== undefined) updates.ativo = ativo;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }

  const { data, error } = await supabase
    .from('clientes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Cliente não encontrado' });

  res.json(data);
};

const deletar = async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from('clientes').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  res.status(204).send();
};

module.exports = { listar, criar, atualizar, deletar };
