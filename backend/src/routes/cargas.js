const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  listar,
  obter,
  criar,
  atualizar,
  atualizarStatus,
  adicionarOcorrencia,
  duplicar,
  deletar,
  getMonitoramento,
  getMonitoramentoAtivos,
  updateMonitoramento,
} = require('../controllers/cargasController');

router.use(auth);

router.get('/monitoramento/ativos', getMonitoramentoAtivos);
router.get('/', listar);
router.get('/:id', obter);
router.post('/', criar);
router.put('/:id', atualizar);
router.patch('/:id/status', atualizarStatus);
router.post('/:id/ocorrencia', adicionarOcorrencia);
router.post('/:id/duplicar', duplicar);
router.delete('/:id', deletar);
router.get('/:id/monitoramento', getMonitoramento);
router.patch('/:id/monitoramento/:etapa', updateMonitoramento);

module.exports = router;
