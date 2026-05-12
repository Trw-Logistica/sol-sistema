const supabase = require('../config/supabase');

const STATUS_VALIDOS = ['aguardando', 'em_transito', 'entregue', 'concluido', 'cancelado'];

async function gerarNumeroCarga() {
  const ano = new Date().getFullYear();

  const { data } = await supabase
    .from('cargas')
    .select('numero')
    .like('numero', `CTE-${ano}-%`)
    .order('numero', { ascending: false })
    .limit(1);

  if (!data || data.length === 0) return `CTE-${ano}-001`;

  const partes = data[0].numero.split('-');
  const seq = parseInt(partes[2], 10) + 1;
  return `CTE-${ano}-${String(seq).padStart(3, '0')}`;
}

async function verificarAcesso(req, id) {
  const { data, error } = await supabase
    .from('cargas')
    .select('criado_por, status')
    .eq('id', id)
    .single();

  if (error || !data) return { erro: 'Carga não encontrada', status: 404 };

  if (req.user.perfil === 'operacional' && data.criado_por !== req.user.id) {
    return { erro: 'Acesso negado', status: 403 };
  }

  return { carga: data };
}

const listar = async (req, res) => {
  const { status, motorista_id, periodo, historico } = req.query;

  let query = supabase
    .from('cargas')
    .select(`
      *,
      clientes(id, nome),
      motoristas(id, nome, placa_cavalo),
      usuarios!criado_por(id, nome)
    `)
    .order('criado_em', { ascending: false });

  if (req.user.perfil === 'operacional') {
    query = query.eq('criado_por', req.user.id);
  }

  if (historico === 'true') {
    query = query.in('status', ['concluido', 'cancelado']);
  } else if (status) {
    query = query.eq('status', status);
  }

  if (motorista_id) query = query.eq('motorista_id', motorista_id);

  if (periodo) {
    const hoje = new Date();
    const mapa = { '7d': 7, '30d': 30, '90d': 90 };
    const dias = mapa[periodo];
    if (dias) {
      const dataInicio = new Date(hoje);
      dataInicio.setDate(dataInicio.getDate() - dias);
      query = query.gte('criado_em', dataInicio.toISOString());
    }
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const obter = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('cargas')
    .select(`
      *,
      clientes(*),
      motoristas(*),
      usuarios!criado_por(id, nome, email)
    `)
    .eq('id', id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Carga não encontrada' });

  if (req.user.perfil === 'operacional' && data.criado_por !== req.user.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  res.json(data);
};

const criar = async (req, res) => {
  const {
    cliente_id, motorista_id, origem, destino,
    data_coleta, previsao_entrega, frete_cobrado, frete_pago, frete_liquido, cte,
  } = req.body;

  if (!cliente_id || !origem || !destino) {
    return res.status(400).json({ error: 'Campos obrigatórios: cliente_id, origem, destino' });
  }

  const numero = await gerarNumeroCarga();

  const { data, error } = await supabase
    .from('cargas')
    .insert({
      numero,
      status: 'aguardando',
      cliente_id,
      motorista_id: motorista_id || null,
      origem,
      destino,
      data_coleta: data_coleta || null,
      previsao_entrega: previsao_entrega || null,
      frete_cobrado: frete_cobrado || null,
      frete_pago: frete_pago || null,
      frete_liquido: frete_liquido ?? null,
      cte: cte || null,
      ocorrencias: [],
      criado_por: req.user.id,
    })
    .select(`
      *,
      clientes(id, nome),
      motoristas(id, nome, placa_cavalo)
    `)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
};

const atualizar = async (req, res) => {
  const { id } = req.params;

  const acesso = await verificarAcesso(req, id);
  if (acesso.erro) return res.status(acesso.status).json({ error: acesso.erro });

  const campos = [
    'cliente_id', 'motorista_id', 'origem', 'destino',
    'data_coleta', 'previsao_entrega', 'data_entrega_real',
    'frete_cobrado', 'frete_pago', 'frete_liquido', 'cte', 'comprovante_url',
  ];

  const updates = { atualizado_em: new Date().toISOString() };
  for (const campo of campos) {
    if (req.body[campo] !== undefined) updates[campo] = req.body[campo];
  }

  const { data, error } = await supabase
    .from('cargas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const atualizarStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({ error: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}` });
  }

  const acesso = await verificarAcesso(req, id);
  if (acesso.erro) return res.status(acesso.status).json({ error: acesso.erro });

  const updates = { status, atualizado_em: new Date().toISOString() };

  if ((status === 'entregue' || status === 'concluido') && !acesso.carga.data_entrega_real) {
    updates.data_entrega_real = new Date().toISOString().split('T')[0];
  }

  const { data, error } = await supabase
    .from('cargas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const adicionarOcorrencia = async (req, res) => {
  const { id } = req.params;
  const { descricao, tipo } = req.body;

  if (!descricao) return res.status(400).json({ error: 'Descrição da ocorrência é obrigatória' });

  const { data: carga, error: fetchError } = await supabase
    .from('cargas')
    .select('ocorrencias, criado_por')
    .eq('id', id)
    .single();

  if (fetchError || !carga) return res.status(404).json({ error: 'Carga não encontrada' });

  if (req.user.perfil === 'operacional' && carga.criado_por !== req.user.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const novaOcorrencia = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    descricao,
    tipo: tipo || 'info',
    usuario_nome: req.user.nome,
    usuario_id: req.user.id,
    criado_em: new Date().toISOString(),
  };

  const ocorrencias = [...(carga.ocorrencias || []), novaOcorrencia];

  const { data, error } = await supabase
    .from('cargas')
    .update({ ocorrencias, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
};

const deletar = async (req, res) => {
  const { id } = req.params;

  const acesso = await verificarAcesso(req, id);
  if (acesso.erro) return res.status(acesso.status).json({ error: acesso.erro });

  if (acesso.carga.status !== 'cancelado') {
    return res.status(400).json({ error: 'Apenas cargas com status "cancelado" podem ser excluídas' });
  }

  const { error } = await supabase.from('cargas').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  res.status(204).send();
};

module.exports = { listar, obter, criar, atualizar, atualizarStatus, adicionarOcorrencia, deletar };
