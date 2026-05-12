const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { login, logout, me } = require('../controllers/authController');

router.post('/login', login);
router.post('/logout', auth, logout);
router.get('/me', auth, me);

module.exports = router;
