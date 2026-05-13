import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { listarCargas, criarCarga, atualizarCarga, atualizarStatus } from '../services/cargas';
import { listarClientes } from '../services/clientes';
import { listarMotoristas, criarMotorista as criarMot } from '../services/motoristas';
import { listarUsuarios } from '../services/usuarios';
import { fmtR } from '../constants';
import Icon from '../components/Icon';
import ModalNovaCarga from '../components/modals/ModalNovaCarga';
import ModalDetalhe from '../components/modals/ModalDetalhe';

const ALL_COLS = ['aguardando', 'em_transito', 'entregue', 'concluido', 'cancelado'];
const COL_CFG = {
  aguardando:  { cls: 'kcol-wait', label: 'Aguardando' },
  em_transito: { cls: 'kcol-tran', label: 'Em Trânsito' },
  entregue:    { cls: 'kcol-delv', label: 'Entregue' },
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
  const dragId = useRef(null);

  const carregar = async () => {
    const [cg, cl, mt, us] = await Promise.all([
      listarCargas(),
      listarClientes(),
      listarMotoristas(),
      admin ? listarUsuarios() : Promise.resolve([]),
    ]);
    const ops = us.filter(u => u.perfil === 'operacional' && u.ativo);
    setCargas(cg);
    setClientes(cl);
    setMots(mt);
    setOperacionais(ops);
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
      if (m[c.status]) m[c.status].push(c);
    });
    ALL_COLS.forEach(s => m[s].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em)));
    return m;
  }, [allVisible]);

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
                <div className="kcol-cnt">{cards.length}</div>
              </div>
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

                  return (
                    <div
                      key={c.id}
                      className="kcard"
                      draggable={editable}
                      onDragStart={editable ? ev => onDragStart(ev, c) : undefined}
                      onDragEnd={editable ? onDragEnd : undefined}
                      onClick={() => setDetailCarga(c)}
                    >
                      <div className="kcard-header">
                        <span className={`kcard-cte${!c.cte ? ' nc' : ''}`}>{c.cte || c.numero || 'Ag. CTE'}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {admin && <span className="kcard-liq" style={{ color: lq >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtR(lq)}</span>}
                          {editable && (
                            <button
                              className="kcard-edit-btn"
                              title="Editar carga"
                              onClick={ev => { ev.stopPropagation(); setCargaEditando(c); }}
                            >
                              <Icon n="edit" sz={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="kcard-client">{cl?.nome || '—'}</div>
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
                    </div>
                  );
                })}
              </div>
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
    </div>
  );
}
