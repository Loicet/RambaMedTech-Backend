const express = require('express');
const router = express.Router();
const { handleUssd } = require('../controllers/ussd');

router.post('/', handleUssd);

module.exports = router;
