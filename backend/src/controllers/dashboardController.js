const supabase = require('../config/supabase');

const resumo = async (req, res) => {
  const { periodo } = req.query;

  let query = supabase
    .from('cargas')
    .select('status, frete_cobrado, frete_pago, criado_em');

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

  const { data: cargas, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const resultado = {
    total: cargas.length,
    aguardando: 0,
    em_transito: 0,
    entregue: 0,
    concluido: 0,
    cancelado: 0,
    faturamento: 0,
    custo: 0,
    margem: 0,
  };

  for (const carga of cargas) {
    if (resultado[carga.status] !== undefined) {
      resultado[carga.status]++;
    }
    resultado.faturamento += parseFloat(carga.frete_cobrado || 0);
    resultado.custo += parseFloat(carga.frete_pago || 0);
  }

  resultado.margem = resultado.faturamento - resultado.custo;
  resultado.faturamento = parseFloat(resultado.faturamento.toFixed(2));
  resultado.custo = parseFloat(resultado.custo.toFixed(2));
  resultado.margem = parseFloat(resultado.margem.toFixed(2));

  res.json(resultado);
};

const ranking = async (req, res) => {
  const { data: cargas, error } = await supabase
    .from('cargas')
    .select('motorista_id, motoristas(nome), status, frete_cobrado, frete_pago')
    .not('motorista_id', 'is', null);

  if (error) return res.status(500).json({ error: error.message });

  const mapa = {};

  for (const carga of cargas) {
    const mid = carga.motorista_id;
    if (!mapa[mid]) {
      mapa[mid] = {
        motorista_id: mid,
        nome: carga.motoristas?.nome || 'Desconhecido',
        total_cargas: 0,
        concluidas: 0,
        em_transito: 0,
        faturamento: 0,
        custo: 0,
      };
    }
    mapa[mid].total_cargas++;
    if (carga.status === 'concluido') mapa[mid].concluidas++;
    if (carga.status === 'em_transito') mapa[mid].em_transito++;
    mapa[mid].faturamento += parseFloat(carga.frete_cobrado || 0);
    mapa[mid].custo += parseFloat(carga.frete_pago || 0);
  }

  const resultado = Object.values(mapa)
    .map((m) => ({
      ...m,
      faturamento: parseFloat(m.faturamento.toFixed(2)),
      custo: parseFloat(m.custo.toFixed(2)),
      margem: parseFloat((m.faturamento - m.custo).toFixed(2)),
    }))
    .sort((a, b) => b.concluidas - a.concluidas || b.faturamento - a.faturamento);

  res.json(resultado);
};

const rankingOperacionais = async (req, res) => {
  const { data: cargas, error } = await supabase
    .from('cargas')
    .select('criado_por, usuarios!criado_por(nome), status, frete_cobrado, frete_pago, frete_liquido, data_entrega_real, previsao_entrega')
    .not('criado_por', 'is', null);

  if (error) return res.status(500).json({ error: error.message });

  const mapa = {};

  for (const carga of cargas) {
    const uid = carga.criado_por;
    if (!mapa[uid]) {
      mapa[uid] = {
        operacional_id: uid,
        nome: carga.usuarios?.nome || 'Desconhecido',
        total_cargas: 0,
        concluidas: 0,
        no_prazo: 0,
        com_previsao: 0,
        frete_liquido: 0,
      };
    }
    mapa[uid].total_cargas++;
    if (carga.status === 'concluido' || carga.status === 'entregue') {
      mapa[uid].concluidas++;
      if (carga.data_entrega_real && carga.previsao_entrega) {
        mapa[uid].com_previsao++;
        if (carga.data_entrega_real <= carga.previsao_entrega) mapa[uid].no_prazo++;
      }
    }
    const lq = carga.frete_liquido != null
      ? parseFloat(carga.frete_liquido)
      : (parseFloat(carga.frete_cobrado) || 0) - (parseFloat(carga.frete_pago) || 0);
    mapa[uid].frete_liquido += lq;
  }

  const resultado = Object.values(mapa)
    .map(m => ({
      ...m,
      frete_liquido: parseFloat(m.frete_liquido.toFixed(2)),
      pct_prazo: m.com_previsao > 0 ? Math.round((m.no_prazo / m.com_previsao) * 100) : null,
    }))
    .sort((a, b) => b.total_cargas - a.total_cargas || b.frete_liquido - a.frete_liquido);

  res.json(resultado);
};

module.exports = { resumo, ranking, rankingOperacionais };
