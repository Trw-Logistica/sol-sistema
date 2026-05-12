import api from './api';

export const getResumo = (params = {}) =>
  api.get('/dashboard/resumo', { params }).then(r => r.data);

export const getRanking = () =>
  api.get('/dashboard/ranking').then(r => r.data);
