const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const { resumo, ranking, rankingOperacionais } = require('../controllers/dashboardController');

router.use(auth, adminOnly);

router.get('/resumo', resumo);
router.get('/ranking', ranking);
router.get('/ranking-operacionais', rankingOperacionais);

module.exports = router;
