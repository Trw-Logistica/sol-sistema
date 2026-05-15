import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import Icon from './components/Icon';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cargas from './pages/Cargas';
import Historico from './pages/Historico';
import Motoristas from './pages/Motoristas';
import Clientes from './pages/Clientes';
import Usuarios from './pages/Usuarios';
import Templates from './pages/Templates';

const SOL_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="14" fill="%230B162A"/><path d="M16 4 Q5 10 5 16 Q5 22 16 28 Z" fill="%23C83803"/><circle cx="21" cy="11" r="1.5" fill="white"/><circle cx="23.5" cy="16" r="1.5" fill="white"/><circle cx="21" cy="21" r="1.5" fill="white"/><path d="M16 16 L21 11 M16 16 L23.5 16 M16 16 L21 21" stroke="white" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>')}`;

export default function App() {
  const { usuario, logout, carregando, isAdmin } = useAuth();
  const [dark, setDark] = useState(() => localStorage.getItem('sol_dark') === 'true');
  const [sbMin, setSbMin] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [navData, setNavData] = useState({});

  useEffect(() => {
    const handler = e => { setNavData(e.detail); setPage(e.detail.page); };
    window.addEventListener('sol:navigate', handler);
    return () => window.removeEventListener('sol:navigate', handler);
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('sol_dark', dark);
  }, [dark]);

  if (carregando) return <div className="loading">Carregando...</div>;
  if (!usuario) return <Login />;

  const admin = isAdmin();

  const nav = [
    { id: 'dashboard', icn: 'dashboard', label: 'Dashboard' },
    { id: 'cargas',    icn: 'package',   label: 'Cargas' },
    { id: 'historico', icn: 'archive',   label: 'Histórico' },
    { id: 'motoristas',icn: 'truck',     label: 'Motoristas' },
    { id: 'templates', icn: 'layers',    label: 'Templates' },
    ...(admin ? [{ id: 'clientes', icn: 'building', label: 'Clientes' }] : []),
    ...(admin ? [{ id: 'usuarios', icn: 'users',    label: 'Usuários' }] : []),
  ];

  const titles = { dashboard: 'Dashboard', cargas: 'Cargas', historico: 'Histórico', motoristas: 'Motoristas', templates: 'Templates', clientes: 'Clientes', usuarios: 'Usuários' };
  const subs   = {
    dashboard:  admin ? 'Visão geral das operações' : `Suas operações — ${usuario.nome}`,
    cargas:     'Operações ativas',
    historico:  admin ? 'Todas as cargas finalizadas' : 'Suas cargas finalizadas',
    motoristas: 'Motoristas cadastrados',
    templates:  'Anúncios WhatsApp',
    clientes:   'Gestão de clientes',
    usuarios:   'Controle de acesso',
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <div className="sb" style={{ width: sbMin ? 82 : 224 }}>
        <div className={`sb-pill${sbMin ? '' : ' expanded'}`}>
          <div className="sb-pill-top">
            <div
              className="sb-pill-brand"
              onClick={sbMin ? () => setSbMin(false) : undefined}
              style={sbMin ? { cursor: 'pointer' } : {}}
            >
              <div className="sb-ico">
                <img src={SOL_LOGO} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
              </div>
              <div className="sb-pill-label">
                <div className="sb-name">S.O.L</div>
                <div className="sb-tagline">Super Operador</div>
              </div>
            </div>
          </div>

          <div className="sb-nav">
            {nav.map(n => (
              <div
                key={n.id}
                className={`sb-item${page === n.id ? ' active' : ''}`}
                onClick={() => { setPage(n.id); setNavData({}); }}
                title={n.label}
              >
                <div className="sb-item-icon"><Icon n={n.icn} sz={17} /></div>
                <span className="sb-item-label">{n.label}</span>
              </div>
            ))}
          </div>

          <div className="sb-toggle-wrap">
            <button className="sb-toggle" onClick={() => setSbMin(p => !p)} title={sbMin ? 'Expandir menu' : 'Recolher menu'}>
              <Icon n={sbMin ? 'chevronRight' : 'chevronLeft'} sz={12} />
            </button>
          </div>

          <div className="sb-bottom">
            <div className="sb-user-row">
              <div className="sb-av">{usuario.nome.charAt(0)}</div>
              <div className="sb-user-info">
                <div className="sb-nm">{usuario.nome}</div>
                <div className="sb-rl">{usuario.perfil}</div>
              </div>
              <button className="sb-logout" title="Sair" onClick={logout}>
                <Icon n="logout" sz={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="main main-content" style={{ marginLeft: sbMin ? 82 : 224 }}>
        <div className="topbar">
          <div className="tb-left">
            <div className="tb-title">{titles[page] || page}</div>
            <div className="tb-sub">{subs[page] || ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="icon-btn-tb" onClick={() => setDark(d => !d)} title={dark ? 'Modo claro' : 'Modo escuro'}>
              <Icon n={dark ? 'sun' : 'moon'} sz={15} />
            </button>
          </div>
        </div>

        <div className="page">
          {page === 'dashboard'  && <Dashboard />}
          {page === 'cargas'     && <Cargas />}
          {page === 'historico'  && <Historico />}
          {page === 'motoristas' && <Motoristas />}
          {page === 'templates'  && <Templates cargaId={navData.cargaId} />}
          {page === 'clientes'   && admin && <Clientes />}
          {page === 'usuarios'   && admin && <Usuarios />}
        </div>
      </div>
    </div>
  );
}
