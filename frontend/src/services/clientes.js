import api from './api';

export const listarClientes = (params = {}) =>
  api.get('/clientes', { params }).then(r => r.data);

export const criarCliente = data =>
  api.post('/clientes', data).then(r => r.data);

export const atualizarCliente = (id, data) =>
  api.put(`/clientes/${id}`, data).then(r => r.data);

export const deletarCliente = id =>
  api.delete(`/clientes/${id}`).then(r => r.data);
