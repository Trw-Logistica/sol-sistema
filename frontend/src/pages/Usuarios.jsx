import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { listarUsuarios, criarUsuario, atualizarUsuario, deletarUsuario } from '../services/usuarios';

const BLANK = { nome: '', email: '', senha: '', perfil: 'operacional', telefone: '' };

export default function Usuarios() {
  const { usuario: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loadErro, setLoadErro] = useState('');
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState(null);
  const [f, setF] = useState(BLANK);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = () => {
    setLoadErro('');
    listarUsuarios()
      .then(setUsers)
      .catch(err => setLoadErro(err.response?.data?.error || 'Erro ao carregar usuários'));
  };
  useEffect(() => { carregar(); }, []);

  const setFld = k => ev => setF(p => ({ ...p, [k]: ev.target.value }));

  const abrir = u => {
    setEdit(u || null);
    setF(u ? { nome: u.nome, email: u.email, senha: '', perfil: u.perfil, telefone: u.telefone || '' } : BLANK);
    setErro('');
    setModal(true);
  };

  const salvar = async () => {
    if (!f.nome || !f.email || (!edit && !f.senha)) return;
    setSalvando(true); setErro('');
    try {
      const payload = { nome: f.nome, email: f.email, perfil: f.perfil, telefone: f.telefone || null };
      if (f.senha) payload.senha = f.senha;
      if (edit) {
        await atualizarUsuario(edit.id, payload);
      } else {
        await criarUsuario({ ...payload, senha: f.senha });
      }
      await carregar();
      setModal(false);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar usuário');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async id => {
    if (id === me.id) { alert('Não é possível remover seu próprio usuário.'); return; }
    if (!confirm('Remover usuário?')) return;
    await deletarUsuario(id);
    carregar();
  };

  const ok = f.nome && f.email && (edit || f.senha);

  return (
    <div>
      <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-p" onClick={() => abrir(null)}>+ Novo usuário</button>
      </div>

      {loadErro && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, fontWeight: 500 }}>
          ⚠️ {loadErro}
        </div>
      )}
      <div className="card">
        <table>
          <thead>
            <tr>{['Nome', 'Email', 'Perfil', 'WhatsApp', ''].map(x => <th key={x}>{x}</th>)}</tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.perfil === 'admin' ? 'var(--accent)' : '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                      {u.nome.charAt(0)}
                    </div>
                    <span style={{ fontWeight: 600 }}>{u.nome}</span>
                    {u.id === me.id && <span style={{ fontSize: 10, color: 'var(--text3)' }}>(você)</span>}
                  </div>
                </td>
                <td className="mono">{u.email}</td>
                <td>
                  <span className={`s-dot ${u.perfil === 'admin' ? 's-wait' : 's-tran'}`}>
                    {u.perfil === 'admin' ? 'Admin' : 'Operacional'}
                  </span>
                </td>
                <td className="mono" style={{ fontSize: 12, color: 'var(--text3)' }}>{u.telefone || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-g btn-sm" onClick={() => abrir(u)}>Editar</button>
                    {u.id !== me.id && (
                      <button className="btn btn-d btn-sm" onClick={() => excluir(u.id)}>✕</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="ov">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="mhd">
              <div className="mttl">{edit ? 'Editar usuário' : 'Novo usuário'}</div>
              <button className="mx" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="mbd">
              <div className="fg"><label className="fl">Nome</label><input className="fi" value={f.nome} onChange={setFld('nome')} placeholder="Nome completo" /></div>
              <div className="fg"><label className="fl">Email</label><input type="email" className="fi" value={f.email} onChange={setFld('email')} placeholder="email@empresa.com" /></div>
              <div className="fg"><label className="fl">{edit ? 'Nova senha (vazio = manter)' : 'Senha *'}</label><input type="password" className="fi" value={f.senha} onChange={setFld('senha')} placeholder="••••••••" /></div>
              <div className="fg">
                <label className="fl">Perfil</label>
                <select className="fi" value={f.perfil} onChange={setFld('perfil')}>
                  <option value="operacional">Operacional</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="fg"><label className="fl">WhatsApp (opcional)</label><input className="fi" value={f.telefone} onChange={setFld('telefone')} placeholder="5511999999999" /></div>
              {erro && <div className="lerr">{erro}</div>}
            </div>
            <div className="mft">
              <div />
              <div className="mft-r">
                <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
                <button className="btn btn-p" disabled={!ok || salvando} onClick={salvar}>{salvando ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
