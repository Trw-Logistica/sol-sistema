const supabase = require('../config/supabase');

const listar = async (req, res) => {
  const { ativo } = req.query;

  let query = supabase
    .from('motoristas')
    .select('id, nome, telefone, tipo_veiculo, carroceria, placa_cavalo, placa_carreta, placa_carreta2, ativo, criado_em')
    .order('nome');
  if (ativo !== undefined) query = query.eq('ativo', ativo === 'true');

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const criar = async (req, res) => {
  const { nome, telefone, tipo_veiculo, placa_cavalo, placa_carreta, placa_carreta2, carroceria } = req.body;

  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

  const { data, error } = await supabase
    .from('motoristas')
    .insert({ nome, telefone, tipo_veiculo, placa_cavalo, placa_carreta, placa_carreta2, carroceria })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
};

const atualizar = async (req, res) => {
  const { id } = req.params;
  const { nome, telefone, tipo_veiculo, placa_cavalo, placa_carreta, placa_carreta2, carroceria, ativo } = req.body;

  const updates = {};
  if (nome !== undefined) updates.nome = nome;
  if (telefone !== undefined) updates.telefone = telefone;
  if (tipo_veiculo !== undefined) updates.tipo_veiculo = tipo_veiculo;
  if (placa_cavalo !== undefined) updates.placa_cavalo = placa_cavalo;
  if (placa_carreta !== undefined) updates.placa_carreta = placa_carreta;
  if (placa_carreta2 !== undefined) updates.placa_carreta2 = placa_carreta2;
  if (carroceria !== undefined) updates.carroceria = carroceria;
  if (ativo !== undefined) updates.ativo = ativo;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }

  const { data, error } = await supabase
    .from('motoristas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Motorista não encontrado' });

  res.json(data);
};

const deletar = async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from('motoristas').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  res.status(204).send();
};

module.exports = { listar, criar, atualizar, deletar };
