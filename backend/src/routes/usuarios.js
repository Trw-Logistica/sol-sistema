const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const { listar, criar, atualizar, deletar } = require('../controllers/usuariosController');

router.use(auth, adminOnly);

router.get('/', listar);
router.post('/', criar);
router.put('/:id', atualizar);
router.delete('/:id', deletar);

module.exports = router;
