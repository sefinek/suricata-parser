require('dotenv').config();

const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const logger = require('./middlewares/morgan.js');
const limiter = require('./middlewares/ratelimit.js');
const timeout = require('./middlewares/timeout.js');
const { notFound, internalError } = require('./middlewares/errors.js');

const app = express();

app.set('view engine', 'ejs');
app.use(logger);
app.use(limiter);
app.use(timeout());
app.use(express.static('public'));

const FILES = {
	'Suricata Log': 'suricata.log',
	'Suricata Start': 'suricata-start.log',
	'Fast Log': 'fast.log',
	'Stats': 'stats.log',
	'Eve JSON': 'eve.json',
};

const readFileContent = async filename => {
	const filePath = path.join(process.env.SURICATA_LOGS, filename);
	return await fs.readFile(filePath, 'utf8');
};

const transformContent = (filename, content) => {
	if (filename === 'eve.json') {
		return content.split('\n').filter(Boolean).map(line => {
			try {
				const json = JSON.parse(line);
				return {
					timestamp: json.timestamp,
					src_ip: json.src_ip,
					src_port: json.src_port,
					dest_ip: json.dest_ip,
					dest_port: json.dest_port,
					proto: json.proto,
					alert: json.alert?.signature,
					confidence: json.alert?.metadata?.confidence,
					domain: json.dns?.rrname,
				};
			} catch {
				return null;
			}
		}).filter(entry => entry !== null);
	}
	if (filename === 'stats.log') {
		const idx = content.lastIndexOf('Date: ');
		return idx !== -1 ? content.substring(idx) : content;
	}
	return content;
};

app.get('/', async (req, res) => {
	const logs = {};
	for (const [key, filename] of Object.entries(FILES)) {
		try {
			const content = await readFileContent(filename);
			logs[key] = transformContent(filename, content);
		} catch (err) {
			logs[key] = `Error reading ${filename}: ${err.message}`;
		}
	}

	res.render('index', { logs });
});

app.get('/logs/eve', async (req, res) => {
	const offset = parseInt(req.query.offset, 10) || 0;
	const limit = 100;

	try {
		const content = await readFileContent(FILES['Eve JSON']);
		const lines = content.split('\n').filter(Boolean);
		const sliced = lines.slice(offset, offset + limit);

		const transformed = sliced.map(line => {
			try {
				const json = JSON.parse(line);
				return {
					timestamp: json.timestamp,
					src_ip: json.src_ip,
					src_port: json.src_port,
					dest_ip: json.dest_ip,
					dest_port: json.dest_port,
					proto: json.proto,
					alert: json.alert?.signature,
					confidence: json.alert?.metadata?.confidence,
					domain: json.dns?.rrname,
				};
			} catch {
				return null;
			}
		}).filter(entry => entry !== null);
		res.json(transformed);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.get('/logs/suricata-log', async (req, res) => {
	try {
		const content = await readFileContent(FILES['Suricata Log']);
		res.json({ content });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.get('/logs/suricata-start', async (req, res) => {
	try {
		const content = await readFileContent(FILES['Suricata Start']);
		res.json({ content });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.get('/logs/fast-log', async (req, res) => {
	try {
		const content = await readFileContent(FILES['Fast Log']);
		res.json({ content });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.get('/logs/stats', async (req, res) => {
	try {
		const content = await readFileContent(FILES['Stats']);
		const idx = content.lastIndexOf('Date: ');
		const latest = idx !== -1 ? content.substring(idx) : content;
		res.json({ content: latest });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.use(notFound);
app.use(internalError);

const port = process.env.PORT;
app.listen(port, () => process.send ? process.send('ready') : console.log(`Server running at http://127.0.0.1:${port}`));