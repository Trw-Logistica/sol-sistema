import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { listarCargas } from '../services/cargas';
import { getRanking, getRankingOperacionais } from '../services/dashboard';
import { fmtR, fmtD, ACTIVE, HIST } from '../constants';
import SBadge from '../components/SBadge';
import Icon from '../components/Icon';

// ── Helpers ──────────────────────────────────────────────────────────────────

function MiniBar({ items, color = 'var(--accent)' }) {
  const max = Math.max(...items.map(i => i.val), 1);
  return (
    <div style={{ padding: '4px 0' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500, width: 110, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.label}>{item.label}</span>
          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 20, background: color, width: Math.round((item.val / max) * 100) + '%', transition: 'width .4s' }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', fontFamily: 'var(--mo)', minWidth: 75, textAlign: 'right', flexShrink: 0 }}>{item.display || item.val}</span>
        </div>
      ))}
    </div>
  );
}

function DonutSVG({ segs }) {
  const tot = segs.reduce((a, s) => a + s.v, 0) || 1;
  const r = 30, cx = 38, cy = 38, circ = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg width={76} height={76} viewBox="0 0 76 76" style={{ flexShrink: 0 }}>
      {tot === 0
        ? <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={9} />
        : segs.filter(s => s.v > 0).map((s, i) => {
            const dash = (s.v / tot) * circ, gap = circ - dash;
            const el = (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.c} strokeWidth={9}
                strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-(off / tot) * circ + circ / 4} />
            );
            off += s.v; return el;
          })
      }
    </svg>
  );
}

function Sparkline({ data, color = '#3B82F6', width = 100, height = 28 }) {
  if (!data || data.length < 2) return <svg width={width} height={height} style={{ display: 'block' }} />;
  const max = Math.max(...data, 1), min = Math.min(...data, 0), range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  const id = 'sg' + Math.random().toString(36).slice(2, 8);
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline points={areaPoints} fill={`url(#${id})`} stroke="none" />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendPill({ pct }) {
  if (pct === null || pct === undefined || !isFinite(pct)) return <span className="kpi-trend flat">—</span>;
  const cls = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '↔';
  return <span className={`kpi-trend ${cls}`}>{arrow} {Math.abs(Math.round(pct))}%</span>;
}

function KPICard({ label, value, trend, trendLabel, spark, sparkColor, icon, iconCls, primary }) {
  return (
    <div className={`kpi-pro${primary ? ' primary' : ''}`}>
      <div className="kpi-head">
        <span className="kpi-name">{label}</span>
        {icon && <div className={`kpi-mini-icon ${iconCls || 'kpi-icon-slate'}`}>{icon}</div>}
      </div>
      <div className={`kpi-num${primary ? ' lg' : ''}`}>{value}</div>
      {(trend !== undefined || trendLabel) && (
        <div>
          {trend !== undefined && <TrendPill pct={trend} />}
          {trendLabel && <span className="kpi-trend-text">{trendLabel}</span>}
        </div>
      )}
      {spark && <Sparkline data={spark} color={sparkColor || '#94A3B8'} />}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

const PERIOD_MAP = { hoje: 'Hoje', semana: 'Semana', mes: 'Mês atual', tudo: 'Tudo' };

export default function Dashboard() {
  const { usuario, isAdmin } = useAuth();
  const admin = isAdmin();
  const [period, setPeriod] = useState('mes');
  const [cargas, setCargas] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [rankingOps, setRankingOps] = useState([]);

  useEffect(() => {
    listarCargas().then(setCargas);
    if (admin) {
      getRanking().then(setRanking).catch(() => {});
      getRankingOperacionais().then(setRankingOps).catch(() => {});
    }
  }, [admin]);

  const now = new Date();

  const periods = useMemo(() => {
    const cur = { start: null, end: null }, prev = { start: null, end: null };
    if (period === 'hoje') {
      cur.start = new Date(now); cur.start.setHours(0, 0, 0, 0);
      cur.end = new Date(now); cur.end.setHours(23, 59, 59, 999);
      prev.start = new Date(cur.start); prev.start.setDate(prev.start.getDate() - 1);
      prev.end = new Date(cur.start);
    } else if (period === 'semana') {
      const day = now.getDay();
      cur.start = new Date(now); cur.start.setDate(now.getDate() - day); cur.start.setHours(0, 0, 0, 0);
      cur.end = new Date(now);
      prev.start = new Date(cur.start); prev.start.setDate(prev.start.getDate() - 7);
      prev.end = new Date(cur.start);
    } else if (period === 'mes') {
      cur.start = new Date(now.getFullYear(), now.getMonth(), 1);
      cur.end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      prev.start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prev.end = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return { cur, prev };
  }, [period]);

  const filterByRange = (arr, start, end) => {
    if (!start) return arr;
    return arr.filter(c => { const d = new Date(c.criado_em); return d >= start && d < end; });
  };

  const list = useMemo(() =>
    period === 'tudo' ? cargas : filterByRange(cargas, periods.cur.start, periods.cur.end),
    [cargas, period, periods]
  );
  const prevList = useMemo(() =>
    period === 'tudo' ? [] : filterByRange(cargas, periods.prev.start, periods.prev.end),
    [cargas, period, periods]
  );

  const sumCob = arr => arr.reduce((a, c) => a + (parseFloat(c.frete_cobrado) || 0), 0);
  const sumPago = arr => arr.reduce((a, c) => a + (parseFloat(c.frete_pago) || 0), 0);
  const sumLiq = arr => arr.reduce((a, c) => a + (c.frete_liquido != null ? parseFloat(c.frete_liquido) : (parseFloat(c.frete_cobrado) || 0) - (parseFloat(c.frete_pago) || 0)), 0);

  const cobrado = sumCob(list), pago = sumPago(list), liq = sumLiq(list);
  const ticket = list.length ? Math.round(cobrado / list.length) : 0;
  const margem = cobrado > 0 ? Math.round((liq / cobrado) * 100) : 0;
  const ativas = list.filter(c => ACTIVE.includes(c.status)).length;
  const pendComp = list.filter(c => c.status === 'concluido' && !c.comprovante_url).length;

  const prevCobrado = sumCob(prevList), prevPago = sumPago(prevList), prevLiq = sumLiq(prevList);
  const prevTicket = prevList.length ? Math.round(prevCobrado / prevList.length) : 0;
  const prevMargem = prevCobrado > 0 ? Math.round((prevLiq / prevCobrado) * 100) : 0;

  const trend = (cur, prev) => {
    if (prev === 0) return cur > 0 ? 100 : null;
    return ((cur - prev) / prev) * 100;
  };

  const sparkData = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const dEnd = new Date(d); dEnd.setDate(dEnd.getDate() + 1);
      const dl = filterByRange(cargas, d, dEnd);
      days.push({ cobrado: sumCob(dl), pago: sumPago(dl), liq: sumLiq(dl), cnt: dl.length });
    }
    return days;
  }, [cargas]);

  const bySts = useMemo(() => {
    const m = { aguardando: 0, em_transito: 0, entregue: 0, concluido: 0, cancelado: 0 };
    list.forEach(c => { if (m[c.status] !== undefined) m[c.status]++; });
    return m;
  }, [list]);

  const topCli = useMemo(() => {
    const m = {};
    list.forEach(c => {
      if (!c.cliente_id) return;
      if (!m[c.cliente_id]) m[c.cliente_id] = { id: c.cliente_id, nome: c.clientes?.nome || '—', val: 0 };
      m[c.cliente_id].val += (parseFloat(c.frete_cobrado) || 0) - (parseFloat(c.frete_pago) || 0);
    });
    return Object.values(m).sort((a, b) => b.val - a.val).slice(0, 5)
      .map(x => ({ label: x.nome, val: x.val, display: fmtR(x.val) }));
  }, [list]);

  const topMot = useMemo(() => {
    const m = {};
    list.forEach(c => {
      if (!c.motorista_id) return;
      if (!m[c.motorista_id]) m[c.motorista_id] = { nome: c.motoristas?.nome || '—', cnt: 0 };
      m[c.motorista_id].cnt++;
    });
    return Object.values(m).sort((a, b) => b.cnt - a.cnt).slice(0, 5)
      .map(x => ({ label: x.nome, val: x.cnt, display: x.cnt + ' cargas' }));
  }, [list]);

  const recent = useMemo(() =>
    [...list].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em)).slice(0, 8),
    [list]
  );

  const donut = [
    { v: bySts.aguardando, c: '#F59E0B', l: 'Aguardando' },
    { v: bySts.em_transito, c: '#3B82F6', l: 'Em Trânsito' },
    { v: bySts.entregue, c: '#22C55E', l: 'Entregue' },
    { v: bySts.concluido, c: '#8B5CF6', l: 'Concluído' },
    { v: bySts.cancelado, c: '#EF4444', l: 'Cancelado' },
  ];

  const trendLabel = period === 'tudo' ? '' : `vs ${period === 'hoje' ? 'ontem' : period === 'semana' ? 'semana anterior' : 'mês anterior'}`;

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--sh-xs)' };
  const chd = { padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const g3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 };

  return (
    <div>
      {/* Period selector */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, width: 'fit-content', boxShadow: 'var(--sh-xs)' }}>
        {['hoje', 'semana', 'mes', 'tudo'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{ padding: '5px 14px', borderRadius: 6, border: period === p ? '1px solid var(--border)' : 'none', background: period === p ? 'var(--surface2)' : 'transparent', color: period === p ? 'var(--text)' : 'var(--text3)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--fn)', boxShadow: period === p ? 'var(--sh-xs)' : 'none' }}
          >
            {PERIOD_MAP[p]}
          </button>
        ))}
      </div>

      {/* KPI Row 1 */}
      <div className="kpi-row1">
        <KPICard label="Frete Cobrado" value={fmtR(cobrado)} trend={trend(cobrado, prevCobrado)} trendLabel={trendLabel} spark={sparkData.map(d => d.cobrado)} sparkColor="#1E3A8A" icon={<Icon n="dollar" sz={14} />} iconCls="kpi-icon-blue" primary />
        <KPICard label="Frete Pago" value={fmtR(pago)} trend={trend(pago, prevPago)} trendLabel={trendLabel} spark={sparkData.map(d => d.pago)} sparkColor="#C83803" icon={<Icon n="arrowDown" sz={14} />} iconCls="kpi-icon-amber" primary />
        <KPICard label="Frete Líquido" value={fmtR(liq)} trend={trend(liq, prevLiq)} trendLabel={trendLabel} spark={sparkData.map(d => d.liq)} sparkColor="#15803D" icon={<Icon n="trendUp" sz={14} />} iconCls="kpi-icon-green" primary />
        <KPICard label="Total de Cargas" value={String(list.length)} trend={trend(list.length, prevList.length)} trendLabel={trendLabel} spark={sparkData.map(d => d.cnt)} sparkColor="#0B162A" icon={<Icon n="package" sz={14} />} iconCls="kpi-icon-slate" primary />
      </div>

      {/* KPI Row 2 */}
      <div className="kpi-row2">
        <KPICard label="Ticket Médio" value={fmtR(ticket)} trend={trend(ticket, prevTicket)} trendLabel={trendLabel} icon={<Icon n="receipt" sz={14} />} iconCls="kpi-icon-slate" />
        <KPICard label="Margem Líquida" value={margem + '%'} trend={period === 'tudo' ? undefined : (margem - prevMargem)} trendLabel={period === 'tudo' ? '' : `vs ${prevMargem}% anterior`} icon={<Icon n="percent" sz={14} />} iconCls={margem >= 20 ? 'kpi-icon-green' : margem >= 10 ? 'kpi-icon-amber' : 'kpi-icon-red'} />
        <KPICard label="Cargas Ativas" value={String(ativas)} trendLabel="em andamento agora" icon={<Icon n="activity" sz={14} />} iconCls="kpi-icon-blue" />
        <KPICard label="Aguardando Comprovante" value={String(pendComp)} trendLabel={pendComp > 0 ? 'precisam de comprovante' : 'tudo em dia'} icon={<Icon n="alert" sz={14} />} iconCls={pendComp > 0 ? 'kpi-icon-amber' : 'kpi-icon-green'} />
      </div>

      {/* Charts row */}
      <div style={g3}>
        {/* Cargas por Status */}
        <div style={card}>
          <div style={chd}>Cargas por Status</div>
          <div style={{ padding: '16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <DonutSVG segs={donut} />
            <div style={{ flex: 1 }}>
              {donut.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.c, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--text2)', flex: 1 }}>{s.l}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--mo)' }}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Clientes */}
        <div style={card}>
          <div style={chd}>Top Clientes</div>
          <div style={{ padding: '14px 16px' }}>
            {topCli.length > 0 ? <MiniBar items={topCli} /> : <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '16px 0' }}>Sem dados</div>}
          </div>
        </div>

        {/* Top Motoristas */}
        <div style={card}>
          <div style={chd}>Top Motoristas</div>
          <div style={{ padding: '14px 16px' }}>
            {topMot.length > 0 ? <MiniBar items={topMot} color="#0B162A" /> : <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '16px 0' }}>Sem dados</div>}
          </div>
        </div>
      </div>

      {/* Ranking operacionais (admin) */}
      {admin && ranking.length > 0 && (
        <div style={{ ...card, marginBottom: 12 }}>
          <div style={chd}>Ranking de Motoristas</div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>{['#', 'Motorista', 'Total', 'Concluídas', 'Faturamento', 'Margem'].map(x => <th key={x}>{x}</th>)}</tr>
              </thead>
              <tbody>
                {ranking.slice(0, 10).map((r, i) => (
                  <tr key={r.motorista_id}>
                    <td style={{ fontFamily: 'var(--mo)', color: 'var(--text3)', fontSize: 11 }}>#{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{r.nome}</td>
                    <td style={{ fontFamily: 'var(--mo)' }}>{r.total_cargas}</td>
                    <td style={{ fontFamily: 'var(--mo)', color: 'var(--green)' }}>{r.concluidas}</td>
                    <td style={{ fontFamily: 'var(--mo)' }}>{fmtR(r.faturamento)}</td>
                    <td style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: r.margem >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtR(r.margem)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ranking operacionais */}
      {admin && rankingOps.length > 0 && (
        <div style={{ ...card, marginBottom: 12 }}>
          <div style={chd}>Ranking de Operacionais</div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>{['#', 'Operacional', 'Total', 'Concluídas', 'Frete Líquido', '% no Prazo'].map(x => <th key={x}>{x}</th>)}</tr>
              </thead>
              <tbody>
                {rankingOps.map((r, i) => (
                  <tr key={r.operacional_id}>
                    <td style={{ fontFamily: 'var(--mo)', color: 'var(--text3)', fontSize: 11 }}>#{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{r.nome}</td>
                    <td style={{ fontFamily: 'var(--mo)' }}>{r.total_cargas}</td>
                    <td style={{ fontFamily: 'var(--mo)', color: 'var(--green)' }}>{r.concluidas}</td>
                    <td style={{ fontFamily: 'var(--mo)', fontWeight: 600, color: r.frete_liquido >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtR(r.frete_liquido)}</td>
                    <td style={{ fontFamily: 'var(--mo)', color: r.pct_prazo === null ? 'var(--text3)' : r.pct_prazo >= 80 ? 'var(--green)' : r.pct_prazo >= 50 ? 'var(--amber)' : 'var(--red)' }}>
                      {r.pct_prazo === null ? '—' : r.pct_prazo + '%'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Últimas cargas */}
      <div style={card}>
        <div style={chd}>Últimas Cargas</div>
        {recent.length === 0 ? (
          <div className="empty-s"><div className="empty-ico">◫</div>Nenhuma carga no período</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>{['Nº/CTE', 'Cliente', 'Rota', 'Motorista', 'Status', 'Líquido'].map(x => <th key={x}>{x}</th>)}</tr>
              </thead>
              <tbody>
                {recent.map(c => {
                  const lq = (parseFloat(c.frete_cobrado) || 0) - (parseFloat(c.frete_pago) || 0);
                  return (
                    <tr key={c.id}>
                      <td className="mono" style={{ fontWeight: 600, fontSize: 11 }}>{c.cte || c.numero}</td>
                      <td>{c.clientes?.nome || '—'}</td>
                      <td style={{ fontSize: 11 }}>{c.origem} → {c.destino}</td>
                      <td>{c.motoristas?.nome || '—'}</td>
                      <td><SBadge status={c.status} /></td>
                      <td style={{ fontWeight: 600, color: lq >= 0 ? 'var(--green)' : 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>{fmtR(lq)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
