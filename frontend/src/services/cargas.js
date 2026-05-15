import api from './api';

export const listarCargas = (params = {}) =>
  api.get('/cargas', { params }).then(r => r.data);

export const obterCarga = id =>
  api.get(`/cargas/${id}`).then(r => r.data);

export const criarCarga = data =>
  api.post('/cargas', data).then(r => r.data);

export const atualizarCarga = (id, data) =>
  api.put(`/cargas/${id}`, data).then(r => r.data);

export const atualizarStatus = (id, status) =>
  api.patch(`/cargas/${id}/status`, { status }).then(r => r.data);

export const adicionarOcorrencia = (id, data) =>
  api.post(`/cargas/${id}/ocorrencia`, data).then(r => r.data);

export const deletarCarga = id =>
  api.delete(`/cargas/${id}`);

export const duplicarCarga = id =>
  api.post(`/cargas/${id}/duplicar`).then(r => r.data);

export const getMonitoramento = id =>
  api.get(`/cargas/${id}/monitoramento`).then(r => r.data);

export const getMonitoramentoAtivos = () =>
  api.get('/cargas/monitoramento/ativos').then(r => r.data);

export const updateMonitoramento = (id, etapa, data) =>
  api.patch(`/cargas/${id}/monitoramento/${etapa}`, data).then(r => r.data);
