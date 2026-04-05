import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { spawn, exec } from 'child_process';
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

// Config CORS robuste
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// Healthcheck
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

/**
 * Proxy BRouter
 * Relais les requêtes vers le container local brouter-vps
 */
app.get('/brouter/*', async (req, res) => {
    const BROUTER_URL = process.env.BROUTER_INTERNAL_URL || 'http://brouter-vps:17777';
    const pathSegments = req.params[0] ? `/${req.params[0]}` : '/brouter';
    const params = new URLSearchParams(req.query as any);

    console.log(`[Bridge] Proxying BRouter: ${pathSegments}?${params.toString()}`);

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

        const brouterRes = await fetch(`${BROUTER_URL}${pathSegments}?${params.toString()}`, {
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        const data = await brouterRes.text();
        
        if (!brouterRes.ok) {
            console.error(`[Bridge] BRouter error ${brouterRes.status}:`, data.substring(0, 100));
        }

        res.status(brouterRes.status).send(data);
    } catch (error: any) {
        console.error('[Bridge] BRouter Proxy Error:', error.message);
        res.status(502).json({ 
            status: 'error', 
            message: 'BRouter inaccessible sur le réseau interne',
            details: error.message 
        });
    }
});

/**
 * Upload GPX to Garmin
 */
app.post('/upload', async (req, res) => {
    const { gpxContent, email, password } = req.body;
    const garminEmail = email || process.env.GARMIN_EMAIL;
    const garminPassword = password || process.env.GARMIN_PASSWORD;

    console.log(`[Bridge] Tentative d'upload Garmin pour: ${garminEmail}`);

    if (!garminEmail || !garminPassword || !gpxContent) {
        console.warn('[Bridge] Upload refusé: Identifiants ou GPX manquants');
        return res.status(400).json({ status: 'error', message: 'Missing credentials or GPX content' });
    }

    try {
        const tempPath = path.join(__dirname, 'temp_route.gpx');
        fs.writeFileSync(tempPath, gpxContent);

        const pythonCmd = process.env.PYTHON_COMMAND || 'python3';
        console.log(`[Bridge] Exécution de garmin_sync.py avec ${pythonCmd}...`);

        const { stdout, stderr } = await execPromise(
            `${pythonCmd} garmin_sync.py --email "${garminEmail}" --password "${garminPassword}" --upload "${tempPath}"`
        );

        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        if (stderr && !stdout.includes('Activity uploaded')) {
            console.error('[Bridge] Python Error:', stderr);
            return res.status(500).json({ status: 'error', message: stderr });
        }

        console.log('[Bridge] Upload réussi !');
        res.json({ status: 'success', data: stdout });
    } catch (error: any) {
        console.error('[Bridge] Upload Exception:', error.message);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Bridge operational on port ${port}`);
    console.log(`🔗 BRouter Target: ${process.env.BROUTER_INTERNAL_URL || 'http://brouter-vps:17777'}`);
});
