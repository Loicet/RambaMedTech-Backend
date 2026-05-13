const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getReminders, createReminder, toggleReminder, deleteReminder } = require('../controllers/reminder');

router.get('/', authenticate, getReminders);
router.post('/', authenticate, createReminder);
router.patch('/:id/toggle', authenticate, toggleReminder);
router.delete('/:id', authenticate, deleteReminder);

module.exports = router;
