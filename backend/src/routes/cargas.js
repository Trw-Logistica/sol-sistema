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
  deletar,
} = require('../controllers/cargasController');

router.use(auth);

router.get('/', listar);
router.get('/:id', obter);
router.post('/', criar);
router.put('/:id', atualizar);
router.patch('/:id/status', atualizarStatus);
router.post('/:id/ocorrencia', adicionarOcorrencia);
router.delete('/:id', deletar);

module.exports = router;
