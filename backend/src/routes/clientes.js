const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { listar, criar, atualizar, deletar } = require('../controllers/clientesController');

router.use(auth);

router.get('/', listar);
router.post('/', criar);
router.put('/:id', atualizar);
router.delete('/:id', deletar);

module.exports = router;
