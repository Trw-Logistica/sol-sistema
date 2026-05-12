import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Icon from '../components/Icon';

const SOL_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="14" fill="%230B162A"/><path d="M16 4 Q5 10 5 16 Q5 22 16 28 Z" fill="%23C83803"/><circle cx="21" cy="11" r="1.5" fill="white"/><circle cx="23.5" cy="16" r="1.5" fill="white"/><circle cx="21" cy="21" r="1.5" fill="white"/><path d="M16 16 L21 11 M16 16 L23.5 16 M16 16 L21 21" stroke="white" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>')}`;

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [err, setErr] = useState('');
  const [carregando, setCarregando] = useState(false);

  const go = async () => {
    if (!email || !senha) { setErr('Preencha email e senha.'); return; }
    setErr(''); setCarregando(true);
    try {
      await login(email, senha);
    } catch {
      setErr('Email ou senha incorretos.');
    } finally {
      setCarregando(false);
    }
  };

  const onKey = ev => ev.key === 'Enter' && go();

  return (
    <div className="lp">
      <div className="lp-left">
        <div className="lp-brand">
          <div className="lp-ico">
            <img src={SOL_LOGO} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
          </div>
          <div>
            <div className="lp-name">S.O.L</div>
            <div style={{ fontSize: 10, color: '#64748B', letterSpacing: '.5px', textTransform: 'uppercase' }}>
              Super Operador Logístico
            </div>
          </div>
        </div>

        <div>
          <div style={{ marginBottom: 20 }}>
            <div className="lp-eyebrow"><Icon n="check" sz={11} />Sistema profissional de gestão</div>
            <div className="lp-headline">Sua operação,<span>sob controle.</span></div>
            <div className="lp-desc">
              Plataforma completa para gestão de fretes, subcontratações e indicadores de performance em tempo real.
            </div>
          </div>

          <div className="lp-features">
            <div className="lp-feat">
              <div className="lp-feat-ico"><Icon n="package" sz={15} /></div>
              <div><div className="lp-feat-name">Cargas</div><div className="lp-feat-desc">Kanban operacional</div></div>
            </div>
            <div className="lp-feat">
              <div className="lp-feat-ico"><Icon n="truck" sz={15} /></div>
              <div><div className="lp-feat-name">Motoristas</div><div className="lp-feat-desc">Cadastro completo</div></div>
            </div>
            <div className="lp-feat">
              <div className="lp-feat-ico"><Icon n="chart" sz={15} /></div>
              <div><div className="lp-feat-name">BI</div><div className="lp-feat-desc">Indicadores em tempo real</div></div>
            </div>
            <div className="lp-feat">
              <div className="lp-feat-ico"><Icon n="archive" sz={15} /></div>
              <div><div className="lp-feat-name">Histórico</div><div className="lp-feat-desc">Comprovantes físicos</div></div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#1E293B', letterSpacing: '.3px' }}>
          © {new Date().getFullYear()} S.O.L · Todos os direitos reservados
        </div>
      </div>

      <div className="lp-right">
        <div className="lcard">
          <div className="lcard-eyebrow"><Icon n="check" sz={11} />Acesso seguro</div>
          <div className="lcard-title">Bem-vindo de volta</div>
          <div className="lcard-sub">Entre com suas credenciais para acessar o painel de gestão.</div>

          <label className="fl">EMAIL</label>
          <input
            className="fi"
            type="email"
            value={email}
            placeholder="seu@empresa.com"
            onChange={ev => setEmail(ev.target.value)}
            onKeyDown={onKey}
          />

          <label className="fl">SENHA</label>
          <input
            className="fi"
            type="password"
            value={senha}
            placeholder="••••••••"
            onChange={ev => setSenha(ev.target.value)}
            onKeyDown={onKey}
          />

          {err && <div className="lerr">{err}</div>}

          <button
            className="btn btn-p btn-bl"
            onClick={go}
            disabled={carregando}
            style={{ width: '100%' }}
          >
            {carregando ? 'Entrando...' : 'Entrar no sistema'}
          </button>
        </div>
      </div>
    </div>
  );
}
