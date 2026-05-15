import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { atualizarCarga, atualizarStatus, adicionarOcorrencia, getMonitoramento } from '../../services/cargas';
import { STS, OC_TIPOS, fmtR, fmtD } from '../../constants';
import SBadge from '../SBadge';
import TabMonitoramento from './TabMonitoramento';

const ETAPA_LABELS = { carregamento: 'Carga', em_transito: 'Trânsito', descarga: 'Descarga' };
const ETAPA_ICONS  = { carregamento: '📦', em_transito: '🚛', descarga: '🏭' };
const ETAPA_ORDER  = ['carregamento', 'em_transito', 'descarga'];
const MON_STATUS   = ['em_transito', 'entregue'];

const fCard = { background: '#F7F6F4', borderRadius: 10, padding: '10px 13px' };
const fLabel = { fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 3 };
const fValue = { fontSize: 13, color: 'var(--text)', fontWeight: 500 };
const divider = { height: 1, background: 'var(--border)', margin: '16px 0' };
const secTitle = { fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 10 };

export default function ModalDetalhe({ carga: cargaProp, total, idx, onPrev, onNext, clientes, mots, operacionais = [], onMonRefresh, onUpdate, onAddOc, onClose }) {
  const { usuario, isAdmin } = useAuth();
  const [tab, setTab] = useState('info');
  const [cteV, setCteV] = useState(cargaProp.cte || '');
  const [ocF, setOcF] = useState({ tipo: 'Atraso', descricao: '' });
  const [salvando, setSalvando] = useState(false);
  const [opSel, setOpSel] = useState(cargaProp.criado_por || '');
  const [monSteps, setMonSteps] = useState([]);
  const [closing, setClosing] = useState(false);

  const carga = cargaProp;
  const admin = isAdmin();
  const canEdit = admin || carga.criado_por === usuario?.id;
  const mot = carga.motoristas || mots?.find(m => m.id === carga.motorista_id);
  const cli = carga.clientes || clientes?.find(c => c.id === carga.cliente_id);
  const lq = carga.frete_liquido != null
    ? parseFloat(carga.frete_liquido)
    : (parseFloat(carga.frete_cobrado) || 0) - (parseFloat(carga.frete_pago) || 0);
  const cobrado = parseFloat(carga.frete_cobrado) || 0;
  const margem = cobrado > 0 ? Math.round((lq / cobrado) * 100) : null;

  const showMon = MON_STATUS.includes(carga.status);

  const stepMap = {};
  monSteps.forEach(s => { stepMap[s.etapa] = s; });

  const carregarMon = async () => {
    if (!showMon) return;
    try { setMonSteps(await getMonitoramento(carga.id)); } catch {}
  };

  useEffect(() => {
    setCteV(cargaProp.cte || '');
    setOpSel(cargaProp.criado_por || '');
    setMonSteps([]);
    carregarMon();
  }, [cargaProp.id]);

  useEffect(() => {
    if (showMon && monSteps.length === 0) carregarMon();
  }, [carga.status]);

  const lastCheckedKey = ETAPA_ORDER.slice().reverse().find(k => monSteps.find(s => s.etapa === k)?.concluido);
  const anyStepDone = !!lastCheckedKey;
  const monSubtitle = lastCheckedKey ? `• ${ETAPA_LABELS[lastCheckedKey]} em andamento` : null;

  const tabs = [
    { id: 'info', label: 'Info' },
    { id: 'cte',  label: 'CTE' },
    { id: 'mon',  label: 'Monitoramento' },
    { id: 'oc',   label: `Ocorrências (${(carga.ocorrencias || []).length})` },
  ];

  const salvarStatus = async status => {
    setSalvando(true);
    try { await atualizarStatus(carga.id, status); onUpdate(); }
    finally { setSalvando(false); }
  };

  const atribuirOp = async () => {
    if (!opSel) return;
    setSalvando(true);
    try { await atualizarCarga(carga.id, { criado_por: opSel }); await onUpdate(); }
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

  const handleMonRefresh = async () => { await carregarMon(); onMonRefresh?.(); };
  const handleCargaComplete = async () => { await carregarMon(); await onUpdate(); };
  const handleClose = () => { setClosing(true); setTimeout(onClose, 180); };

  return (
    <div className={`ov${closing ? ' closing' : ''}`}>
      <div className={`modal${closing ? ' closing' : ''}`} style={{ height: '90vh', overflowY: 'hidden' }}>

        {/* ── HEADER ── */}
        <div className="mhd">
          <div>
            {showMon ? (
              <>
                <div className="mttl">
                  {anyStepDone ? 'Em Andamento' : <span style={{ color: 'var(--amber)' }}>Aguardando CTE</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                  <SBadge status={carga.status} />
                  {monSubtitle
                    ? <span style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>{monSubtitle}</span>
                    : <span style={{ fontSize: 11, color: 'var(--text3)' }}>{carga.origem} → {carga.destino}</span>
                  }
                </div>
              </>
            ) : (
              <>
                <div className="mttl">{carga.cte || <span style={{ color: 'var(--amber)' }}>Aguardando CTE</span>}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                  <SBadge status={carga.status} />
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{carga.origem} → {carga.destino}</span>
                </div>
              </>
            )}
          </div>
          <button className="mx" onClick={handleClose}>×</button>
        </div>

        {/* ── TAB BAR (fixed, outside scrollable body) ── */}
        <div style={{ padding: '0 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface)' }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, fontFamily: 'var(--fn)',
                  color: tab === t.id ? 'var(--accent)' : 'var(--text3)',
                  borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: -1, transition: 'color .15s, border-color .15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── BODY (scrollable) ── */}
        <div className="mbd">

          {/* INFO */}
          {tab === 'info' && (
            <div>
              {mot && (
                <div className="driver-card" style={{ marginBottom: 16 }}>
                  <div className="driver-av">🚛</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{mot.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mo)', marginTop: 2 }}>
                      {[mot.tipo_veiculo || mot.carroceria, mot.placa_cavalo, mot.placa_carreta].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <SBadge status={carga.status} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 4 }}>
                {[
                  ['Nº da Carga', <span style={{ fontFamily: 'var(--mo)' }}>{carga.numero}</span>],
                  ['Cliente', cli?.nome || '—'],
                  ['Origem', carga.origem],
                  ['Destino', carga.destino],
                  ['Data Coleta', fmtD(carga.data_coleta)],
                  ['Prev. Entrega', fmtD(carga.previsao_entrega)],
                  ['Entrega Real', fmtD(carga.data_entrega_real)],
                  ['Comprovante', carga.comprovante_url
                    ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>✓ Recebido</span>
                    : <span style={{ color: 'var(--amber)' }}>Pendente</span>],
                  ['Responsável', carga.usuarios?.nome || '—'],
                ].map(([label, value], i) => (
                  <div key={i} style={fCard}>
                    <div style={fLabel}>{label}</div>
                    <div style={fValue}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={divider} />

              {admin && operacionais.length > 0 && (
                <div className="fg" style={{ marginBottom: 10 }}>
                  <label className="fl">Atribuir a operacional</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select className="fi" value={opSel} onChange={ev => setOpSel(ev.target.value)} disabled={salvando} style={{ flex: 1 }}>
                      <option value="">— Nenhum —</option>
                      {operacionais.map(op => <option key={op.id} value={op.id}>{op.nome}</option>)}
                    </select>
                    <button className="btn btn-p btn-sm" onClick={atribuirOp} disabled={salvando || !opSel}>Atribuir</button>
                  </div>
                </div>
              )}
              {!carga.comprovante_url && canEdit && (
                <button className="btn btn-p btn-sm" style={{ marginBottom: 10 }} onClick={confirmarComprovante} disabled={salvando}>
                  Confirmar recebimento
                </button>
              )}
              {canEdit && (
                <div className="fg">
                  <label className="fl">Atualizar status</label>
                  <select className="fi" value={carga.status} onChange={ev => salvarStatus(ev.target.value)} disabled={salvando}>
                    {Object.entries(STS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* CTE + FINANCEIRO */}
          {tab === 'cte' && (
            <div>
              <div style={secTitle}>Documento CTE</div>
              <div className={`ibox ${carga.cte ? 'ibox-ok' : 'ibox-warn'}`}>
                {carga.cte ? `✓ CTE registrado: ${carga.cte}` : '⚠ CTE pendente — preencha quando o veículo carregar'}
              </div>
              {canEdit && (
                <div style={{ marginTop: 10 }}>
                  <div className="fg">
                    <label className="fl">Número do CTE</label>
                    <input className="fi" value={cteV} onChange={ev => setCteV(ev.target.value)} placeholder="CTE-000000" />
                  </div>
                  <button className="btn btn-p btn-sm" onClick={salvarCTE} disabled={salvando}>Salvar CTE</button>
                </div>
              )}

              <div style={divider} />

              <div style={secTitle}>Financeiro</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div style={fCard}>
                  <div style={fLabel}>Cobrado</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1E3A8A', fontFamily: 'var(--mo)' }}>{fmtR(carga.frete_cobrado)}</div>
                </div>
                <div style={fCard}>
                  <div style={fLabel}>Pago</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#92400E', fontFamily: 'var(--mo)' }}>{fmtR(carga.frete_pago)}</div>
                </div>
                <div style={{ background: lq >= 0 ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${lq >= 0 ? '#86EFAC' : '#FECACA'}`, borderRadius: 10, padding: '10px 13px' }}>
                  <div style={fLabel}>Líquido</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: lq >= 0 ? '#15803D' : '#DC2626', fontFamily: 'var(--mo)' }}>{fmtR(lq)}</div>
                  {margem !== null && (
                    <div style={{ fontSize: 10, color: lq >= 0 ? '#16A34A' : '#EF4444', fontWeight: 600, marginTop: 4 }}>{margem}% margem</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MONITORAMENTO */}
          {tab === 'mon' && (
            <div>
              {!showMon ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                  Monitoramento disponível quando a carga estiver em trânsito.
                </div>
              ) : (
                <>
                  {/* Progress bar */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 24 }}>
                    {ETAPA_ORDER.map((key, i) => {
                      const done = !!stepMap[key]?.concluido;
                      const isActive = !done && ETAPA_ORDER.find(k => !stepMap[k]?.concluido) === key;
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'initial' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%',
                              background: done ? '#22C55E' : isActive ? '#3B82F6' : '#E5E7EB',
                              color: done || isActive ? '#fff' : '#9CA3AF',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: done ? 16 : 13, fontWeight: 700,
                              boxShadow: isActive ? '0 0 0 5px rgba(59,130,246,.18)' : 'none',
                              animation: isActive ? 'mon-pulse 1.8s ease-in-out infinite' : 'none',
                              transition: 'background .3s, box-shadow .3s', flexShrink: 0,
                            }}>
                              {done ? '✓' : i + 1}
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap', color: done ? '#16A34A' : isActive ? '#2563EB' : '#9CA3AF' }}>
                              {ETAPA_ICONS[key]} {ETAPA_LABELS[key]}
                            </div>
                          </div>
                          {i < 2 && (
                            <div style={{ flex: 1, height: 3, background: done ? '#22C55E' : '#E5E7EB', margin: '0 8px', marginBottom: 22, borderRadius: 2, transition: 'background .3s' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <TabMonitoramento
                    cargaId={carga.id}
                    steps={monSteps}
                    canEdit={canEdit}
                    onRefresh={handleMonRefresh}
                    onComplete={handleCargaComplete}
                  />
                </>
              )}
            </div>
          )}

          {/* OCORRÊNCIAS */}
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

        {/* ── FOOTER ── */}
        <div className="mft">
          <div className="mft-nav">
            <button className="btn btn-s btn-sm" disabled={idx === 0} onClick={onPrev}>← Anterior</button>
            <span style={{ fontSize: 11, color: 'var(--text3)', padding: '0 4px', alignSelf: 'center' }}>{idx + 1} / {total}</span>
            <button className="btn btn-s btn-sm" disabled={idx >= total - 1} onClick={onNext}>Próximo →</button>
          </div>
          <button className="btn btn-g btn-sm" onClick={handleClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
