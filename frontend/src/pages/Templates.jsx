import { useState, useEffect, useCallback } from 'react';
import { listarTemplates, criarTemplate, deletarTemplate } from '../services/templates';
import { listarClientes } from '../services/clientes';
import { listarCargas, obterCarga } from '../services/cargas';
import { VEICULOS, fmtD } from '../constants';
import CidadeSelect from '../components/CidadeSelect';
import Icon from '../components/Icon';

const EMPTY_FORM = {
  coleta: false, coleta_data: '',
  entrega: false, entrega_data: '',
  origem: '', destino: '',
  peso: '', produto: '', veiculo: '',
  numeros: [''],
};

function buildMsg(f) {
  const lines = [];
  if (f.coleta) lines.push(`📅 COLETA: ${f.coleta_data ? fmtD(f.coleta_data) : 'A combinar'}`);
  if (f.entrega) lines.push(`📅 ENTREGA: ${f.entrega_data ? fmtD(f.entrega_data) : 'A combinar'}`);
  const o = (f.origem || '{ORIGEM}').toUpperCase();
  const d = (f.destino || '{DESTINO}').toUpperCase();
  lines.push(`▶️ ${o} X ${d}`);
  if (f.peso) lines.push(`⚖️ PESO: ${f.peso}`);
  if (f.produto) lines.push(`📦 PRODUTO: ${f.produto}`);
  if (f.veiculo) lines.push(`🚛 TIPO DE VEÍCULO: ${f.veiculo}`);
  const nums = f.numeros.filter(n => n.trim());
  if (nums.length) {
    lines.push('');
    lines.push('Interessados chamar no WhatsApp:');
    nums.forEach(n => lines.push(`wa.me/${n.replace(/\D/g, '')}`));
  }
  return lines.join('\n');
}

function buildMsgFromTemplate(t) {
  const lines = [];
  const o = (t.origem || '{ORIGEM}').toUpperCase();
  const d = (t.destino || '{DESTINO}').toUpperCase();
  lines.push(`▶️ ${o} X ${d}`);
  if (t.peso) lines.push(`⚖️ PESO: ${t.peso}`);
  if (t.produto) lines.push(`📦 PRODUTO: ${t.produto}`);
  if (t.veiculo) lines.push(`🚛 TIPO DE VEÍCULO: ${t.veiculo}`);
  const nums = (t.numeros_whatsapp || []).filter(n => n.trim());
  if (nums.length) {
    lines.push('');
    lines.push('Interessados chamar no WhatsApp:');
    nums.forEach(n => lines.push(`wa.me/${n.replace(/\D/g, '')}`));
  }
  return lines.join('\n');
}

const ToggleBtn = ({ on, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      background: on ? '#16a34a' : 'var(--surface2)',
      color: on ? '#fff' : 'var(--text3)',
      border: '1.5px solid ' + (on ? '#16a34a' : 'var(--border)'),
      borderRadius: 20,
      padding: '4px 14px',
      fontSize: 11,
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all .18s',
      fontFamily: 'var(--fn)',
      letterSpacing: .3,
    }}
  >
    {on ? '✓ ' + label : label}
  </button>
);

export default function Templates({ cargaId: initCargaId }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [linkedCarga, setLinkedCarga] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [filterCliente, setFilterCliente] = useState('todos');
  const [showSave, setShowSave] = useState(false);
  const [showCargaModal, setShowCargaModal] = useState(false);
  const [saveNome, setSaveNome] = useState('');
  const [saveClienteId, setSaveClienteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [cargasAtivas, setCargasAtivas] = useState([]);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);

  const upd = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const showToast = msg => {
    const id = Date.now();
    setToast({ msg, id });
    setTimeout(() => setToast(t => t?.id === id ? null : t), 3000);
  };

  const carregar = useCallback(async () => {
    const [ts, cl] = await Promise.all([listarTemplates(), listarClientes()]);
    setTemplates(ts);
    setClientes(cl);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (!initCargaId) return;
    obterCarga(initCargaId).then(c => {
      setLinkedCarga(c);
      setForm(f => ({
        ...f,
        origem: c.origem || '',
        destino: c.destino || '',
        coleta: !!c.data_coleta,
        coleta_data: c.data_coleta || '',
        entrega: !!c.previsao_entrega,
        entrega_data: c.previsao_entrega || '',
      }));
    }).catch(() => {});
  }, [initCargaId]);

  const abrirCargaModal = async () => {
    const cg = await listarCargas().catch(() => []);
    setCargasAtivas(cg.filter(c => c.status === 'aguardando' || c.status === 'em_transito'));
    setShowCargaModal(true);
  };

  const vincularCarga = c => {
    setLinkedCarga(c);
    setForm(f => ({
      ...f,
      origem: c.origem || f.origem,
      destino: c.destino || f.destino,
      coleta: !!c.data_coleta,
      coleta_data: c.data_coleta || '',
      entrega: !!c.previsao_entrega,
      entrega_data: c.previsao_entrega || '',
    }));
    setShowCargaModal(false);
  };

  const handleSaveTemplate = async () => {
    if (!saveNome.trim()) return;
    setSaving(true);
    try {
      await criarTemplate({
        nome: saveNome.trim(),
        cliente_id: saveClienteId || null,
        origem: form.origem || null,
        destino: form.destino || null,
        peso: form.peso || null,
        produto: form.produto || null,
        veiculo: form.veiculo || null,
        numeros_whatsapp: form.numeros.filter(n => n.trim()),
      });
      await carregar();
      setShowSave(false);
      setSaveNome('');
      setSaveClienteId('');
      showToast('Template salvo com sucesso');
    } finally {
      setSaving(false);
    }
  };

  const handleUsarTemplate = t => {
    setForm({
      coleta: false, coleta_data: '',
      entrega: false, entrega_data: '',
      origem: t.origem || '',
      destino: t.destino || '',
      peso: t.peso || '',
      produto: t.produto || '',
      veiculo: t.veiculo || '',
      numeros: t.numeros_whatsapp?.length ? t.numeros_whatsapp : [''],
    });
    setLinkedCarga(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Template "${t.nome}" carregado`);
  };

  const handleDeleteTemplate = async id => {
    await deletarTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    showToast('Template excluído');
  };

  const handleOpenWA = () => {
    const msg = buildMsg(form);
    const nums = form.numeros.filter(n => n.trim());
    if (!nums.length) { showToast('Adicione ao menos um número'); return; }
    const clean = nums[0].replace(/\D/g, '');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleWACard = t => {
    const msg = buildMsgFromTemplate(t);
    const nums = (t.numeros_whatsapp || []).filter(n => n.trim());
    if (!nums.length) { showToast('Template sem número cadastrado'); return; }
    const clean = nums[0].replace(/\D/g, '');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleCopy = async () => {
    const msg = buildMsg(form);
    await navigator.clipboard.writeText(msg).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Mensagem copiada!');
  };

  const addNumero = () => setForm(f => ({ ...f, numeros: [...f.numeros, ''] }));
  const rmNumero = i => setForm(f => ({ ...f, numeros: f.numeros.filter((_, idx) => idx !== i) }));
  const setNumero = (i, v) => setForm(f => {
    const ns = [...f.numeros];
    ns[i] = v;
    return { ...f, numeros: ns };
  });

  const clientesComTemplates = [...new Set(
    templates.filter(t => t.cliente_id).map(t => t.cliente_id)
  )].map(id => clientes.find(c => c.id === id)).filter(Boolean);

  const filteredTemplates = filterCliente === 'todos'
    ? templates
    : filterCliente === 'sem_cliente'
      ? templates.filter(t => !t.cliente_id)
      : templates.filter(t => t.cliente_id === filterCliente);

  const msg = buildMsg(form);

  const fieldLabel = { fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 4, letterSpacing: .3, textTransform: 'uppercase' };
  const fieldGroup = { marginBottom: 14 };

  return (
    <div>
      {/* Top: form + preview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24, alignItems: 'start' }}>

        {/* LEFT — form */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 18, color: 'var(--text)', letterSpacing: -.2 }}>
            Composição do Anúncio
          </div>

          {/* Datas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={fieldLabel}>Coleta</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <ToggleBtn on={form.coleta} onClick={() => upd('coleta', !form.coleta)} label="Coleta" />
              </div>
              {form.coleta && (
                <input
                  type="date"
                  className="fi"
                  style={{ marginTop: 8 }}
                  value={form.coleta_data}
                  onChange={e => upd('coleta_data', e.target.value)}
                />
              )}
            </div>
            <div>
              <div style={fieldLabel}>Entrega</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <ToggleBtn on={form.entrega} onClick={() => upd('entrega', !form.entrega)} label="Entrega" />
              </div>
              {form.entrega && (
                <input
                  type="date"
                  className="fi"
                  style={{ marginTop: 8 }}
                  value={form.entrega_data}
                  onChange={e => upd('entrega_data', e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Rota */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, ...fieldGroup }}>
            <div>
              <div style={fieldLabel}>Origem</div>
              <CidadeSelect value={form.origem} onChange={v => upd('origem', v)} placeholder="Cidade de origem" />
            </div>
            <div>
              <div style={fieldLabel}>Destino</div>
              <CidadeSelect value={form.destino} onChange={v => upd('destino', v)} placeholder="Cidade de destino" />
            </div>
          </div>

          {/* Carga info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, ...fieldGroup }}>
            <div>
              <div style={fieldLabel}>Peso</div>
              <input className="fi" placeholder="Ex: 28.000 kg" value={form.peso} onChange={e => upd('peso', e.target.value)} />
            </div>
            <div>
              <div style={fieldLabel}>Produto</div>
              <input className="fi" placeholder="Ex: Cimento" value={form.produto} onChange={e => upd('produto', e.target.value)} />
            </div>
          </div>

          <div style={fieldGroup}>
            <div style={fieldLabel}>Tipo de Veículo</div>
            <select className="fi" value={form.veiculo} onChange={e => upd('veiculo', e.target.value)}>
              <option value="">Selecione o veículo...</option>
              {VEICULOS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* WhatsApp numbers */}
          <div style={fieldGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={fieldLabel}>Números WhatsApp</div>
              <button type="button" className="btn btn-g btn-xs" onClick={addNumero}>+ Adicionar</button>
            </div>
            {form.numeros.map((n, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input
                  className="fi"
                  placeholder="5511999999999"
                  value={n}
                  onChange={e => setNumero(i, e.target.value)}
                  style={{ flex: 1 }}
                />
                {form.numeros.length > 1 && (
                  <button
                    type="button"
                    onClick={() => rmNumero(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}
                  >×</button>
                )}
              </div>
            ))}
          </div>

          {/* Vincular carga */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            {linkedCarga ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '5px 10px', fontSize: 12, flex: 1,
                  color: 'var(--text2)', fontWeight: 500,
                }}>
                  📦 {linkedCarga.numero || linkedCarga.cte || linkedCarga.id.slice(0, 8)}
                  {linkedCarga.clientes && <span style={{ color: 'var(--text3)', marginLeft: 6 }}>{linkedCarga.clientes.nome}</span>}
                </div>
                <button type="button" className="btn btn-g btn-sm" onClick={() => { setLinkedCarga(null); }}>Desvincular</button>
              </div>
            ) : (
              <button type="button" className="btn btn-g btn-sm" onClick={abrirCargaModal} style={{ width: '100%' }}>
                🔗 Vincular carga
              </button>
            )}
          </div>
        </div>

        {/* RIGHT — WhatsApp preview */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 10, letterSpacing: .3, textTransform: 'uppercase' }}>
            Preview WhatsApp
          </div>

          {/* Phone mockup */}
          <div style={{ background: '#111b21', borderRadius: 16, overflow: 'hidden', border: '1px solid #2a3942', marginBottom: 12 }}>
            {/* WA header */}
            <div style={{ background: '#202c33', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#025c4c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>📦</div>
              <div>
                <div style={{ color: '#e9edef', fontSize: 13, fontWeight: 600 }}>Anúncio de Carga</div>
                <div style={{ color: '#8696a0', fontSize: 11 }}>S.O.L - Super Operador Logístico</div>
              </div>
            </div>
            {/* Chat area */}
            <div style={{ padding: '16px 12px 20px', minHeight: 220, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ background: '#005c4b', borderRadius: '12px 2px 12px 12px', padding: '10px 14px', maxWidth: '92%', position: 'relative' }}>
                <pre style={{ margin: 0, color: '#e9edef', fontSize: 12.5, fontFamily: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.55 }}>
                  {msg || '(preencha o formulário para ver o preview)'}
                </pre>
                <div style={{ textAlign: 'right', marginTop: 4, color: '#8696a0', fontSize: 10 }}>
                  {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ✓✓
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-p btn-sm" onClick={handleOpenWA} style={{ background: '#128c7e' }}>
              📲 Abrir no WhatsApp Web
            </button>
            <button className="btn btn-g btn-sm" onClick={handleCopy}>
              {copied ? '✓ Copiado!' : <><Icon n="copy" sz={13} /> Copiar mensagem</>}
            </button>
            <button className="btn btn-g btn-sm" onClick={() => { setSaveNome(''); setSaveClienteId(''); setShowSave(true); }}>
              💾 Salvar template
            </button>
          </div>
        </div>
      </div>

      {/* Bottom: saved templates */}
      <div className="card">
        <div className="card-hd">
          <div className="card-ttl">Templates Salvos</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{templates.length} template{templates.length !== 1 ? 's' : ''}</div>
        </div>

        <div style={{ padding: '14px 18px' }}>
          {/* Filter chips */}
          {clientesComTemplates.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {[
                { id: 'todos', label: 'Todos' },
                ...clientesComTemplates.map(c => ({ id: c.id, label: c.nome })),
                { id: 'sem_cliente', label: 'Sem cliente' },
              ].map(chip => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilterCliente(chip.id)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--fn)',
                    border: '1.5px solid ' + (filterCliente === chip.id ? 'var(--accent)' : 'var(--border)'),
                    background: filterCliente === chip.id ? 'var(--accent)' : 'var(--surface)',
                    color: filterCliente === chip.id ? '#fff' : 'var(--text2)',
                    transition: 'all .15s',
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {filteredTemplates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 12 }}>
              Nenhum template salvo ainda. Use o formulário acima para criar.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {filteredTemplates.map(t => (
                <div key={t.id} style={{
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  background: 'var(--surface)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{t.nome}</div>
                    {t.clientes && (
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                        background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)',
                        whiteSpace: 'nowrap', marginLeft: 8,
                      }}>
                        {t.clientes.nome}
                      </span>
                    )}
                  </div>
                  {(t.origem || t.destino) && (
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
                      {t.origem || '?'} → {t.destino || '?'}
                    </div>
                  )}
                  {(t.produto || t.veiculo) && (
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>
                      {[t.produto, t.veiculo].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {!t.produto && !t.veiculo && !t.origem && !t.destino && (
                    <div style={{ marginBottom: 10 }} />
                  )}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn-g btn-xs" onClick={() => handleUsarTemplate(t)}>
                      Usar
                    </button>
                    <button
                      className="btn btn-xs"
                      style={{ background: '#128c7e', color: '#fff', border: 'none' }}
                      onClick={() => handleWACard(t)}
                    >
                      📲 WA
                    </button>
                    <button className="btn btn-d btn-xs" onClick={() => handleDeleteTemplate(t.id)}>
                      <Icon n="trash" sz={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save template modal */}
      {showSave && (
        <div className="modal-overlay" onClick={() => setShowSave(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <div className="modal-title">Salvar Template</div>
              <button className="modal-close" onClick={() => setShowSave(false)}><Icon n="close" sz={16} /></button>
            </div>
            <div className="modal-body">
              <div style={fieldGroup}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Nome do template *</div>
                <input
                  className="fi"
                  placeholder="Ex: SP → BH Granel"
                  value={saveNome}
                  onChange={e => setSaveNome(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
                  autoFocus
                />
              </div>
              <div style={fieldGroup}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Vincular a cliente</div>
                <select className="fi" value={saveClienteId} onChange={e => setSaveClienteId(e.target.value)}>
                  <option value="">Sem cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-ft">
              <button className="btn btn-g" onClick={() => setShowSave(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={handleSaveTemplate} disabled={saving || !saveNome.trim()}>
                {saving ? 'Salvando...' : '💾 Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vincular carga modal */}
      {showCargaModal && (
        <div className="modal-overlay" onClick={() => setShowCargaModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <div className="modal-title">Vincular Carga</div>
              <button className="modal-close" onClick={() => setShowCargaModal(false)}><Icon n="close" sz={16} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: 360, overflowY: 'auto' }}>
              {cargasAtivas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)', fontSize: 12 }}>
                  Nenhuma carga ativa disponível
                </div>
              ) : cargasAtivas.map(c => (
                <div
                  key={c.id}
                  onClick={() => vincularCarga(c)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: '1px solid var(--border)',
                    marginBottom: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background .12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{c.numero || c.cte || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {c.origem} → {c.destino}
                      {c.clientes && <span style={{ marginLeft: 6 }}>· {c.clientes.nome}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: 'var(--surface2)', color: 'var(--text3)', fontWeight: 600 }}>
                    {c.status === 'aguardando' ? 'Divulgação' : 'Em Andamento'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast-ok">✓ {toast.msg}</div>}
    </div>
  );
}
