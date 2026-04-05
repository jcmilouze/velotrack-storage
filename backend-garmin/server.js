import fs from 'fs';
import express from 'express';
import cors from 'cors';
import { spawn } from 'cross-spawn';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure temp dir exists for uploads
const tempDir = path.resolve(__dirname, 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for GPX content

const PORT = process.env.GARMIN_PORT || 3001;

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/upload', async (req, res) => {
    const { gpxContent, fileName, email, password } = req.body;
    
    const garminEmail = email || process.env.GARMIN_EMAIL;
    const garminPassword = password || process.env.GARMIN_PASSWORD;

    if (!garminEmail || !garminPassword || !gpxContent) {
        return res.status(400).json({ status: 'error', message: 'Missing credentials or GPX content' });
    }

    const tempPath = path.join(tempDir, `${uuidv4()}.gpx`);
    
    try {
        fs.writeFileSync(tempPath, gpxContent);
        
        console.log(`[VeloTrack] Uploading ${fileName} to Garmin for ${garminEmail}...`);

        const py = spawn('python', [
            'garmin_sync.py',
            '--email', garminEmail,
            '--password', garminPassword,
            '--upload', tempPath
        ], { cwd: __dirname });

        let stdout = '';
        let stderr = '';

        py.stdout.on('data', (d) => stdout += d.toString());
        py.stderr.on('data', (d) => stderr += d.toString());

        py.on('close', (code) => {
            // Cleanup temp file
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

            if (code !== 0) {
                return res.status(500).json({ status: 'error', message: 'Upload failed', details: stderr });
            }

            try {
                res.json(JSON.parse(stdout));
            } catch (e) {
                res.status(500).json({ status: 'error', message: 'Invalid output', details: stdout });
            }
        });
    } catch (e) {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        res.status(500).json({ status: 'error', message: e.message });
    }
});

app.post('/sync', (req, res) => {
    const { email, password } = req.body;
    
    const garminEmail = email || process.env.GARMIN_EMAIL;
    const garminPassword = password || process.env.GARMIN_PASSWORD;

    if (!garminEmail || !garminPassword) {
        return res.status(400).json({ 
            status: 'error', 
            message: '[VeloTrack] Identifiants Garmin manquants. Configurez GARMIN_EMAIL/GARMIN_PASSWORD.' 
        });
    }

    console.log(`[VeloTrack] Garmin Sync started for ${garminEmail}...`);

    // Execute Python Bridge
    const py = spawn('python', [
        'garmin_sync.py',
        '--email', garminEmail,
        '--password', garminPassword,
        '--limit', '5'
    ], { cwd: __dirname });

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (data) => { stdout += data.toString(); });
    py.stderr.on('data', (data) => { stderr += data.toString(); });

    py.on('close', (code) => {
        if (code !== 0) {
            console.error(`[VeloTrack] Bridge failed with code ${code}: ${stderr}`);
            return res.status(500).json({ 
                status: 'error', 
                message: 'Bridge execution failed', 
                details: stderr 
            });
        }

        try {
            const result = JSON.parse(stdout);
            res.json(result);
        } catch (e) {
            console.error(`[VeloTrack] Failed to parse bridge output: ${stdout}`);
            res.status(500).json({ 
                status: 'error', 
                message: 'Invalid output from Garmin bridge', 
                details: stdout 
            });
        }
    });
});

// ─── BRouter Routing Proxy ───────────────────────────────────────────────
// Redirige les calculs vers le container brouter-vps interne au VPS
app.get('/brouter', async (req, res) => {
    try {
        const query = req.url.split('?')[1];
        if (!query) return res.status(400).json({ error: 'Missing query parameters' });

        // On utilise le hostname interne de Coolify
        const brouterBase = process.env.BROUTER_INTERNAL_URL || 'http://brouter-vps:17777';
        const targetUrl = `${brouterBase}/brouter?${query}`;
        
        console.log(`[VeloTrack] Routing via ${targetUrl}...`);
        const response = await fetch(targetUrl);
        
        if (!response.ok) {
            throw new Error(`BRouter Internal Error: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (e) {
        console.error(`[VeloTrack] BRouter Proxy Failed:`, e.message);
        res.status(500).json({ 
            status: 'error', 
            message: 'Le moteur de calcul BRouter est injoignable sur le VPS.',
            details: e.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Garmin Bridge operational on port ${PORT}`);
});
