const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const { listar, listarResponsaveis, criar, atualizar, deletar } = require('../controllers/usuariosController');

// Acessível a todos os usuários autenticados (usado no seletor de responsável)
router.get('/responsaveis', auth, listarResponsaveis);

router.use(auth, adminOnly);

router.get('/', listar);
router.post('/', criar);
router.put('/:id', atualizar);
router.delete('/:id', deletar);

module.exports = router;
