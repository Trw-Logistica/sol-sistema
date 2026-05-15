import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { listarCargas, criarCarga, atualizarCarga, atualizarStatus, getMonitoramentoAtivos, deletarCarga, duplicarCarga } from '../services/cargas';
import { listarClientes } from '../services/clientes';
import { listarMotoristas, criarMotorista as criarMot } from '../services/motoristas';
import { listarUsuarios } from '../services/usuarios';
import { fmtR } from '../constants';
import Icon from '../components/Icon';
import SBadge from '../components/SBadge';
import ModalNovaCarga from '../components/modals/ModalNovaCarga';
import ModalDetalhe from '../components/modals/ModalDetalhe';

const ALL_COLS = ['aguardando', 'em_transito', 'concluido', 'cancelado'];
const COL_CFG = {
  aguardando:  { cls: 'kcol-wait', label: 'Divulgação' },
  em_transito: { cls: 'kcol-tran', label: 'Em Andamento' },
  concluido:   { cls: 'kcol-done', label: 'Concluído' },
  cancelado:   { cls: 'kcol-canc', label: 'Cancelado' },
};

export default function Cargas() {
  const { usuario, isAdmin, carregando: authCarregando } = useAuth();
  const admin = isAdmin();

  const [cargas, setCargas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [mots, setMots] = useState([]);
  const [operacionais, setOperacionais] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [cargaEditando, setCargaEditando] = useState(null);
  const [detailCarga, setDetailCarga] = useState(null);
  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState(null);
  const [monMap, setMonMap] = useState({});
  const [expandedCards, setExpandedCards] = useState({});
  const [collapsed, setCollapsed] = useState(
    () => JSON.parse(localStorage.getItem('kanban_collapsed') || '{}')
  );
  const dragId = useRef(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const toggleCard = id => setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));

  const toggleCollapse = status => {
    setCollapsed(prev => {
      const next = { ...prev, [status]: !prev[status] };
      localStorage.setItem('kanban_collapsed', JSON.stringify(next));
      return next;
    });
  };

  const carregar = async () => {
    const [cg, cl, mt, us, mon] = await Promise.all([
      listarCargas(),
      listarClientes(),
      listarMotoristas(),
      admin ? listarUsuarios() : Promise.resolve([]),
      getMonitoramentoAtivos().catch(() => ({})),
    ]);
    const ops = us.filter(u => u.perfil === 'operacional' && u.ativo);
    setCargas(cg);
    setClientes(cl);
    setMots(mt);
    setOperacionais(ops);
    setMonMap(mon || {});
    return cg;
  };

  useEffect(() => { if (!authCarregando) carregar(); }, [authCarregando]);

  const allVisible = useMemo(() => {
    let list = cargas;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.numero || '').toLowerCase().includes(q) ||
        (c.cte || '').toLowerCase().includes(q) ||
        (c.clientes?.nome || '').toLowerCase().includes(q) ||
        (c.motoristas?.nome || '').toLowerCase().includes(q) ||
        (c.origem || '').toLowerCase().includes(q) ||
        (c.destino || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [cargas, search]);

  const sortedVisible = useMemo(
    () => [...allVisible].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em)),
    [allVisible]
  );

  const allCols = useMemo(() => {
    const m = {};
    ALL_COLS.forEach(s => m[s] = []);
    allVisible.forEach(c => {
      if (c.status === 'concluido' && c.comprovante_url) return;
      const slot = c.status === 'entregue' ? 'em_transito' : c.status;
      if (m[slot]) m[slot].push(c);
    });
    ALL_COLS.forEach(s => m[s].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em)));
    return m;
  }, [allVisible]);

  const refreshMonMap = async () => {
    const mon = await getMonitoramentoAtivos().catch(() => ({}));
    setMonMap(mon || {});
  };

  const excluirCarga = async id => {
    await deletarCarga(id);
    setCargas(prev => prev.filter(c => c.id !== id));
    setConfirmDelete(null);
    if (detailCarga?.id === id) setDetailCarga(null);
  };

  const showToast = msg => {
    const id = Date.now();
    setToast({ msg, id });
    setTimeout(() => setToast(t => t?.id === id ? null : t), 3000);
  };

  const duplicar = async (ev, carga) => {
    ev.stopPropagation();
    try {
      const nova = await duplicarCarga(carga.id);
      setCargas(prev => [nova, ...prev]);
      showToast('Carga duplicada com sucesso');
    } catch {}
  };

  const canEdit = c => admin || c.criado_por === usuario?.id;

  const salvarNova = async payload => {
    if (payload.novoMot) {
      const mot = await criarMot(payload.novoMot);
      delete payload.novoMot;
      payload.motorista_id = mot.id;
    }
    await criarCarga(payload);
    setShowNew(false);
    carregar();
  };

  const salvarEdicao = async payload => {
    if (payload.novoMot) {
      const mot = await criarMot(payload.novoMot);
      delete payload.novoMot;
      payload.motorista_id = mot.id;
    }
    await atualizarCarga(cargaEditando.id, payload);
    setCargaEditando(null);
    carregar();
  };

  const onDragStart = (ev, c) => {
    dragId.current = c.id;
    ev.dataTransfer.effectAllowed = 'move';
    setTimeout(() => ev.target.classList.add('dragging'), 0);
  };
  const onDragEnd = ev => { ev.target.classList.remove('dragging'); setDragOver(null); };
  const onDragOver = (ev, status) => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; setDragOver(status); };
  const onDrop = async (ev, status) => {
    ev.preventDefault();
    setDragOver(null);
    if (!dragId.current) return;
    const carga = cargas.find(c => c.id === dragId.current);
    if (!carga || carga.status === status || !canEdit(carga)) return;
    dragId.current = null;
    await atualizarStatus(carga.id, status);
    carregar();
  };

  const detailIdx = detailCarga ? sortedVisible.findIndex(c => c.id === detailCarga.id) : -1;

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          placeholder="Buscar CTE, cliente, motorista, rota..."
          value={search}
          onChange={ev => setSearch(ev.target.value)}
          style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, outline: 'none', width: 300, fontFamily: 'var(--fn)', boxShadow: 'var(--sh-xs)' }}
        />
        <button className="btn btn-p" onClick={() => setShowNew(true)}>+ Nova carga</button>
      </div>

      <div className="kanban">
        {ALL_COLS.map(status => {
          const cfg = COL_CFG[status];
          const cards = allCols[status] || [];
          const isDragTarget = dragOver === status;

          const isCollapsed = !!collapsed[status];

          return (
            <div
              key={status}
              className={`kcol ${cfg.cls}${isDragTarget ? (status === 'cancelado' ? ' drag-over-canc' : ' drag-over') : ''}`}
              onDragOver={ev => onDragOver(ev, status)}
              onDragLeave={() => setDragOver(null)}
              onDrop={ev => onDrop(ev, status)}
            >
              <div className="kcol-hd">
                <div className="kcol-name">{cfg.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="kcol-cnt">{cards.length}</div>
                  <button className="kcol-collapse-btn" title={isCollapsed ? 'Expandir coluna' : 'Minimizar coluna'} onClick={() => toggleCollapse(status)}>
                    {isCollapsed ? '▶' : '▼'}
                  </button>
                </div>
              </div>
              {!isCollapsed && (
              <div className="kcards">
                {cards.length === 0 ? (
                  <div style={{ padding: '18px 10px', textAlign: 'center', color: 'var(--text3)', fontSize: 11 }}>
                    {isDragTarget ? 'Soltar aqui' : 'Nenhuma carga'}
                  </div>
                ) : cards.map(c => {
                  const cl = c.clientes || clientes.find(x => x.id === c.cliente_id);
                  const mot = c.motoristas || mots.find(x => x.id === c.motorista_id);
                  const lq = c.frete_liquido != null ? parseFloat(c.frete_liquido) : (parseFloat(c.frete_cobrado) || 0) - (parseFloat(c.frete_pago) || 0);
                  const editable = canEdit(c);
                  const isExpanded = !!expandedCards[c.id];

                  return (
                    <div
                      key={c.id}
                      className="kcard"
                      draggable={editable}
                      onDragStart={editable ? ev => onDragStart(ev, c) : undefined}
                      onDragEnd={editable ? onDragEnd : undefined}
                      onClick={() => setDetailCarga(c)}
                    >
                      {/* Always-visible summary */}
                      <div className="kcard-header">
                        <span className={`kcard-cte${!c.cte ? ' nc' : ''}`}>{c.cte || c.numero || 'Ag. CTE'}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {admin && <span className="kcard-liq" style={{ color: lq >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtR(lq)}</span>}
                          <button
                            className="kcard-icon-btn"
                            title={isExpanded ? 'Recolher' : 'Expandir'}
                            onClick={ev => { ev.stopPropagation(); toggleCard(c.id); }}
                          >
                            <span style={{ display: 'inline-flex', transition: 'transform 250ms ease-in-out', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                              <Icon n="chevronDown" sz={16} />
                            </span>
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                        <div className="kcard-client">{cl?.nome || '—'}</div>
                        <SBadge status={c.status} />
                      </div>
                      {(c.status === 'em_transito' || c.status === 'entregue') && (
                        <div className="kcard-mon">
                          {!monMap[c.id]
                            ? 'Em Andamento'
                            : monMap[c.id] === 'carregamento' ? '• Carga'
                            : monMap[c.id] === 'em_transito'  ? '• Trânsito'
                            : '• Descarga'}
                        </div>
                      )}

                      {/* Expandable body */}
                      <div style={{ overflow: 'hidden', maxHeight: isExpanded ? '240px' : '0px', transition: 'max-height 0.25s ease-in-out' }}>
                        <div style={{ paddingTop: 8 }}>
                          <div className="kcard-route">
                            {c.origem}<span className="kcard-route-arrow"> → </span>{c.destino}
                          </div>
                          {mot ? (
                            <div className="kcard-driver">
                              <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>🚛</div>
                              <div className="kcard-driver-info">
                                <div className="kcard-driver-name">{mot.nome}</div>
                                <div className="kcard-driver-detail">{mot.placa_cavalo || mot.placa_carreta || '—'}</div>
                              </div>
                            </div>
                          ) : (
                            <div className="kcard-nd">Sem motorista vinculado</div>
                          )}
                          {admin && (
                            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ opacity: .6 }}>Op:</span>
                              <span style={{ fontWeight: 500 }}>{c.usuarios?.nome || '—'}</span>
                            </div>
                          )}
                          {(editable || admin) && (
                            <div style={{ marginTop: 8 }}>
                              {confirmDelete === c.id ? (
                                <div onClick={ev => ev.stopPropagation()}>
                                  <div style={{ fontSize: 10, color: 'var(--red)', marginBottom: 5, fontWeight: 500 }}>
                                    Tem certeza? Esta ação não pode ser desfeita.
                                  </div>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button
                                      className="btn btn-sm"
                                      style={{ fontSize: 10, padding: '3px 8px', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer' }}
                                      onClick={() => excluirCarga(c.id)}
                                    >
                                      Confirmar exclusão
                                    </button>
                                    <button
                                      className="btn btn-g btn-sm"
                                      style={{ fontSize: 10, padding: '3px 8px' }}
                                      onClick={() => setConfirmDelete(null)}
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  {editable && (
                                    <button
                                      className="kcard-icon-btn edit"
                                      title="Editar carga"
                                      onClick={ev => { ev.stopPropagation(); setCargaEditando(c); }}
                                    >
                                      <Icon n="edit" sz={16} /> Editar
                                    </button>
                                  )}
                                  {editable && (c.status === 'aguardando' || c.status === 'em_transito') && (
                                    <button
                                      className="kcard-icon-btn dup"
                                      title="Duplicar carga"
                                      onClick={ev => duplicar(ev, c)}
                                    >
                                      <Icon n="copy" sz={16} /> Duplicar
                                    </button>
                                  )}
                                  {admin && (
                                    <button
                                      className="kcard-icon-btn del"
                                      title="Excluir carga"
                                      onClick={ev => { ev.stopPropagation(); setConfirmDelete(c.id); }}
                                    >
                                      <Icon n="trash" sz={16} /> Excluir
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          );
        })}
      </div>

      {showNew && (
        <ModalNovaCarga
          clientes={clientes}
          mots={mots}
          onSave={salvarNova}
          onClose={() => setShowNew(false)}
        />
      )}

      {cargaEditando && (
        <ModalNovaCarga
          clientes={clientes}
          mots={mots}
          carga={cargaEditando}
          onSave={salvarEdicao}
          onClose={() => setCargaEditando(null)}
        />
      )}

      {detailCarga && (
        <ModalDetalhe
          carga={detailCarga}
          total={sortedVisible.length}
          idx={detailIdx >= 0 ? detailIdx : 0}
          onPrev={() => { const i = detailIdx; if (i > 0) setDetailCarga(sortedVisible[i - 1]); }}
          onNext={() => { const i = detailIdx; if (i < sortedVisible.length - 1) setDetailCarga(sortedVisible[i + 1]); }}
          clientes={clientes}
          mots={mots}
          operacionais={operacionais}
          onMonRefresh={refreshMonMap}
          onUpdate={async () => {
            const detailId = detailCarga?.id;
            const cg = await carregar();
            if (detailId && cg) {
              const updated = cg.find(c => c.id === detailId);
              if (updated) setDetailCarga(updated);
            }
          }}
          onAddOc={() => carregar()}
          onClose={() => setDetailCarga(null)}
        />
      )}

      {toast && <div className="toast-ok">✓ {toast.msg}</div>}
    </div>
  );
}
