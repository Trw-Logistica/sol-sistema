import { useState, useMemo, useRef, useEffect } from 'react';
import cidades from '../data/cidades.json';

const CIDADES = cidades.filter(c => c.cidade && c.estado);

// Lower index = higher priority in tie-breaking
const COMMON = [
  'São Paulo','Rio de Janeiro','Brasília','Salvador','Fortaleza',
  'Belo Horizonte','Manaus','Curitiba','Recife','Porto Alegre',
  'Belém','Goiânia','Guarulhos','Campinas','São Luís',
  'Maceió','Natal','Teresina','Campo Grande','João Pessoa',
  'Osasco','Santo André','São Bernardo do Campo','Jaboatão dos Guararapes',
  'Ribeirão Preto','Uberlândia','Sorocaba','Contagem','Aracaju','Feira de Santana',
];
const COMMON_RANK = Object.fromEntries(COMMON.map((n, i) => [n, i]));

const normalize = str =>
  (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const rank = (c, q) => {
  const nc = normalize(c.cidade);
  const start = nc.startsWith(q) ? 0 : 1;
  const common = COMMON_RANK[c.cidade] ?? 9999;
  return [start, common, c.cidade];
};

export default function CidadeSelect({ value, onChange, placeholder = 'Digite a cidade...' }) {
  const [inputVal, setInputVal] = useState(value || '');
  const [open, setOpen] = useState(false);
  const blurTimer = useRef(null);

  useEffect(() => { setInputVal(value || ''); }, [value]);

  const results = useMemo(() => {
    const q = normalize(inputVal);
    if (q.length < 2 || inputVal === value) return [];
    return CIDADES
      .filter(c => normalize(c.cidade).includes(q) || normalize(c.estado).includes(q))
      .sort((a, b) => {
        const [as0, ac, al] = rank(a, q);
        const [bs0, bc, bl] = rank(b, q);
        return as0 - bs0 || ac - bc || al.localeCompare(bl, 'pt-BR');
      })
      .slice(0, 10);
  }, [inputVal, value]);

  const select = c => {
    clearTimeout(blurTimer.current);
    onChange(c.label);
    setInputVal(c.label);
    setOpen(false);
  };

  const clear = e => {
    e.preventDefault();
    onChange('');
    setInputVal('');
    setOpen(false);
  };

  const handleChange = e => {
    setInputVal(e.target.value);
    setOpen(true);
    if (!e.target.value) onChange('');
  };

  const handleBlur = () => {
    blurTimer.current = setTimeout(() => {
      setOpen(false);
      setInputVal(value || '');
    }, 150);
  };

  const showHint = open && inputVal.length > 0 && inputVal.length < 2;
  const showEmpty = open && inputVal.length >= 2 && results.length === 0 && inputVal !== value;
  const showList = open && results.length > 0;

  const dropStyle = {
    position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, zIndex: 9999,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.12)',
    overflow: 'hidden',
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          className="fi"
          value={inputVal}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete="off"
          style={{ paddingRight: value ? 28 : undefined }}
        />
        {value && (
          <button
            type="button"
            onMouseDown={clear}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 18, lineHeight: 1, padding: '0 2px' }}
          >×</button>
        )}
      </div>

      {showHint && (
        <div style={dropStyle}>
          <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text3)' }}>
            Digite ao menos 2 caracteres
          </div>
        </div>
      )}

      {showEmpty && (
        <div style={dropStyle}>
          <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text3)' }}>
            Nenhuma cidade encontrada
          </div>
        </div>
      )}

      {showList && (
        <div style={dropStyle}>
          {results.map(c => (
            <div
              key={c.value}
              onMouseDown={() => select(c)}
              style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', color: 'var(--text)', fontFamily: 'var(--fn)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; }}
            >
              {c.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
