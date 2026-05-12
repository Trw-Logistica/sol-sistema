import api from './api';

export const listarMotoristas = (params = {}) =>
  api.get('/motoristas', { params }).then(r => r.data);

export const criarMotorista = data =>
  api.post('/motoristas', data).then(r => r.data);

export const atualizarMotorista = (id, data) =>
  api.put(`/motoristas/${id}`, data).then(r => r.data);

export const deletarMotorista = id =>
  api.delete(`/motoristas/${id}`).then(r => r.data);
