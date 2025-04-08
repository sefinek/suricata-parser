const timeout = require('express-timeout-handler');

module.exports = () => timeout.handler({
	timeout: 15000, // 15s
	onTimeout: (req, res) => res.status(503).json({
		success: false,
		status: 503,
		message: '503 Service Unavailable',
	}),
	disable: ['write', 'setHeaders', 'send', 'json', 'end'],
});