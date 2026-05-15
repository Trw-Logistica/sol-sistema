const supabase = require('../config/supabase');

const listar = async (req, res) => {
  let query = supabase
    .from('templates_anuncio')
    .select('*, clientes(id, nome), usuarios!criado_por(id, nome)')
    .order('created_at', { ascending: false });

  if (req.query.cliente_id) query = query.eq('cliente_id', req.query.cliente_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const criar = async (req, res) => {
  const { nome, cliente_id, origem, destino, peso, produto, veiculo, numeros_whatsapp, responsaveis_ids } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

  const { data, error } = await supabase
    .from('templates_anuncio')
    .insert({
      nome,
      cliente_id: cliente_id || null,
      origem: origem || null,
      destino: destino || null,
      peso: peso || null,
      produto: produto || null,
      veiculo: veiculo || null,
      numeros_whatsapp: numeros_whatsapp || [],
      responsaveis_ids: responsaveis_ids || [],
      criado_por: req.user.id,
    })
    .select('*, clientes(id, nome)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
};

const atualizar = async (req, res) => {
  const { id } = req.params;
  const campos = {};
  const fields = ['nome', 'cliente_id', 'origem', 'destino', 'peso', 'produto', 'veiculo', 'numeros_whatsapp', 'responsaveis_ids'];
  for (const f of fields) {
    const isArr = f === 'numeros_whatsapp' || f === 'responsaveis_ids';
    if (req.body[f] !== undefined) campos[f] = req.body[f] || (isArr ? [] : null);
  }

  const { data, error } = await supabase
    .from('templates_anuncio')
    .update(campos)
    .eq('id', id)
    .select('*, clientes(id, nome)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const deletar = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('templates_anuncio').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
};

module.exports = { listar, criar, atualizar, deletar };
