exports.notFound = (req, res) => {
	res.status(404).type('json').send(JSON.stringify({
		success: false,
		status: 404,
		message: '404 Not found',
	}, null, 3));
};

exports.internalError = (err, req, res, _next) => {
	if (err.name === 'UnauthorizedError') res.status(401).json({ message: '401 Unauthorized' });

	res.status(500).json({ success: false, status: 500, message: '500 Internal Server Error' });
	console.log(err);
};