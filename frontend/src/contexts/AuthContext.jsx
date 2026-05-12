import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sol_token');
    const usuarioSalvo = localStorage.getItem('sol_usuario');
    if (token && usuarioSalvo) {
      try {
        setUsuario(JSON.parse(usuarioSalvo));
      } catch {
        localStorage.removeItem('sol_token');
        localStorage.removeItem('sol_usuario');
      }
    }
    setCarregando(false);
  }, []);

  const login = async (email, senha) => {
    const { data } = await api.post('/auth/login', { email, senha });
    localStorage.setItem('sol_token', data.token);
    localStorage.setItem('sol_usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data.usuario;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('sol_token');
      localStorage.removeItem('sol_usuario');
      setUsuario(null);
    }
  };

  const isAdmin = () => usuario?.perfil === 'admin';

  return (
    <AuthContext.Provider value={{ usuario, login, logout, carregando, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
