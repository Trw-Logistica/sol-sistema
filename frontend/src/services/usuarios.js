import api from './api';

export const listarUsuarios = () =>
  api.get('/usuarios').then(r => r.data);

export const listarResponsaveis = () =>
  api.get('/usuarios/responsaveis').then(r => r.data);

export const criarUsuario = data =>
  api.post('/usuarios', data).then(r => r.data);

export const atualizarUsuario = (id, data) =>
  api.put(`/usuarios/${id}`, data).then(r => r.data);

export const deletarUsuario = id =>
  api.delete(`/usuarios/${id}`).then(r => r.data);
