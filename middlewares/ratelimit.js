const rateLimit = require('express-rate-limit');

module.exports = rateLimit({
	windowMs: 2 * 60 * 1000,
	limit: 35,
	standardHeaders: 'draft-7',
	legacyHeaders: false,

	skip: () => process.env.NODE_ENV === 'development',
	handler: (req, res) => res.status(429).json({ success: false, status: 429, message: '429 Too Many Requests' }),
});