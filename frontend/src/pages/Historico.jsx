import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { listarCargas } from '../services/cargas';
import { listarUsuarios } from '../services/usuarios';
import { HIST, fmtR, fmtD } from '../constants';
import SBadge from '../components/SBadge';
import ModalDetalhe from '../components/modals/ModalDetalhe';

export default function Historico() {
  const { isAdmin, carregando: authCarregando } = useAuth();
  const admin = isAdmin();

  const [cargas, setCargas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [mots, setMots] = useState([]);
  const [operacionais, setOperacionais] = useState([]);
  const [search, setSearch] = useState('');
  const [fSts, setFSts] = useState('');
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (authCarregando) return;
    listarCargas({ historico: 'true' }).then(data => {
      setCargas(data);
      const cls = {}; const ms = {};
      data.forEach(c => {
        if (c.clientes) cls[c.cliente_id] = c.clientes;
        if (c.motoristas) ms[c.motorista_id] = c.motoristas;
      });
      setClientes(Object.values(cls));
      setMots(Object.values(ms));
    });
    if (admin) {
      listarUsuarios().then(us =>
        setOperacionais(us.filter(u => u.perfil === 'operacional' && u.ativo))
      ).catch(() => {});
    }
  }, [authCarregando]);

  const reload = async (detailId) => {
    const [data, us] = await Promise.all([
      listarCargas({ historico: 'true' }),
      admin ? listarUsuarios() : Promise.resolve([]),
    ]);
    setCargas(data);
    setOperacionais(us.filter(u => u.perfil === 'operacional' && u.ativo));
    if (detailId) {
      const updated = data.find(c => c.id === detailId);
      if (updated) setDetail(updated);
    }
  };

  const list = useMemo(() => {
    let cg = cargas.filter(c => HIST.includes(c.status));
    if (fSts) cg = cg.filter(c => c.status === fSts);
    if (search) {
      const q = search.toLowerCase();
      cg = cg.filter(c =>
        (c.numero || '').toLowerCase().includes(q) ||
        (c.cte || '').toLowerCase().includes(q) ||
        (c.clientes?.nome || '').toLowerCase().includes(q) ||
        (c.motoristas?.nome || '').toLowerCase().includes(q)
      );
    }
    return [...cg].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
  }, [cargas, search, fSts]);

  const detailIdx = detail ? list.findIndex(c => c.id === detail.id) : -1;

  return (
    <div>
      <div className="filters">
        <input
          placeholder="Buscar CTE, cliente, motorista..."
          value={search}
          onChange={ev => setSearch(ev.target.value)}
          style={{ minWidth: 240 }}
        />
        <select value={fSts} onChange={ev => setFSts(ev.target.value)}>
          <option value="">Todos os status</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      <div className="card">
        {list.length === 0 ? (
          <div className="empty-s">
            <div className="empty-ico">◫</div>
            Nenhuma carga no histórico
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>{['Nº / CTE', 'Cliente', 'Rota', 'Motorista', 'Data', 'Status', 'Líquido', 'Comprovante'].map(x => <th key={x}>{x}</th>)}</tr>
              </thead>
              <tbody>
                {list.map(c => {
                  const lq = (parseFloat(c.frete_cobrado) || 0) - (parseFloat(c.frete_pago) || 0);
                  return (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(c)}>
                      <td className="mono" style={{ fontWeight: 600 }}>{c.cte || c.numero || '—'}</td>
                      <td>{c.clientes?.nome || '—'}</td>
                      <td style={{ fontSize: 11 }}>{c.origem} → {c.destino}</td>
                      <td>{c.motoristas?.nome || '—'}</td>
                      <td className="mono">{fmtD(c.data_entrega_real || c.criado_em)}</td>
                      <td><SBadge status={c.status} /></td>
                      <td style={{ fontWeight: 600, color: lq >= 0 ? 'var(--green)' : 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>{fmtR(lq)}</td>
                      <td>
                        {c.comprovante_url
                          ? <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>✓ Recebido</span>
                          : <span style={{ fontSize: 10, color: 'var(--text3)' }}>Pendente</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detail && (
        <ModalDetalhe
          carga={detail}
          total={list.length}
          idx={detailIdx >= 0 ? detailIdx : 0}
          onPrev={() => { const i = detailIdx; if (i > 0) setDetail(list[i - 1]); }}
          onNext={() => { const i = detailIdx; if (i < list.length - 1) setDetail(list[i + 1]); }}
          clientes={clientes}
          mots={mots}
          operacionais={operacionais}
          onUpdate={() => reload(detail?.id)}
          onAddOc={() => reload(detail?.id)}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
