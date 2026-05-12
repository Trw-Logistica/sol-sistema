import { useState, useMemo } from 'react';

export default function MotSearch({ mots, value, onChange, onEditMot }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const sel = mots.find(m => m.id === value);
  const filt = useMemo(() => {
    if (!q.trim()) return mots;
    const lq = q.toLowerCase();
    return mots.filter(m =>
      m.nome.toLowerCase().includes(lq) ||
      (m.placa_cavalo || '').toLowerCase().includes(lq) ||
      (m.placa_carreta || '').toLowerCase().includes(lq) ||
      (m.carroceria || '').toLowerCase().includes(lq)
    );
  }, [mots, q]);

  const pick = m => { onChange(m.id); setOpen(false); setQ(''); };
  const detalhes = m => [m.tipo_veiculo, m.placa_cavalo, m.placa_carreta].filter(Boolean).join(' · ');

  return (
    <div className="fg">
      <label className="fl">Motorista</label>
      {!sel ? (
        <div style={{ position: 'relative' }}>
          <input
            className="fi"
            placeholder="Buscar por nome ou placa..."
            value={q}
            onChange={ev => setQ(ev.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          {open && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 8, boxShadow: 'var(--sh-md)', zIndex: 100, maxHeight: 200, overflowY: 'auto' }}>
              {filt.length === 0 ? (
                <div style={{ padding: '11px 12px', fontSize: 12, color: 'var(--text3)' }}>Nenhum motorista encontrado</div>
              ) : filt.map(m => (
                <div
                  key={m.id}
                  onMouseDown={() => pick(m)}
                  style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = ''}
                >
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{m.nome}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mo)', marginTop: 1 }}>{detalhes(m)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1.5px solid var(--accent-border)', borderRadius: 8, padding: '8px 11px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{sel.nome}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mo)', marginTop: 1 }}>{detalhes(sel)}</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {onEditMot && (
              <button className="btn btn-g btn-xs" onMouseDown={e => { e.preventDefault(); onEditMot(sel); }}>Editar</button>
            )}
            <button className="btn btn-g btn-xs" onMouseDown={e => { e.preventDefault(); onChange(''); }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
