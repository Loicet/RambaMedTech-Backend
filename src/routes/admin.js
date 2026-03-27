const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getStats, getUsers } = require('../controllers/admin');

router.get('/stats', authenticate, requireAdmin, getStats);
router.get('/users', authenticate, requireAdmin, getUsers);

module.exports = router;
