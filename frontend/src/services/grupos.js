import api from './api';

export const listarGrupos = () =>
  api.get('/grupos-whatsapp').then(r => r.data);

export const criarGrupo = data =>
  api.post('/grupos-whatsapp', data).then(r => r.data);

export const deletarGrupo = id =>
  api.delete(`/grupos-whatsapp/${id}`);
