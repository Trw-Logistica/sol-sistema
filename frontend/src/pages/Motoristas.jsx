import { useState, useEffect, useMemo } from 'react';
import { listarMotoristas, criarMotorista, atualizarMotorista, deletarMotorista } from '../services/motoristas';
import { VEICULOS, CARROCERIAS, fmtTel } from '../constants';

function MotCardModal({ m, onEdit, onClose }) {
  return (
    <div className="ov">
      <div className="modal">
        <div className="mhd">
          <div><div className="mttl">{m.nome}</div><div className="msub">{fmtTel(m.telefone) || 'Sem telefone'}</div></div>
          <button className="mx" onClick={onClose}>×</button>
        </div>
        <div className="mbd">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '13px 14px', marginBottom: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🚛</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{m.nome}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{fmtTel(m.telefone) || 'Sem telefone'}</div>
            </div>
          </div>
          <div className="dgrid">
            <div className="di"><div className="dil">Tipo de Veículo</div><div className="div2">{m.tipo_veiculo || '—'}</div></div>
            <div className="di"><div className="dil">Tipo de Carroceria</div><div className="div2">{m.carroceria || '—'}</div></div>
            <div className="di"><div className="dil">Placa do Cavalo</div><div className="div2">{m.placa_cavalo ? <span className="placa-tag">{m.placa_cavalo}</span> : '—'}</div></div>
            <div className="di"><div className="dil">Placa da Carreta</div><div className="div2">{m.placa_carreta ? <span className="placa-tag-2">{m.placa_carreta} ↕</span> : '—'}</div></div>
          </div>
        </div>
        <div className="mft">
          <div />
          <div className="mft-r">
            <button className="btn btn-g" onClick={onClose}>Fechar</button>
            <button className="btn btn-p" onClick={() => onEdit(m)}>Editar perfil</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const BLANK = { nome: '', telefone: '', tipo_veiculo: '', carroceria: '', placa_cavalo: '', placa_carreta: '' };

export default function Motoristas() {
  const [mots, setMots] = useState([]);
  const [fV, setFV] = useState('');
  const [fC, setFC] = useState('');
  const [editModal, setEditModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [edit, setEdit] = useState(null);
  const [f, setF] = useState(BLANK);
  const [salvando, setSalvando] = useState(false);

  const carregar = () => listarMotoristas().then(setMots);
  useEffect(() => { carregar(); }, []);

  const setFld = k => ev => setF(p => ({ ...p, [k]: ev.target.value }));

  const openEdit = m => {
    setEdit(m || null);
    setF(m ? { nome: m.nome, telefone: m.telefone || '', tipo_veiculo: m.tipo_veiculo || '', carroceria: m.carroceria || '', placa_cavalo: m.placa_cavalo || '', placa_carreta: m.placa_carreta || '' } : BLANK);
    setViewModal(null);
    setEditModal(true);
  };

  const salvar = async () => {
    if (!f.nome) return;
    setSalvando(true);
    try {
      if (edit) {
        await atualizarMotorista(edit.id, f);
      } else {
        await criarMotorista(f);
      }
      await carregar();
      setEditModal(false);
      setEdit(null);
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async id => {
    if (!confirm('Remover motorista?')) return;
    await deletarMotorista(id);
    carregar();
  };

  const filtered = useMemo(() => {
    let m = [...mots];
    if (fV) m = m.filter(x => x.tipo_veiculo === fV);
    if (fC) m = m.filter(x => x.carroceria === fC);
    return m.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [mots, fV, fC]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div className="filters" style={{ marginBottom: 0 }}>
          <select className="fi" style={{ marginBottom: 0, width: 'auto' }} value={fV} onChange={ev => setFV(ev.target.value)}>
            <option value="">Todos os veículos</option>
            {VEICULOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="fi" style={{ marginBottom: 0, width: 'auto', marginLeft: 8 }} value={fC} onChange={ev => setFC(ev.target.value)}>
            <option value="">Todas as carrocerias</option>
            {CARROCERIAS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button className="btn btn-p" onClick={() => openEdit(null)}>+ Cadastrar motorista</button>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Nenhum motorista cadastrado</div>
        ) : (
          <table>
            <thead>
              <tr>{['Nome', 'Telefone', 'Veículo', 'Carroceria', 'Cavalo', 'Carreta', ''].map(x => <th key={x}>{x}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id}>
                  <td>
                    <span
                      style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--accent)', transition: 'opacity .15s' }}
                      onClick={() => setViewModal(m)}
                      onMouseEnter={ev => ev.target.style.opacity = '.7'}
                      onMouseLeave={ev => ev.target.style.opacity = '1'}
                    >{m.nome}</span>
                  </td>
                  <td className="mono">{fmtTel(m.telefone) || '-'}</td>
                  <td>{m.tipo_veiculo || '-'}</td>
                  <td>{m.carroceria || '-'}</td>
                  <td>{m.placa_cavalo ? <span className="placa-tag">{m.placa_cavalo}</span> : '-'}</td>
                  <td>{m.placa_carreta ? <span className="placa-tag-2">{m.placa_carreta}</span> : '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-g btn-sm" onClick={() => openEdit(m)}>Editar</button>
                      <button className="btn btn-d btn-sm" onClick={() => excluir(m.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {viewModal && <MotCardModal m={viewModal} onEdit={openEdit} onClose={() => setViewModal(null)} />}

      {editModal && (
        <div className="ov">
          <div className="modal">
            <div className="mhd">
              <div className="mttl">{edit ? 'Editar motorista' : 'Novo motorista'}</div>
              <button className="mx" onClick={() => setEditModal(false)}>×</button>
            </div>
            <div className="mbd">
              <div className="fgrid">
                <div className="fg"><label className="fl">Nome *</label><input className="fi" value={f.nome} onChange={setFld('nome')} placeholder="Nome completo" autoFocus /></div>
                <div className="fg"><label className="fl">Telefone</label><input className="fi" value={f.telefone} onChange={setFld('telefone')} placeholder="(00) 00000-0000" /></div>
              </div>
              <div className="fgrid">
                <div className="fg">
                  <label className="fl">Tipo de Veículo</label>
                  <select className="fi" value={f.tipo_veiculo} onChange={setFld('tipo_veiculo')}>
                    <option value="">Selecione...</option>
                    {VEICULOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label className="fl">Tipo de Carroceria</label>
                  <select className="fi" value={f.carroceria} onChange={setFld('carroceria')}>
                    <option value="">Selecione...</option>
                    {CARROCERIAS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="fgrid">
                <div className="fg"><label className="fl">Placa do Cavalo</label><input className="fi" value={f.placa_cavalo} onChange={setFld('placa_cavalo')} placeholder="ABC-1234" style={{ textTransform: 'uppercase' }} /></div>
                <div className="fg"><label className="fl">Placa da Carreta</label><input className="fi" value={f.placa_carreta} onChange={setFld('placa_carreta')} placeholder="XYZ-9999 (opcional)" style={{ textTransform: 'uppercase' }} /></div>
              </div>
            </div>
            <div className="mft">
              <div />
              <div className="mft-r">
                <button className="btn btn-g" onClick={() => setEditModal(false)}>Cancelar</button>
                <button className="btn btn-p" disabled={!f.nome || salvando} onClick={salvar}>{salvando ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
