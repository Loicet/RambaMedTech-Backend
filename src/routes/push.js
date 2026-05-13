const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { subscribe, unsubscribe, getVapidPublicKey } = require('../controllers/push');

router.get('/vapid-public-key', getVapidPublicKey);
router.post('/subscribe', authenticate, subscribe);
router.post('/unsubscribe', authenticate, unsubscribe);

module.exports = router;
