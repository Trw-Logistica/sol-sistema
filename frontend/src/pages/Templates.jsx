import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { listarTemplates, criarTemplate, deletarTemplate } from '../services/templates';
import { listarClientes } from '../services/clientes';
import { listarCargas, obterCarga } from '../services/cargas';
import { listarGrupos, criarGrupo, deletarGrupo } from '../services/grupos';
import { listarResponsaveis } from '../services/usuarios';
import { VEICULOS, fmtD } from '../constants';
import CidadeSelect from '../components/CidadeSelect';
import Icon from '../components/Icon';

/* ── helpers ───────────────────────────────────────────── */

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

/* ── sub-components ────────────────────────────────────── */

const ToggleBtn = ({ on, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      background: on ? '#16a34a' : 'var(--surface2)',
      color: on ? '#fff' : 'var(--text3)',
      border: '1.5px solid ' + (on ? '#16a34a' : 'var(--border)'),
      borderRadius: 20, padding: '4px 14px',
      fontSize: 11, fontWeight: 700, cursor: 'pointer',
      transition: 'all .18s', fontFamily: 'var(--fn)', letterSpacing: .3,
    }}
  >
    {on ? `✓ ${label}` : label}
  </button>
);

function VeiculoInput({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const blurTimer = useRef(null);

  const filtered = VEICULOS.filter(v =>
    !value || v.toLowerCase().includes(value.toLowerCase())
  );

  const select = v => {
    clearTimeout(blurTimer.current);
    onChange(v);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="fi"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 150); }}
        placeholder="Digite ou selecione..."
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, zIndex: 9999,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.12)', overflow: 'hidden',
        }}>
          {filtered.map(v => (
            <div
              key={v}
              onMouseDown={() => select(v)}
              style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', color: 'var(--text)', fontFamily: 'var(--fn)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; }}
            >
              {v}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── main page ─────────────────────────────────────────── */

export default function Templates({ cargaId: initCargaId }) {
  const { usuario, isAdmin } = useAuth();
  const admin = isAdmin();

  const [form, setForm] = useState(EMPTY_FORM);
  const [linkedCarga, setLinkedCarga] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [operacionais, setOperacionais] = useState([]);
  const [responsavel, setResponsavel] = useState('');
  const [filterCliente, setFilterCliente] = useState('todos');

  // modals / ui
  const [showSave, setShowSave] = useState(false);
  const [showCargaModal, setShowCargaModal] = useState(false);
  const [showAddGrupo, setShowAddGrupo] = useState(false);
  const [saveNome, setSaveNome] = useState('');
  const [saveClienteId, setSaveClienteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [novoGrupoNome, setNovoGrupoNome] = useState('');
  const [novoGrupoLink, setNovoGrupoLink] = useState('');
  const [savingGrupo, setSavingGrupo] = useState(false);
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
    const [ts, cl, gps, ops] = await Promise.all([
      listarTemplates().catch(err => { console.error('[Templates] templates:', err); return []; }),
      listarClientes().catch(err => { console.error('[Templates] clientes:', err); return []; }),
      listarGrupos().catch(err => { console.warn('[Templates] grupos:', err); return []; }),
      listarResponsaveis().catch(err => { console.error('[Templates] usuários:', err?.response?.data || err.message); return []; }),
    ]);
    setTemplates(ts);
    setClientes(cl);
    setGrupos(gps);
    console.log('[Templates] usuários carregados:', ops.length, ops);
    setOperacionais(ops);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // auto-fill logged-in user's phone on mount
  useEffect(() => {
    if (usuario?.telefone) {
      setForm(f => ({ ...f, numeros: [usuario.telefone] }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // pre-fill from linked carga
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

  const handleResponsavel = id => {
    setResponsavel(id);
    if (!id) return;
    const op = operacionais.find(u => u.id === id);
    if (!op) return;
    if (!op.telefone) { showToast(`${op.nome} não tem telefone cadastrado`); return; }
    setForm(f => {
      if (f.numeros.includes(op.telefone)) return f;
      const clean = f.numeros.filter(n => n.trim());
      return { ...f, numeros: clean.length ? [...clean, op.telefone] : [op.telefone] };
    });
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
      setSaveNome(''); setSaveClienteId('');
      showToast('Template salvo com sucesso');
    } finally { setSaving(false); }
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
    await navigator.clipboard.writeText(buildMsg(form)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Mensagem copiada!');
  };

  const handleDivulgarGrupo = async g => {
    await navigator.clipboard.writeText(buildMsg(form)).catch(() => {});
    showToast('Mensagem copiada! Cole no grupo.');
    window.open(g.link, '_blank');
  };

  const handleAddGrupo = async () => {
    if (!novoGrupoNome.trim() || !novoGrupoLink.trim()) return;
    setSavingGrupo(true);
    try {
      const novo = await criarGrupo({ nome: novoGrupoNome.trim(), link: novoGrupoLink.trim() });
      setGrupos(prev => [novo, ...prev]);
      setNovoGrupoNome(''); setNovoGrupoLink('');
      setShowAddGrupo(false);
      showToast('Grupo adicionado');
    } finally { setSavingGrupo(false); }
  };

  const handleDeleteGrupo = async id => {
    await deletarGrupo(id);
    setGrupos(prev => prev.filter(g => g.id !== id));
    showToast('Grupo removido');
  };

  const addNumero = () => setForm(f => ({ ...f, numeros: [...f.numeros, ''] }));
  const rmNumero = i => setForm(f => ({ ...f, numeros: f.numeros.filter((_, idx) => idx !== i) }));
  const setNumero = (i, v) => setForm(f => { const ns = [...f.numeros]; ns[i] = v; return { ...f, numeros: ns }; });

  const clientesComTemplates = [...new Set(templates.filter(t => t.cliente_id).map(t => t.cliente_id))]
    .map(id => clientes.find(c => c.id === id)).filter(Boolean);

  const filteredTemplates = filterCliente === 'todos'
    ? templates
    : filterCliente === 'sem_cliente'
      ? templates.filter(t => !t.cliente_id)
      : templates.filter(t => t.cliente_id === filterCliente);

  const msg = buildMsg(form);

  const FL = { fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 4, letterSpacing: .3, textTransform: 'uppercase' };
  const FG = { marginBottom: 14 };

  return (
    <div>
      {/* ── Composição + Preview ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24, alignItems: 'start' }}>

        {/* LEFT — form */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 18, color: 'var(--text)', letterSpacing: -.2 }}>
            Composição do Anúncio
          </div>

          {/* Datas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={FL}>Coleta</div>
              <ToggleBtn on={form.coleta} onClick={() => upd('coleta', !form.coleta)} label="Coleta" />
              {form.coleta && <input type="date" className="fi" style={{ marginTop: 8 }} value={form.coleta_data} onChange={e => upd('coleta_data', e.target.value)} />}
            </div>
            <div>
              <div style={FL}>Entrega</div>
              <ToggleBtn on={form.entrega} onClick={() => upd('entrega', !form.entrega)} label="Entrega" />
              {form.entrega && <input type="date" className="fi" style={{ marginTop: 8 }} value={form.entrega_data} onChange={e => upd('entrega_data', e.target.value)} />}
            </div>
          </div>

          {/* Rota */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, ...FG }}>
            <div>
              <div style={FL}>Origem</div>
              <CidadeSelect value={form.origem} onChange={v => upd('origem', v)} placeholder="Cidade de origem" />
            </div>
            <div>
              <div style={FL}>Destino</div>
              <CidadeSelect value={form.destino} onChange={v => upd('destino', v)} placeholder="Cidade de destino" />
            </div>
          </div>

          {/* Carga */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, ...FG }}>
            <div>
              <div style={FL}>Peso</div>
              <input className="fi" placeholder="Ex: 28.000 kg" value={form.peso} onChange={e => upd('peso', e.target.value)} />
            </div>
            <div>
              <div style={FL}>Produto</div>
              <input className="fi" placeholder="Ex: Cimento" value={form.produto} onChange={e => upd('produto', e.target.value)} />
            </div>
          </div>

          <div style={FG}>
            <div style={FL}>Tipo de Veículo</div>
            <VeiculoInput value={form.veiculo} onChange={v => upd('veiculo', v)} />
          </div>

          {/* Responsável */}
          <div style={FG}>
            <div style={FL}>Responsável</div>
            <select
              className="fi"
              value={responsavel}
              onChange={e => handleResponsavel(e.target.value)}
            >
              <option value="">Selecione para adicionar número...</option>
              {operacionais.map(u => (
                <option key={u.id} value={u.id}>
                  {u.nome}{u.telefone ? ` · ${u.telefone}` : ' (sem WhatsApp)'}
                </option>
              ))}
            </select>
          </div>

          {/* WhatsApp numbers */}
          <div style={FG}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={FL}>Números WhatsApp</div>
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
                  <button type="button" onClick={() => rmNumero(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>×</button>
                )}
              </div>
            ))}
          </div>

          {/* Vincular carga */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            {linkedCarga ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', fontSize: 12, flex: 1, color: 'var(--text2)', fontWeight: 500 }}>
                  📦 {linkedCarga.numero || linkedCarga.cte || linkedCarga.id.slice(0, 8)}
                  {linkedCarga.clientes && <span style={{ color: 'var(--text3)', marginLeft: 6 }}>{linkedCarga.clientes.nome}</span>}
                </div>
                <button type="button" className="btn btn-g btn-sm" onClick={() => setLinkedCarga(null)}>Desvincular</button>
              </div>
            ) : (
              <button type="button" className="btn btn-g btn-sm" onClick={abrirCargaModal} style={{ width: '100%' }}>
                🔗 Vincular carga
              </button>
            )}
          </div>
        </div>

        {/* RIGHT — preview */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 10, letterSpacing: .3, textTransform: 'uppercase' }}>
            Preview WhatsApp
          </div>
          <div style={{ background: '#111b21', borderRadius: 16, overflow: 'hidden', border: '1px solid #2a3942', marginBottom: 12 }}>
            <div style={{ background: '#202c33', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#025c4c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>📦</div>
              <div>
                <div style={{ color: '#e9edef', fontSize: 13, fontWeight: 600 }}>Anúncio de Carga</div>
                <div style={{ color: '#8696a0', fontSize: 11 }}>S.O.L - Super Operador Logístico</div>
              </div>
            </div>
            <div style={{ padding: '16px 12px 20px', minHeight: 220, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ background: '#005c4b', borderRadius: '12px 2px 12px 12px', padding: '10px 14px', maxWidth: '92%' }}>
                <pre style={{ margin: 0, color: '#e9edef', fontSize: 12.5, fontFamily: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.55 }}>
                  {msg || '(preencha o formulário para ver o preview)'}
                </pre>
                <div style={{ textAlign: 'right', marginTop: 4, color: '#8696a0', fontSize: 10 }}>
                  {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ✓✓
                </div>
              </div>
            </div>
          </div>
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

      {/* ── Grupos WhatsApp ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-hd">
          <div className="card-ttl">Grupos WhatsApp</div>
          {admin && (
            <button className="btn btn-g btn-sm" onClick={() => { setNovoGrupoNome(''); setNovoGrupoLink(''); setShowAddGrupo(true); }}>
              + Adicionar grupo
            </button>
          )}
        </div>
        <div style={{ padding: '14px 18px' }}>
          {grupos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', fontSize: 12 }}>
              {admin ? 'Nenhum grupo cadastrado. Clique em "+ Adicionar grupo" para começar.' : 'Nenhum grupo cadastrado.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {grupos.map(g => (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)' }}>
                  <div style={{ fontSize: 20, flexShrink: 0 }}>👥</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{g.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.link}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn btn-sm"
                      style={{ background: '#128c7e', color: '#fff', border: 'none' }}
                      onClick={() => handleDivulgarGrupo(g)}
                    >
                      📲 Divulgar
                    </button>
                    {admin && (
                      <button className="btn btn-d btn-sm" onClick={() => handleDeleteGrupo(g.id)}>
                        <Icon n="trash" sz={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Templates salvos ── */}
      <div className="card">
        <div className="card-hd">
          <div className="card-ttl">Templates Salvos</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{templates.length} template{templates.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ padding: '14px 18px' }}>
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
                    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--fn)',
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
                <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{t.nome}</div>
                    {t.clientes && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', whiteSpace: 'nowrap', marginLeft: 8 }}>
                        {t.clientes.nome}
                      </span>
                    )}
                  </div>
                  {(t.origem || t.destino) && (
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>{t.origem || '?'} → {t.destino || '?'}</div>
                  )}
                  {(t.produto || t.veiculo) && (
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>
                      {[t.produto, t.veiculo].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {!t.produto && !t.veiculo && !t.origem && !t.destino && <div style={{ marginBottom: 10 }} />}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn-g btn-xs" onClick={() => handleUsarTemplate(t)}>Usar</button>
                    <button className="btn btn-xs" style={{ background: '#128c7e', color: '#fff', border: 'none' }} onClick={() => handleWACard(t)}>📲 WA</button>
                    <button className="btn btn-d btn-xs" onClick={() => handleDeleteTemplate(t.id)}><Icon n="trash" sz={11} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Salvar template ── */}
      {showSave && (
        <div className="modal-overlay" onClick={() => setShowSave(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <div className="modal-title">Salvar Template</div>
              <button className="modal-close" onClick={() => setShowSave(false)}><Icon n="close" sz={16} /></button>
            </div>
            <div className="modal-body">
              <div style={FG}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Nome do template *</div>
                <input className="fi" placeholder="Ex: SP → BH Granel" value={saveNome} onChange={e => setSaveNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()} autoFocus />
              </div>
              <div style={FG}>
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

      {/* ── Modal: Adicionar grupo ── */}
      {showAddGrupo && (
        <div className="modal-overlay" onClick={() => setShowAddGrupo(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <div className="modal-title">Adicionar Grupo WhatsApp</div>
              <button className="modal-close" onClick={() => setShowAddGrupo(false)}><Icon n="close" sz={16} /></button>
            </div>
            <div className="modal-body">
              <div style={FG}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Nome do grupo *</div>
                <input className="fi" placeholder="Ex: Transportadoras SP" value={novoGrupoNome} onChange={e => setNovoGrupoNome(e.target.value)} autoFocus />
              </div>
              <div style={FG}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Link do grupo *</div>
                <input className="fi" placeholder="https://chat.whatsapp.com/..." value={novoGrupoLink} onChange={e => setNovoGrupoLink(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddGrupo()} />
              </div>
            </div>
            <div className="modal-ft">
              <button className="btn btn-g" onClick={() => setShowAddGrupo(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={handleAddGrupo} disabled={savingGrupo || !novoGrupoNome.trim() || !novoGrupoLink.trim()}>
                {savingGrupo ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Vincular carga ── */}
      {showCargaModal && (
        <div className="modal-overlay" onClick={() => setShowCargaModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <div className="modal-title">Vincular Carga</div>
              <button className="modal-close" onClick={() => setShowCargaModal(false)}><Icon n="close" sz={16} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: 360, overflowY: 'auto' }}>
              {cargasAtivas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)', fontSize: 12 }}>Nenhuma carga ativa disponível</div>
              ) : cargasAtivas.map(c => (
                <div
                  key={c.id}
                  onClick={() => vincularCarga(c)}
                  style={{ padding: '10px 14px', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background .12s' }}
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
