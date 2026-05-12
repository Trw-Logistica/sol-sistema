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

module.exports = { resumo, ranking };
