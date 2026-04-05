import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execPromise = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = process.env.GARMIN_PORT || 3001;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type'] }));
app.use(express.json({ limit: '10mb' }));

// Healthcheck
app.get('/health', (req, res) => res.json({ status: 'ok' }));

/**
 * Proxy BRouter ULTRA-TRANSPARENT
 */
app.get('/brouter/*', async (req, res) => {
    const BROUTER_URL = process.env.BROUTER_INTERNAL_URL || 'http://brouter-vps:17777';
    // On garde exactement le chemin après /brouter
    const internalPath = req.params[0] ? `/${req.params[0]}` : '';
    const params = new URLSearchParams(req.query as any);

    const targetUrl = `${BROUTER_URL}${internalPath}?${params.toString()}`;
    console.log(`[Bridge] -> ${targetUrl}`);

    try {
        const brouterRes = await fetch(targetUrl, { timeout: 10000 } as any);
        const data = await brouterRes.text();
        res.status(brouterRes.status).send(data);
    } catch (error) {
        res.status(502).json({ status: 'error', message: 'BRouter inaccessible', details: error.message });
    }
});

app.post('/upload', async (req, res) => {
    const { gpxContent, email, password } = req.body;
    const garminEmail = email || process.env.GARMIN_EMAIL;
    const garminPassword = password || process.env.GARMIN_PASSWORD;

    if (!garminEmail || !garminPassword || !gpxContent) {
        return res.status(400).json({ status: 'error', message: 'Missing credentials' });
    }

    try {
        const tempPath = path.join(__dirname, 'temp_route.gpx');
        fs.writeFileSync(tempPath, gpxContent);
        const pythonCmd = process.env.PYTHON_COMMAND || 'python3';

        const { stdout, stderr } = await execPromise(
            `${pythonCmd} garmin_sync.py --email "${garminEmail}" --password "${garminPassword}" --upload "${tempPath}"`
        );

        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        if (stderr && !stdout.includes('Activity uploaded')) {
            return res.status(500).json({ status: 'error', message: stderr });
        }

        res.json({ status: 'success', data: stdout });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Bridge operational on port ${port}`);
});
