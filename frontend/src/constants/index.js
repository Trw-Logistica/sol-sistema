export const VEICULOS = ['VUC','Fiorino / Utilitário','Van / Furgão','3/4','Toco','Truck','Bitruck','Carreta Simples','Carreta LS','Carreta Vanderleia','Bitrem','Rodotrem'];
export const CARROCERIAS = ['Baú','Baú Frigorífico','Grade Baixa','Graneleiro','Sider','Porta-Container','Caçamba','Tanque','Prancha / Plataforma','Cegonha','Boiadeiro','Madeireiro','Basculante','Aberta'];
export const OC_TIPOS = ['Atraso','Avaria','Devolução','Acidente','Outro'];

export const STS = {
  aguardando: 'Aguardando',
  em_transito: 'Em Trânsito',
  entregue: 'Entregue',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const STS_CLS = {
  aguardando: 's-wait',
  em_transito: 's-tran',
  entregue: 's-delv',
  concluido: 's-done',
  cancelado: 's-canc',
};

export const ACTIVE = ['aguardando', 'em_transito', 'entregue'];
export const HIST   = ['concluido', 'cancelado'];

export const fmtR = v =>
  'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

export const fmtD = d => {
  if (!d) return '-';
  const p = d.slice(0, 10).split('-');
  return `${p[2]}/${p[1]}/${p[0]}`;
};

export const today = () => new Date().toISOString().slice(0, 10);

export const liq = c =>
  (parseFloat(c.frete_cobrado) || 0) - (parseFloat(c.frete_pago) || 0);
