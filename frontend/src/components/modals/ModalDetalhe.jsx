import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { atualizarCarga, atualizarStatus, adicionarOcorrencia } from '../../services/cargas';
import { STS, OC_TIPOS, fmtR, fmtD } from '../../constants';
import SBadge from '../SBadge';

export default function ModalDetalhe({ carga: cargaProp, total, idx, onPrev, onNext, clientes, mots, operacionais = [], onUpdate, onAddOc, onClose }) {
  const { usuario, isAdmin } = useAuth();
  const [tab, setTab] = useState('info');
  const [cteV, setCteV] = useState(cargaProp.cte || '');
  const [ocF, setOcF] = useState({ tipo: 'Atraso', descricao: '' });
  const [salvando, setSalvando] = useState(false);
  const [opSel, setOpSel] = useState(cargaProp.criado_por || '');

  useEffect(() => {
    setCteV(cargaProp.cte || '');
    setOpSel(cargaProp.criado_por || '');
  }, [cargaProp.id, cargaProp.cte, cargaProp.criado_por]);

  const carga = cargaProp;
  const admin = isAdmin();
  const canEdit = admin || carga.criado_por === usuario?.id;
  const mot = carga.motoristas || mots?.find(m => m.id === carga.motorista_id);
  const cli = carga.clientes || clientes?.find(c => c.id === carga.cliente_id);
  const lq = carga.frete_liquido != null ? parseFloat(carga.frete_liquido) : (parseFloat(carga.frete_cobrado) || 0) - (parseFloat(carga.frete_pago) || 0);

  const tabs = [
    { id: 'info', label: 'Info' },
    { id: 'cte', label: 'CTE' },
    { id: 'fin', label: 'Financeiro' },
    { id: 'oc', label: `Ocorrências (${(carga.ocorrencias || []).length})` },
  ];

  const salvarStatus = async status => {
    setSalvando(true);
    try { await atualizarStatus(carga.id, status); onUpdate(); }
    finally { setSalvando(false); }
  };

  const atribuirOp = async () => {
    if (!opSel || opSel === carga.criado_por) return;
    setSalvando(true);
    try { await atualizarCarga(carga.id, { criado_por: opSel }); onUpdate(); }
    finally { setSalvando(false); }
  };

  const salvarCTE = async () => {
    setSalvando(true);
    try { await atualizarCarga(carga.id, { cte: cteV }); onUpdate(); }
    finally { setSalvando(false); }
  };

  const confirmarComprovante = async () => {
    if (!confirm('Confirmar recebimento do comprovante físico?')) return;
    setSalvando(true);
    try { await atualizarCarga(carga.id, { comprovante_url: `confirmado-${new Date().toISOString()}` }); onUpdate(); }
    finally { setSalvando(false); }
  };

  const registrarOc = async () => {
    if (!ocF.descricao.trim()) return;
    setSalvando(true);
    try {
      await adicionarOcorrencia(carga.id, { descricao: ocF.descricao, tipo: ocF.tipo });
      setOcF({ tipo: 'Atraso', descricao: '' });
      onAddOc();
    } finally { setSalvando(false); }
  };

  return (
    <div className="ov">
      <div className="modal">
        <div className="mhd">
          <div>
            <div className="mttl">{carga.cte || <span style={{ color: 'var(--amber)' }}>Aguardando CTE</span>}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
              <SBadge status={carga.status} />
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{carga.origem} → {carga.destino}</span>
            </div>
          </div>
          <button className="mx" onClick={onClose}>×</button>
        </div>

        <div className="mbd">
          {mot && (
            <div className="driver-card">
              <div className="driver-av">🚛</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{mot.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mo)', marginTop: 2 }}>
                  {[mot.tipo_veiculo || mot.carroceria, mot.placa_cavalo, mot.placa_carreta].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>
          )}

          <div className="pbar" style={{ marginBottom: 16 }}>
            {tabs.map(t => (
              <button key={t.id} className={`pb${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'info' && (
            <div>
              <div className="dgrid">
                <div className="di"><div className="dil">Nº da Carga</div><div className="div2 mono">{carga.numero}</div></div>
                <div className="di"><div className="dil">Cliente</div><div className="div2">{cli?.nome || '—'}</div></div>
                <div className="di"><div className="dil">Origem</div><div className="div2">{carga.origem}</div></div>
                <div className="di"><div className="dil">Destino</div><div className="div2">{carga.destino}</div></div>
                <div className="di"><div className="dil">Data Coleta</div><div className="div2">{fmtD(carga.data_coleta)}</div></div>
                <div className="di"><div className="dil">Prev. Entrega</div><div className="div2">{fmtD(carga.previsao_entrega)}</div></div>
                <div className="di"><div className="dil">Entrega Real</div><div className="div2">{fmtD(carga.data_entrega_real)}</div></div>
                <div className="di">
                  <div className="dil">Comprovante</div>
                  <div className="div2">
                    {carga.comprovante_url
                      ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>✓ Recebido</span>
                      : <span style={{ color: 'var(--amber)' }}>Pendente</span>
                    }
                  </div>
                </div>
                <div className="di"><div className="dil">Responsável</div><div className="div2">{carga.usuarios?.nome || '—'}</div></div>
              </div>

              {admin && operacionais.length > 0 && (
                <div className="fg" style={{ marginTop: 14 }}>
                  <label className="fl">Atribuir a operacional</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select className="fi" value={opSel} onChange={ev => setOpSel(ev.target.value)} disabled={salvando} style={{ flex: 1 }}>
                      <option value="">— Nenhum —</option>
                      {operacionais.map(op => <option key={op.id} value={op.id}>{op.nome}</option>)}
                    </select>
                    <button className="btn btn-p btn-sm" onClick={atribuirOp} disabled={salvando || !opSel || opSel === carga.criado_por}>
                      Atribuir
                    </button>
                  </div>
                </div>
              )}

              {!carga.comprovante_url && canEdit && (
                <button className="btn btn-p btn-sm" style={{ marginTop: 10 }} onClick={confirmarComprovante} disabled={salvando}>
                  Confirmar recebimento
                </button>
              )}

              {canEdit && (
                <div className="fg" style={{ marginTop: 14 }}>
                  <label className="fl">Atualizar status</label>
                  <select className="fi" value={carga.status} onChange={ev => salvarStatus(ev.target.value)} disabled={salvando}>
                    {Object.entries(STS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {tab === 'cte' && (
            <div>
              <div className={`ibox ${carga.cte ? 'ibox-ok' : 'ibox-warn'}`}>
                {carga.cte ? `✓ CTE registrado: ${carga.cte}` : '⚠ CTE pendente — preencha quando o veículo carregar'}
              </div>
              {canEdit && (
                <div>
                  <div className="fg"><label className="fl">Número do CTE</label><input className="fi" value={cteV} onChange={ev => setCteV(ev.target.value)} placeholder="CTE-000000" /></div>
                  <button className="btn btn-p btn-sm" onClick={salvarCTE} disabled={salvando}>Salvar CTE</button>
                </div>
              )}
            </div>
          )}

          {tab === 'fin' && (
            <div>
              <div className="dgrid">
                <div className="di"><div className="dil">Frete Cobrado</div><div className="div2 mono sv-bl">{fmtR(carga.frete_cobrado)}</div></div>
                <div className="di"><div className="dil">Frete Pago</div><div className="div2 mono sv-am">{fmtR(carga.frete_pago)}</div></div>
              </div>
              <div className={`frete-liq-box${lq < 0 ? ' neg' : ''}`} style={{ marginTop: 12 }}>
                <div className={`frete-liq-label${lq < 0 ? ' neg' : ''}`}>Frete Líquido</div>
                <div className={`frete-liq-input${lq < 0 ? ' neg' : ''}`} style={{ display: 'flex', alignItems: 'center' }}>
                  {fmtR(lq)}
                </div>
              </div>
            </div>
          )}

          {tab === 'oc' && (
            <div>
              {(carga.ocorrencias || []).length === 0 && (
                <div className="empty-s" style={{ padding: 16 }}>Nenhuma ocorrência registrada</div>
              )}
              {(carga.ocorrencias || []).map((o, i) => (
                <div key={o.id || i} className="oc-item">
                  <div className="oc-top">
                    <span className="oc-tipo">{o.tipo}</span>
                    <span className="oc-dt">{fmtD(o.criado_em?.slice(0, 10))} {o.criado_em?.slice(11, 16)}</span>
                  </div>
                  <div>{o.descricao}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>por {o.usuario_nome}</div>
                </div>
              ))}
              {canEdit && (
                <div className="oc-add">
                  <div className="fsec" style={{ marginBottom: 10 }}>Registrar ocorrência</div>
                  <div className="fgrid">
                    <div className="fg">
                      <label className="fl">Tipo</label>
                      <select className="fi" value={ocF.tipo} onChange={ev => setOcF(p => ({ ...p, tipo: ev.target.value }))}>
                        {OC_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="fg" style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button className="btn btn-p" style={{ width: '100%' }} onClick={registrarOc} disabled={salvando || !ocF.descricao.trim()}>
                        Registrar
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="fi"
                    value={ocF.descricao}
                    onChange={ev => setOcF(p => ({ ...p, descricao: ev.target.value }))}
                    placeholder="Descreva o que aconteceu..."
                    rows={2}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mft">
          <div className="mft-nav">
            <button className="btn btn-s btn-sm" disabled={idx === 0} onClick={onPrev}>← Anterior</button>
            <span style={{ fontSize: 11, color: 'var(--text3)', padding: '0 4px', alignSelf: 'center' }}>{idx + 1} / {total}</span>
            <button className="btn btn-s btn-sm" disabled={idx >= total - 1} onClick={onNext}>Próximo →</button>
          </div>
          <button className="btn btn-g btn-sm" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
