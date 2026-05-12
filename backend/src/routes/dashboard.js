const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const { resumo, ranking } = require('../controllers/dashboardController');

router.use(auth, adminOnly);

router.get('/resumo', resumo);
router.get('/ranking', ranking);

module.exports = router;
