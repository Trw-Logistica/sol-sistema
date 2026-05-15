const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { listar, criar, deletar } = require('../controllers/gruposWhatsappController');

router.use(auth);

router.get('/', listar);
router.post('/', criar);
router.delete('/:id', deletar);

module.exports = router;
