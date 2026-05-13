const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getStats, getUsers, getReports } = require('../controllers/admin');

router.get('/stats', authenticate, requireAdmin, getStats);
router.get('/users', authenticate, requireAdmin, getUsers);
router.get('/reports', authenticate, requireAdmin, getReports);

module.exports = router;
