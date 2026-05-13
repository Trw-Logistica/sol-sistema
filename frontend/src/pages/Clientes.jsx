import { useState, useEffect } from 'react';
import { listarClientes, criarCliente, atualizarCliente, deletarCliente } from '../services/clientes';
import { fmtTel } from '../constants';

const BLANK = { nome: '', cnpj: '', telefone: '', email: '', cidade: '', uf: '' };

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState(null);
  const [f, setF] = useState(BLANK);
  const [salvando, setSalvando] = useState(false);

  const carregar = () => listarClientes().then(setClientes);
  useEffect(() => { carregar(); }, []);

  const setFld = k => ev => setF(p => ({ ...p, [k]: ev.target.value }));

  const abrir = c => {
    setEdit(c || null);
    setF(c ? { nome: c.nome, cnpj: c.cnpj || '', telefone: c.telefone || '', email: c.email || '', cidade: c.cidade || '', uf: c.uf || '' } : BLANK);
    setModal(true);
  };

  const salvar = async () => {
    if (!f.nome.trim()) return;
    setSalvando(true);
    try {
      if (edit) {
        await atualizarCliente(edit.id, f);
      } else {
        await criarCliente(f);
      }
      await carregar();
      setModal(false);
      setEdit(null);
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async id => {
    if (!confirm('Remover cliente?')) return;
    await deletarCliente(id);
    carregar();
  };

  return (
    <div>
      <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-p" onClick={() => abrir(null)}>+ Novo cliente</button>
      </div>

      <div className="card">
        {clientes.length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--text3)' }}>Nenhum cliente cadastrado</div>
        ) : (
          <table>
            <thead>
              <tr>{['Nome', 'CNPJ', 'Cidade/UF', 'Telefone', ''].map(x => <th key={x}>{x}</th>)}</tr>
            </thead>
            <tbody>
              {clientes.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{c.nome}</td>
                  <td className="mono">{c.cnpj || '-'}</td>
                  <td>{[c.cidade, c.uf].filter(Boolean).join('/') || '-'}</td>
                  <td>{fmtTel(c.telefone) || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-g btn-sm" onClick={() => abrir(c)}>Editar</button>
                      <button className="btn btn-d btn-sm" onClick={() => excluir(c.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="ov">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="mhd">
              <div className="mttl">{edit ? 'Editar cliente' : 'Novo cliente'}</div>
              <button className="mx" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="mbd">
              <div className="fgrid">
                <div className="fg"><label className="fl">Nome / Razão Social *</label><input className="fi" value={f.nome} onChange={setFld('nome')} placeholder="Nome fantasia ou razão social" autoFocus onKeyDown={ev => ev.key === 'Enter' && salvar()} /></div>
                <div className="fg"><label className="fl">CNPJ</label><input className="fi" value={f.cnpj} onChange={setFld('cnpj')} placeholder="00.000.000/0000-00" /></div>
              </div>
              <div className="fgrid">
                <div className="fg"><label className="fl">Telefone</label><input className="fi" value={f.telefone} onChange={setFld('telefone')} placeholder="(00) 00000-0000" /></div>
                <div className="fg"><label className="fl">Email</label><input className="fi" type="email" value={f.email} onChange={setFld('email')} placeholder="contato@empresa.com" /></div>
              </div>
              <div className="fgrid">
                <div className="fg"><label className="fl">Cidade</label><input className="fi" value={f.cidade} onChange={setFld('cidade')} placeholder="São Paulo" /></div>
                <div className="fg">
                  <label className="fl">UF</label>
                  <input className="fi" value={f.uf} onChange={setFld('uf')} placeholder="SP" maxLength={2} style={{ textTransform: 'uppercase' }} />
                </div>
              </div>
            </div>
            <div className="mft">
              <div />
              <div className="mft-r">
                <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
                <button className="btn btn-p" disabled={!f.nome.trim() || salvando} onClick={salvar}>{salvando ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
