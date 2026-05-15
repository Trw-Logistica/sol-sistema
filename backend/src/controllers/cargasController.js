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
      id, numero, status, cliente_id, motorista_id, criado_por,
      origem, destino, data_coleta, previsao_entrega, data_entrega_real,
      frete_cobrado, frete_pago, frete_liquido, cte, comprovante_url,
      ocorrencias, criado_em, atualizado_em,
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

  if (req.user.perfil?.toLowerCase() === 'admin' && req.body.criado_por !== undefined) {
    updates.criado_por = req.body.criado_por;
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

const duplicar = async (req, res) => {
  const { id } = req.params;

  const acesso = await verificarAcesso(req, id);
  if (acesso.erro) return res.status(acesso.status).json({ error: acesso.erro });

  if (!['aguardando', 'em_transito'].includes(acesso.carga.status)) {
    return res.status(400).json({ error: 'Apenas cargas em Divulgação ou Em Andamento podem ser duplicadas.' });
  }

  const { data: orig, error: fetchErr } = await supabase
    .from('cargas')
    .select('cliente_id, origem, destino, frete_cobrado, frete_pago, frete_liquido, criado_por, data_coleta, previsao_entrega')
    .eq('id', id)
    .single();

  if (fetchErr || !orig) return res.status(404).json({ error: 'Carga não encontrada.' });

  const numero = await gerarNumeroCarga();

  const { data, error } = await supabase
    .from('cargas')
    .insert({
      numero,
      status: 'aguardando',
      cliente_id: orig.cliente_id,
      motorista_id: null,
      origem: orig.origem,
      destino: orig.destino,
      frete_cobrado: orig.frete_cobrado,
      frete_pago: orig.frete_pago,
      frete_liquido: orig.frete_liquido,
      criado_por: orig.criado_por,
      data_coleta: orig.data_coleta,
      previsao_entrega: orig.previsao_entrega,
      cte: null,
      comprovante_url: null,
      ocorrencias: [],
    })
    .select(`*, clientes(id, nome), motoristas(id, nome, placa_cavalo), usuarios!criado_por(id, nome)`)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
};

const deletar = async (req, res) => {
  const { id } = req.params;

  if (req.user.perfil !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem excluir cargas.' });
  }

  const { data, error: fetchErr } = await supabase
    .from('cargas').select('id').eq('id', id).single();

  if (fetchErr || !data) return res.status(404).json({ error: 'Carga não encontrada.' });

  const { error } = await supabase.from('cargas').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  res.status(204).send();
};

const ETAPA_ORDER = ['carregamento', 'em_transito', 'descarga'];

const getMonitoramento = async (req, res) => {
  const { id } = req.params;

  const { data: carga, error: cargaErr } = await supabase
    .from('cargas')
    .select('id, criado_por')
    .eq('id', id)
    .single();

  if (cargaErr || !carga) return res.status(404).json({ error: 'Carga não encontrada' });

  if (req.user.perfil === 'operacional' && carga.criado_por !== req.user.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { data, error } = await supabase
    .from('cargas_monitoramento')
    .select('*, usuarios!concluido_por(id, nome)')
    .eq('carga_id', id);

  if (error) return res.status(500).json({ error: error.message });

  const result = ETAPA_ORDER.map(etapa => {
    const rec = (data || []).find(d => d.etapa === etapa);
    return rec || { carga_id: id, etapa, concluido: false, horario: null, concluido_por: null, usuarios: null };
  });

  res.json(result);
};

const getMonitoramentoAtivos = async (req, res) => {
  let query = supabase.from('cargas').select('id').in('status', ['em_transito', 'entregue']);

  if (req.user.perfil === 'operacional') {
    query = query.eq('criado_por', req.user.id);
  }

  const { data: ativas } = await query;
  if (!ativas || ativas.length === 0) return res.json({});

  const ids = ativas.map(c => c.id);

  const { data: rows, error } = await supabase
    .from('cargas_monitoramento')
    .select('carga_id, etapa')
    .in('carga_id', ids)
    .eq('concluido', true);

  if (error) return res.status(500).json({ error: error.message });

  const result = {};
  (rows || []).forEach(row => {
    const existing = result[row.carga_id];
    const existingIdx = existing ? ETAPA_ORDER.indexOf(existing) : -1;
    const rowIdx = ETAPA_ORDER.indexOf(row.etapa);
    if (rowIdx > existingIdx) result[row.carga_id] = row.etapa;
  });

  res.json(result);
};

const updateMonitoramento = async (req, res) => {
  const { id, etapa } = req.params;
  const { concluido, horario } = req.body;

  if (!ETAPA_ORDER.includes(etapa)) {
    return res.status(400).json({ error: 'Etapa inválida' });
  }

  const { data: carga, error: cargaErr } = await supabase
    .from('cargas')
    .select('id, criado_por')
    .eq('id', id)
    .single();

  if (cargaErr || !carga) return res.status(404).json({ error: 'Carga não encontrada' });

  if (req.user.perfil === 'operacional' && carga.criado_por !== req.user.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { data: existing } = await supabase
    .from('cargas_monitoramento')
    .select('*')
    .eq('carga_id', id)
    .eq('etapa', etapa)
    .maybeSingle();

  const now = new Date().toISOString();
  let upsertData;

  if (concluido === false) {
    upsertData = { carga_id: id, etapa, concluido: false, horario: null, concluido_por: null, updated_at: now };
  } else if (existing?.concluido) {
    // Already checked — admin editing horario only, preserve concluido_por
    upsertData = { ...existing, horario: horario ?? existing.horario, updated_at: now };
  } else {
    // Newly checking
    upsertData = { carga_id: id, etapa, concluido: true, horario: horario || now, concluido_por: req.user.id, updated_at: now };
  }

  const { data, error } = await supabase
    .from('cargas_monitoramento')
    .upsert(upsertData, { onConflict: 'carga_id,etapa' })
    .select('*, usuarios!concluido_por(id, nome)')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  if (etapa === 'descarga' && concluido !== false) {
    await supabase
      .from('cargas')
      .update({ status: 'concluido', atualizado_em: now })
      .eq('id', id);
  }

  res.json(data);
};

module.exports = { listar, obter, criar, atualizar, atualizarStatus, adicionarOcorrencia, duplicar, deletar, getMonitoramento, getMonitoramentoAtivos, updateMonitoramento };
