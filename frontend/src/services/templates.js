import api from './api';

export const listarTemplates = (params = {}) =>
  api.get('/templates', { params }).then(r => r.data);

export const criarTemplate = data =>
  api.post('/templates', data).then(r => r.data);

export const atualizarTemplate = (id, data) =>
  api.put(`/templates/${id}`, data).then(r => r.data);

export const deletarTemplate = id =>
  api.delete(`/templates/${id}`);
