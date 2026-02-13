
import express from 'express';
import pg from 'pg';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const sessions = new Map();

function generateToken() {
    return crypto.randomUUID() + '-' + crypto.randomBytes(16).toString('hex');
}

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.split(' ')[1];
    const session = sessions.get(token);
    if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }
    req.user = session;
    next();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');
const isProduction = fs.existsSync(distPath);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PATCH", "DELETE"]
    }
});

app.use(cors());
app.use(express.json());

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Move API routes BEFORE static file serving
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    options: "-c timezone=Asia/Kolkata",
});

pool.on('connect', (client) => {
    client.query("SET timezone = 'Asia/Kolkata'");
});

// Normalize sort_order on startup - ensures sequential values for waiting patients
async function normalizeSortOrder() {
    try {
        // Ensure FAMILY/RELATIVE types have sort_order = 0
        await pool.query(`UPDATE visits SET sort_order = 0 WHERE type IN ('FAMILY', 'RELATIVE')`);
        
        // Renumber non-pinned waiting patients for today with sequential sort_order
        await pool.query(`
            WITH ranked AS (
                SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_order
                FROM visits 
                WHERE DATE(created_at) = CURRENT_DATE 
                AND status = 'WAITING' 
                AND type NOT IN ('FAMILY', 'RELATIVE')
                AND (sort_order IS NULL OR sort_order = 0)
            )
            UPDATE visits 
            SET sort_order = ranked.new_order 
            FROM ranked 
            WHERE visits.id = ranked.id
        `);
        console.log('Sort order normalization completed');
    } catch (err) {
        console.error('Sort order normalization error:', err.message);
    }
}

// Run normalization on startup
normalizeSortOrder();

// Aggressive Cache-Control for Development
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});

// Get metadata (hospital name, etc.)
app.get('/api/metadata', (req, res) => {
    try {
        const metadataPath = path.join(__dirname, 'metadata.json');
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        res.json(metadata);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read metadata' });
    }
});

app.get('/api/app-settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM app_sett ORDER BY id DESC LIMIT 1');
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No settings found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('App settings error:', err);
        res.status(500).json({ error: 'Failed to fetch app settings' });
    }
});

app.post('/api/plan-inquiry', async (req, res) => {
    try {
        const { name, hospital_name, address, mobile, email, plan_type, days, amount } = req.body;
        if (!name || !hospital_name || !mobile || !email || !plan_type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        await pool.query(
            `INSERT INTO plan_inquiries (name, hospital_name, address, mobile, email, plan_type, days, amount) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [name, hospital_name, address || '', mobile, email, plan_type, parseInt(days) || 0, parseInt(amount) || 0]
        );
        res.json({ success: true, message: 'Inquiry submitted successfully' });
    } catch (err) {
        console.error('Plan inquiry error:', err);
        res.status(500).json({ error: 'Failed to submit inquiry' });
    }
});

// Login endpoint - validates against secretcred.json
app.post('/api/login', (req, res) => {
    try {
        const { username, password, mobile } = req.body;
        
        if (!username || !password || !mobile) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }
        
        const credPath = path.join(__dirname, 'secretcred.json');
        const credData = JSON.parse(fs.readFileSync(credPath, 'utf8'));
        
        const user = credData.users.find(u => 
            u.username.toUpperCase() === username.toUpperCase() &&
            u.password === password &&
            u.mobile === mobile
        );
        
        if (user) {
            const token = generateToken();
            sessions.set(token, { role: user.role.toUpperCase(), username: user.username, mobile: user.mobile });
            res.json({ 
                success: true, 
                role: user.role.toUpperCase(),
                username: user.username,
                token: token
            });
        } else {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

app.post('/api/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        sessions.delete(token);
    }
    res.json({ success: true });
});

app.get('/api/display/queue', async (req, res) => {
    try {
        const patientsRes = await pool.query(
            `SELECT v.id, v.name, v.age, v.gender, v.city, v.type, v.category, v.status, 
                    v.queue_id, v.created_at, v.in_time, v.sort_order
             FROM visits v 
             WHERE DATE(v.created_at) = CURRENT_DATE 
             ORDER BY v.created_at ASC`
        );
        
        const data = patientsRes.rows.map(p => ({
            id: p.id,
            name: p.name,
            age: p.age,
            gender: p.gender,
            city: p.city,
            type: p.type,
            category: p.category,
            status: p.status,
            queueId: p.queue_id,
            createdAt: p.created_at,
            inTime: p.in_time,
            sortOrder: p.sort_order || 0
        }));
        
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Tag suggestion endpoints for autocomplete
app.get('/api/tags/complaints', requireAuth, async (req, res) => {
    try {
        const q = req.query.q || '';
        const result = await pool.query(
            'SELECT name FROM complaint_tags WHERE LOWER(name) LIKE LOWER($1) ORDER BY usage_count DESC LIMIT 15',
            [`%${q}%`]
        );
        res.json(result.rows.map(r => r.name));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/tags/diagnosis', requireAuth, async (req, res) => {
    try {
        const q = req.query.q || '';
        const result = await pool.query(
            'SELECT name FROM diagnosis_tags WHERE LOWER(name) LIKE LOWER($1) ORDER BY usage_count DESC LIMIT 15',
            [`%${q}%`]
        );
        res.json(result.rows.map(r => r.name));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/tags/medicines', requireAuth, async (req, res) => {
    try {
        const q = req.query.q || '';
        const result = await pool.query(
            'SELECT name FROM medicine_tags WHERE LOWER(name) LIKE LOWER($1) ORDER BY usage_count DESC LIMIT 15',
            [`%${q}%`]
        );
        res.json(result.rows.map(r => r.name));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all patients with their messages (filtered by today's date)
app.get('/api/patients', requireAuth, async (req, res) => {
    try {
        // Filter visits where created_at is today, with subquery to check for previous visits
        const patientsRes = await pool.query(
            `SELECT v.*, 
                    CASE WHEN v.patient_id IS NOT NULL AND EXISTS(
                        SELECT 1 FROM visits v2 
                        WHERE v2.patient_id = v.patient_id 
                        AND DATE(v2.created_at) < CURRENT_DATE
                    ) THEN true ELSE false END as has_previous_visits
             FROM visits v 
             WHERE DATE(v.created_at) = CURRENT_DATE 
             ORDER BY v.created_at ASC`
        );
        const messagesRes = await pool.query('SELECT * FROM messages ORDER BY timestamp ASC');
        
        const patients = patientsRes.rows;
        const messages = messagesRes.rows;

        const data = patients.map(p => ({
            ...p,
            queueId: p.queue_id,
            patientId: p.patient_id,
            hasPreviousVisits: p.has_previous_visits,
            createdAt: p.created_at,
            inTime: p.in_time,
            outTime: p.out_time,
            hasUnreadAlert: !!p.has_unread_alert,
            sortOrder: p.sort_order || 0,
            followUpDate: p.follow_up_date,
            messages: messages.filter(m => m.patient_id === p.id).map(m => ({
                ...m,
                patientId: m.patient_id
            }))
        }));
        
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.use('/site', express.static(path.join(__dirname, 'website'), {
    setHeaders: (res, filePath) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }
}));

if (isProduction) {
    app.use(express.static(distPath, {
        setHeaders: (res, filePath) => {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        }
    }));
}

// Helper to safely convert timestamp to ISO string
const toISOSafe = (ts, fallbackToNow = false) => {
    if (!ts) return fallbackToNow ? new Date().toISOString() : null;
    const date = new Date(ts);
    if (isNaN(date.getTime())) return fallbackToNow ? new Date().toISOString() : null;
    return date.toISOString();
};

// Helper to format date to YYYY-MM-DD without timezone shift
const formatDateLocal = (date) => {
    if (!date) return null;
    if (typeof date === 'string') return date.split('T')[0];
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Get next queue ID for today (only counts PATIENT category, not VISITOR)
app.get('/api/next-queue-id', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT COALESCE(MAX(queue_id), 0) + 1 as next_id 
             FROM visits 
             WHERE DATE(created_at) = CURRENT_DATE AND category = 'PATIENT'`
        );
        res.json({ nextQueueId: result.rows[0].next_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Patient Lookup by Mobile Number - returns patients from patient table matching the mobile
app.get('/api/patients/lookup/:mobile', requireAuth, async (req, res) => {
    try {
        const { mobile } = req.params;
        if (!mobile || mobile.length < 3) {
            return res.json([]);
        }
        const result = await pool.query(
            'SELECT id, name, age, gender, city, mobile FROM patient WHERE mobile LIKE $1 ORDER BY name ASC LIMIT 10',
            [`%${mobile}%`]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Patient lookup error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Patient History - Get all visits for a specific patient by patient_id
app.get('/api/patients/:patientId/history', requireAuth, async (req, res) => {
    try {
        const { patientId } = req.params;
        
        // First get patient details from patient table
        const patientResult = await pool.query(
            'SELECT id, name, age, gender, city, mobile, created_at FROM patient WHERE id = $1',
            [patientId]
        );
        
        if (patientResult.rows.length === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        
        const patient = patientResult.rows[0];
        
        // Get all PREVIOUS visits for this patient (exclude today's visit), ordered by date (newest first)
        const visitsResult = await pool.query(
            `SELECT id, queue_id, name, age, gender, category, type, city, mobile, status, 
                    created_at, in_time, out_time, notes, medicines,
                    bp, temperature, pulse, weight, spo2, complaints, diagnosis, prescription, advice, follow_up_date
             FROM visits 
             WHERE patient_id = $1 AND DATE(created_at) < CURRENT_DATE
             ORDER BY created_at DESC`,
            [patientId]
        );
        
        // Format dates for frontend
        const visits = visitsResult.rows.map(v => ({
            ...v,
            createdAt: v.created_at ? new Date(v.created_at).toISOString() : null,
            inTime: v.in_time ? new Date(v.in_time).toISOString() : null,
            outTime: v.out_time ? new Date(v.out_time).toISOString() : null,
            queueId: v.queue_id,
            followUpDate: v.follow_up_date
        }));
        
        res.json({
            patient: {
                id: patient.id,
                name: patient.name,
                age: patient.age,
                gender: patient.gender,
                city: patient.city,
                mobile: patient.mobile,
                createdAt: patient.created_at ? new Date(patient.created_at).toISOString() : null
            },
            visits: visits,
            totalVisits: visits.length
        });
    } catch (err) {
        console.error('Patient history error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Patient Report: Search with filters and date range (returns last 150 records by default)
app.get('/api/patients/report', requireAuth, async (req, res) => {
    try {
        const { name, city, mobile, startDate, endDate } = req.query;
        
        let query = 'SELECT * FROM visits WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        
        if (name) {
            query += ` AND LOWER(name) LIKE LOWER($${paramIndex})`;
            params.push(`%${name}%`);
            paramIndex++;
        }
        
        if (city) {
            query += ` AND LOWER(city) LIKE LOWER($${paramIndex})`;
            params.push(`%${city}%`);
            paramIndex++;
        }
        
        if (mobile) {
            query += ` AND mobile LIKE $${paramIndex}`;
            params.push(`%${mobile}%`);
            paramIndex++;
        }
        
        if (startDate) {
            query += ` AND DATE(created_at) >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }
        
        if (endDate) {
            query += ` AND DATE(created_at) <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }
        
        query += ' ORDER BY created_at DESC LIMIT 150';
        
        const result = await pool.query(query, params);
        
        const data = result.rows.map(p => ({
            ...p,
            queueId: p.queue_id,
            patientId: p.patient_id,
            createdAt: p.created_at,
            inTime: p.in_time,
            outTime: p.out_time,
            hasUnreadAlert: !!p.has_unread_alert,
            followUpDate: p.follow_up_date
        }));
        
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add new patient (with atomic queue ID assignment using transaction)
app.post('/api/patients', requireAuth, async (req, res) => {
    const client = await pool.connect();
    try {
        const p = req.body;
        console.log('Adding patient:', p.id);
        const createdAt = toISOSafe(p.createdAt, true);
        const inTime = toISOSafe(p.inTime, true);
        
        await client.query('BEGIN');
        
        // For PATIENT category, calculate queue_id atomically within transaction
        let queueId = 0;
        if (p.category === 'PATIENT') {
            // Lock today's patient rows to prevent race conditions, then calculate max
            const lockResult = await client.query(
                `SELECT queue_id FROM visits 
                 WHERE DATE(created_at) = CURRENT_DATE AND category = 'PATIENT'
                 FOR UPDATE`
            );
            const maxQueueId = lockResult.rows.length > 0 
                ? Math.max(...lockResult.rows.map(r => r.queue_id)) 
                : 0;
            queueId = maxQueueId + 1;
        }
        
        // For FAMILY/RELATIVE types, sort_order = 0 (pinned at top)
        // For other types, sort_order = max + 1 (new at bottom of queue)
        const isPinned = p.type === 'FAMILY' || p.type === 'RELATIVE';
        let sortOrder = 0;
        
        if (!isPinned) {
            // Get max sort_order for non-pinned waiting patients today
            const maxResult = await client.query(
                `SELECT COALESCE(MAX(sort_order), 0) as max_order FROM visits 
                 WHERE DATE(created_at) = CURRENT_DATE 
                 AND status = 'WAITING' 
                 AND type NOT IN ('FAMILY', 'RELATIVE')`
            );
            sortOrder = (maxResult.rows[0].max_order || 0) + 1;
        }
        
        // First, check if patient exists in patient table or create new
        let patientId = null;
        if (p.mobile && p.mobile.trim() !== '') {
            // Check if this patient (name + mobile) already exists
            const existingPatient = await client.query(
                'SELECT id FROM patient WHERE name = $1 AND mobile = $2',
                [p.name, p.mobile]
            );
            if (existingPatient.rows.length > 0) {
                patientId = existingPatient.rows[0].id;
            } else {
                // Create new patient record
                const newPatient = await client.query(
                    'INSERT INTO patient (name, age, gender, city, mobile, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                    [p.name, p.age, p.gender, p.city, p.mobile, createdAt]
                );
                patientId = newPatient.rows[0].id;
            }
        } else {
            // No mobile number, create new patient record anyway
            const newPatient = await client.query(
                'INSERT INTO patient (name, age, gender, city, mobile, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                [p.name, p.age, p.gender, p.city, p.mobile || null, createdAt]
            );
            patientId = newPatient.rows[0].id;
        }
        
        const result = await client.query(
            'INSERT INTO visits (id, patient_id, queue_id, name, age, gender, category, type, city, mobile, status, created_at, in_time, has_unread_alert, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING queue_id',
            [p.id, patientId, queueId, p.name, p.age, p.gender, p.category, p.type, p.city, p.mobile, p.status, createdAt, inTime, p.hasUnreadAlert, sortOrder]
        );
        
        await client.query('COMMIT');
        console.log('Insert result:', result.rowCount, 'Queue ID:', result.rows[0].queue_id, 'Patient ID:', patientId);
        
        io.emit('patient:add', { patientId: p.id, queueId: result.rows[0].queue_id });
        
        res.status(201).json({ success: true, queueId: result.rows[0].queue_id });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Insert error:', err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Update patient status/data
app.patch('/api/patients/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Map camelCase to snake_case for PG and convert timestamps safely
        const camelToSnake = {
            queueId: 'queue_id',
            createdAt: 'created_at',
            inTime: 'in_time',
            outTime: 'out_time',
            hasUnreadAlert: 'has_unread_alert',
            followUpDate: 'follow_up_date',
            patientId: 'patient_id',
            sortOrder: 'sort_order'
        };
        const timestampFields = ['createdAt', 'inTime', 'outTime'];
        const jsonbFields = ['complaints', 'diagnosis', 'prescription'];
        
        const pgUpdates = {};
        Object.keys(updates).forEach(key => {
            const pgKey = camelToSnake[key] || key;
            let val = updates[key];
            if (timestampFields.includes(key)) val = toISOSafe(val);
            if (jsonbFields.includes(key)) val = JSON.stringify(val);
            if (key === 'followUpDate' && val) {
                const validDayOptions = ['5', '7', '8', '15', '30'];
                if (validDayOptions.includes(String(val))) {
                    const days = parseInt(val, 10);
                    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
                    d.setDate(d.getDate() + days);
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    val = `${yyyy}-${mm}-${dd}`;
                }
            }
            pgUpdates[pgKey] = val;
        });

        const keys = Object.keys(pgUpdates);
        const values = Object.values(pgUpdates);
        
        if (keys.length === 0) return res.status(400).json({ error: 'No updates provided' });

        const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
        await pool.query(`UPDATE visits SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, id]);
        
        // Save tags for autocomplete suggestions
        if (updates.complaints && Array.isArray(updates.complaints)) {
            for (const tag of updates.complaints) {
                await pool.query(
                    'INSERT INTO complaint_tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET usage_count = complaint_tags.usage_count + 1',
                    [tag]
                );
            }
        }
        if (updates.diagnosis && Array.isArray(updates.diagnosis)) {
            for (const tag of updates.diagnosis) {
                await pool.query(
                    'INSERT INTO diagnosis_tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET usage_count = diagnosis_tags.usage_count + 1',
                    [tag]
                );
            }
        }
        if (updates.prescription && Array.isArray(updates.prescription)) {
            for (const rx of updates.prescription) {
                if (rx.name) {
                    await pool.query(
                        'INSERT INTO medicine_tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET usage_count = medicine_tags.usage_count + 1',
                        [rx.name]
                    );
                }
            }
        }
        
        io.emit('patient:update', { patientId: id, updates });
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Change patient status (handles sort_order logic)
app.post('/api/patients/:id/status', requireAuth, async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { status, outTime } = req.body;
        
        await client.query('BEGIN');
        
        // Get current patient
        const patientRes = await client.query(
            'SELECT status, sort_order, type FROM visits WHERE id = $1', [id]
        );
        if (patientRes.rows.length === 0) {
            throw new Error('Patient not found');
        }
        
        const patient = patientRes.rows[0];
        const oldStatus = patient.status;
        const isPinned = patient.type === 'FAMILY' || patient.type === 'RELATIVE';
        
        // If moving FROM WAITING to OPD/COMPLETED, renumber remaining waiting cards
        if (oldStatus === 'WAITING' && status !== 'WAITING' && !isPinned && patient.sort_order > 0) {
            await client.query(
                `UPDATE visits SET sort_order = sort_order - 1 
                 WHERE DATE(created_at) = CURRENT_DATE 
                 AND status = 'WAITING' 
                 AND type NOT IN ('FAMILY', 'RELATIVE')
                 AND sort_order > $1`,
                [patient.sort_order]
            );
        }
        
        // If moving TO WAITING (from OPD), assign sort_order = 1 and shift others
        let newSortOrder = 0;
        if (status === 'WAITING' && oldStatus !== 'WAITING' && !isPinned) {
            await client.query(
                `UPDATE visits SET sort_order = sort_order + 1 
                 WHERE DATE(created_at) = CURRENT_DATE 
                 AND status = 'WAITING' 
                 AND type NOT IN ('FAMILY', 'RELATIVE')
                 AND sort_order > 0`
            );
            newSortOrder = 1;
        }
        
        // Update patient status
        const updateFields = { status };
        // Always set out_time when completing, clear when moving back
        if (status === 'COMPLETED') {
            updateFields.out_time = outTime ? toISOSafe(outTime) : new Date().toISOString();
        } else if (status === 'WAITING' || status === 'OPD') {
            updateFields.out_time = null;
        }
        if (status === 'WAITING' && !isPinned) updateFields.sort_order = newSortOrder;
        if (status !== 'WAITING') updateFields.sort_order = 0;
        
        const keys = Object.keys(updateFields);
        const values = Object.values(updateFields);
        const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
        
        await client.query(`UPDATE visits SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, id]);
        
        await client.query('COMMIT');
        
        io.emit('patient:update', { patientId: id, updates: { status } });
        
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Reorder patient in waiting queue (move up or down)
app.post('/api/patients/:id/reorder', requireAuth, async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { direction } = req.body; // 'up' or 'down'
        
        await client.query('BEGIN');
        
        // Get current patient
        const patientRes = await client.query(
            'SELECT sort_order, type FROM visits WHERE id = $1', [id]
        );
        if (patientRes.rows.length === 0) {
            throw new Error('Patient not found');
        }
        
        const patient = patientRes.rows[0];
        const currentOrder = patient.sort_order;
        
        // Cannot reorder pinned types
        if (patient.type === 'FAMILY' || patient.type === 'RELATIVE') {
            return res.json({ success: false, message: 'Cannot reorder FAMILY/RELATIVE patients' });
        }
        
        // Find nearest neighbor patient to swap with (sort_order may not be consecutive)
        let adjacentRes;
        if (direction === 'up') {
            adjacentRes = await client.query(
                `SELECT id, sort_order FROM visits 
                 WHERE DATE(created_at) = CURRENT_DATE 
                 AND status = 'WAITING' 
                 AND type NOT IN ('FAMILY', 'RELATIVE')
                 AND sort_order < $1
                 ORDER BY sort_order DESC LIMIT 1`,
                [currentOrder]
            );
        } else {
            adjacentRes = await client.query(
                `SELECT id, sort_order FROM visits 
                 WHERE DATE(created_at) = CURRENT_DATE 
                 AND status = 'WAITING' 
                 AND type NOT IN ('FAMILY', 'RELATIVE')
                 AND sort_order > $1
                 ORDER BY sort_order ASC LIMIT 1`,
                [currentOrder]
            );
        }
        
        if (adjacentRes.rows.length === 0) {
            return res.json({ success: false, message: 'No patient to swap with' });
        }
        
        const adjacentId = adjacentRes.rows[0].id;
        const adjacentOrder = adjacentRes.rows[0].sort_order;
        
        // Swap sort orders
        await client.query('UPDATE visits SET sort_order = $1 WHERE id = $2', [adjacentOrder, id]);
        await client.query('UPDATE visits SET sort_order = $1 WHERE id = $2', [currentOrder, adjacentId]);
        
        await client.query('COMMIT');
        
        io.emit('patient:reorder', { patientId: id, direction });
        
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Drag-and-drop reorder endpoint
app.post('/api/patients/:id/move-to', requireAuth, async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { targetId } = req.body;
        
        await client.query('BEGIN');
        
        // Get source patient
        const sourceRes = await client.query(
            'SELECT sort_order, type, status FROM visits WHERE id = $1', [id]
        );
        if (sourceRes.rows.length === 0) {
            throw new Error('Source patient not found');
        }
        const source = sourceRes.rows[0];
        
        // Cannot reorder pinned types or non-waiting
        if (source.type === 'FAMILY' || source.type === 'RELATIVE') {
            return res.json({ success: false, message: 'Cannot reorder FAMILY/RELATIVE patients' });
        }
        if (source.status !== 'WAITING') {
            return res.json({ success: false, message: 'Can only reorder waiting patients' });
        }
        
        // Get target patient
        const targetRes = await client.query(
            'SELECT sort_order, type FROM visits WHERE id = $1', [targetId]
        );
        if (targetRes.rows.length === 0) {
            throw new Error('Target patient not found');
        }
        const target = targetRes.rows[0];
        
        // Cannot drop on pinned types
        if (target.type === 'FAMILY' || target.type === 'RELATIVE') {
            return res.json({ success: false, message: 'Cannot drop on FAMILY/RELATIVE patients' });
        }
        
        const sourceOrder = source.sort_order;
        const targetOrder = target.sort_order;
        
        if (sourceOrder === targetOrder) {
            return res.json({ success: true }); // No change needed
        }
        
        if (sourceOrder < targetOrder) {
            // Moving down: shift items between source+1 and target up by 1
            await client.query(
                `UPDATE visits SET sort_order = sort_order - 1 
                 WHERE DATE(created_at) = CURRENT_DATE 
                 AND status = 'WAITING' 
                 AND type NOT IN ('FAMILY', 'RELATIVE')
                 AND sort_order > $1 AND sort_order <= $2`,
                [sourceOrder, targetOrder]
            );
        } else {
            // Moving up: shift items between target and source-1 down by 1
            await client.query(
                `UPDATE visits SET sort_order = sort_order + 1 
                 WHERE DATE(created_at) = CURRENT_DATE 
                 AND status = 'WAITING' 
                 AND type NOT IN ('FAMILY', 'RELATIVE')
                 AND sort_order >= $1 AND sort_order < $2`,
                [targetOrder, sourceOrder]
            );
        }
        
        // Set source to target position
        await client.query('UPDATE visits SET sort_order = $1 WHERE id = $2', [targetOrder, id]);
        
        await client.query('COMMIT');
        
        io.emit('patient:reorder', { patientId: id });
        
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Delete patient
app.delete('/api/patients/:id', requireAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM visits WHERE id = $1', [req.params.id]);
        
        io.emit('patient:delete', { patientId: req.params.id });
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add message to chat
app.post('/api/patients/:id/messages', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const m = req.body;
        await pool.query(
            'INSERT INTO messages (id, patient_id, text, sender, timestamp) VALUES ($1, $2, $3, $4, $5)',
            [m.id, id, m.text, m.sender, m.timestamp]
        );
        await pool.query('UPDATE visits SET has_unread_alert = TRUE WHERE id = $1', [id]);
        
        io.emit('message:new', { patientId: id, message: m });
        
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Doctor calls operator - broadcasts to all connected clients
app.post('/api/call-operator', requireAuth, (req, res) => {
    console.log('Doctor calling operator...');
    io.emit('doctor:call-operator', { timestamp: Date.now() });
    res.json({ success: true });
});

// ==================== EVENT CALENDAR API ====================

// Get events for a month (or all if no filter)
app.get('/api/events', requireAuth, async (req, res) => {
    try {
        const { year, month } = req.query;
        let query = 'SELECT * FROM events';
        let params = [];
        
        if (year && month) {
            query += ' WHERE EXTRACT(YEAR FROM event_date) = $1 AND EXTRACT(MONTH FROM event_date) = $2';
            params = [year, month];
        }
        query += ' ORDER BY event_date ASC, event_time ASC';
        
        const result = await pool.query(query, params);
        const events = result.rows.map(e => ({
            id: e.id,
            title: e.title,
            eventDate: formatDateLocal(e.event_date),
            eventTime: e.event_time,
            description: e.description,
            eventType: e.event_type,
            remindMe: e.remind_me,
            createdBy: e.created_by,
            createdAt: e.created_at
        }));
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new event
app.post('/api/events', requireAuth, async (req, res) => {
    try {
        const { title, eventDate, eventTime, description, eventType, remindMe, createdBy } = req.body;
        const result = await pool.query(
            `INSERT INTO events (title, event_date, event_time, description, event_type, remind_me, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [title, eventDate, eventTime || null, description || '', eventType || 'NORMAL', remindMe || false, createdBy]
        );
        const e = result.rows[0];
        const event = {
            id: e.id,
            title: e.title,
            eventDate: formatDateLocal(e.event_date),
            eventTime: e.event_time,
            description: e.description,
            eventType: e.event_type,
            remindMe: e.remind_me,
            createdBy: e.created_by,
            createdAt: e.created_at
        };
        
        io.emit('event:add', event);
        res.status(201).json(event);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update event
app.put('/api/events/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, eventDate, eventTime, description, eventType, remindMe } = req.body;
        const result = await pool.query(
            `UPDATE events SET title = $1, event_date = $2, event_time = $3, description = $4, 
             event_type = $5, remind_me = $6, updated_at = CURRENT_TIMESTAMP
             WHERE id = $7 RETURNING *`,
            [title, eventDate, eventTime || null, description || '', eventType || 'NORMAL', remindMe || false, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        const e = result.rows[0];
        const event = {
            id: e.id,
            title: e.title,
            eventDate: formatDateLocal(e.event_date),
            eventTime: e.event_time,
            description: e.description,
            eventType: e.event_type,
            remindMe: e.remind_me,
            createdBy: e.created_by,
            createdAt: e.created_at
        };
        
        io.emit('event:update', event);
        res.json(event);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete event
app.delete('/api/events/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM events WHERE id = $1', [id]);
        
        io.emit('event:delete', { eventId: parseInt(id) });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Statistics API - Dashboard analytics data
app.get('/api/statistics', requireAuth, async (req, res) => {
    try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(lastWeekStart.getDate() - 13);
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(thisWeekStart.getDate() - 6);

        // Today's patient count
        const todayRes = await pool.query(
            `SELECT COUNT(*) as count FROM visits WHERE DATE(created_at) = CURRENT_DATE`
        );
        const todayCount = parseInt(todayRes.rows[0].count) || 0;

        // Yesterday's count for trend
        const yesterdayRes = await pool.query(
            `SELECT COUNT(*) as count FROM visits WHERE DATE(created_at) = CURRENT_DATE - 1`
        );
        const yesterdayCount = parseInt(yesterdayRes.rows[0].count) || 0;

        // This month's count
        const monthRes = await pool.query(
            `SELECT COUNT(*) as count FROM visits 
             WHERE created_at >= $1::date AND created_at < (CURRENT_DATE + 1)`,
            [startOfMonth.toISOString().split('T')[0]]
        );
        const monthCount = parseInt(monthRes.rows[0].count) || 0;

        // Days elapsed in month for average calculation
        const daysInMonth = today.getDate();
        const avgPerDay = daysInMonth > 0 ? Math.round(monthCount / daysInMonth) : 0;

        // Last 7 days data for chart
        const last7DaysRes = await pool.query(
            `SELECT DATE(created_at) as date, COUNT(*) as count 
             FROM visits 
             WHERE created_at >= CURRENT_DATE - 6
             GROUP BY DATE(created_at) 
             ORDER BY date ASC`
        );

        // Fill in missing days with 0
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const found = last7DaysRes.rows.find(r => r.date.toISOString().split('T')[0] === dateStr);
            last7Days.push({
                date: dateStr,
                count: found ? parseInt(found.count) : 0,
                dayName: d.toLocaleDateString('en-US', { weekday: 'short' })
            });
        }

        // This week vs last week comparison
        const thisWeekRes = await pool.query(
            `SELECT COUNT(*) as count FROM visits 
             WHERE created_at >= CURRENT_DATE - 6`
        );
        const thisWeekCount = parseInt(thisWeekRes.rows[0].count) || 0;

        const lastWeekRes = await pool.query(
            `SELECT COUNT(*) as count FROM visits 
             WHERE created_at >= CURRENT_DATE - 13 AND created_at < CURRENT_DATE - 6`
        );
        const lastWeekCount = parseInt(lastWeekRes.rows[0].count) || 0;

        const weeklyChange = lastWeekCount > 0 
            ? Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100) 
            : (thisWeekCount > 0 ? 100 : 0);

        // Gender distribution
        const genderRes = await pool.query(
            `SELECT gender, COUNT(*) as count FROM visits 
             WHERE created_at >= $1::date
             GROUP BY gender`,
            [startOfMonth.toISOString().split('T')[0]]
        );
        const genderData = {
            male: 0,
            female: 0
        };
        genderRes.rows.forEach(r => {
            if (r.gender === 'Male') genderData.male = parseInt(r.count);
            else if (r.gender === 'Female') genderData.female = parseInt(r.count);
        });

        // Patient vs Visitor distribution
        const categoryRes = await pool.query(
            `SELECT category, COUNT(*) as count FROM visits 
             WHERE created_at >= $1::date
             GROUP BY category`,
            [startOfMonth.toISOString().split('T')[0]]
        );
        const categoryData = {
            patient: 0,
            visitor: 0
        };
        categoryRes.rows.forEach(r => {
            if (r.category === 'PATIENT') categoryData.patient = parseInt(r.count);
            else if (r.category === 'VISITOR') categoryData.visitor = parseInt(r.count);
        });

        // Top 3 cities
        const citiesRes = await pool.query(
            `SELECT city, COUNT(*) as count FROM visits 
             WHERE city IS NOT NULL AND city != '' AND created_at >= $1::date
             GROUP BY city 
             ORDER BY count DESC 
             LIMIT 3`,
            [startOfMonth.toISOString().split('T')[0]]
        );
        const topCities = citiesRes.rows.map(r => ({
            city: r.city,
            count: parseInt(r.count)
        }));

        // Busiest day of week (this month) - with specific date
        const busiestDayRes = await pool.query(
            `SELECT DATE(created_at) as specific_date, TO_CHAR(created_at, 'Day') as day_name, COUNT(*) as count 
             FROM visits 
             WHERE created_at >= $1::date
             GROUP BY DATE(created_at), TO_CHAR(created_at, 'Day')
             ORDER BY count DESC 
             LIMIT 1`,
            [startOfMonth.toISOString().split('T')[0]]
        );
        const busiestDay = busiestDayRes.rows[0] 
            ? { 
                day: busiestDayRes.rows[0].day_name.trim(), 
                count: parseInt(busiestDayRes.rows[0].count),
                date: busiestDayRes.rows[0].specific_date
              }
            : null;

        // New vs Returning patients (this month)
        // New = patient_id is null, Returning = patient_id exists (has previous visits)
        const newReturningRes = await pool.query(
            `SELECT 
                COUNT(*) FILTER (WHERE patient_id IS NULL) as new_patients,
                COUNT(*) FILTER (WHERE patient_id IS NOT NULL) as returning_patients
             FROM visits 
             WHERE created_at >= $1::date`,
            [startOfMonth.toISOString().split('T')[0]]
        );
        const newReturning = {
            newPatients: parseInt(newReturningRes.rows[0].new_patients) || 0,
            returningPatients: parseInt(newReturningRes.rows[0].returning_patients) || 0
        };

        // Last month comparison
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        const lastMonthRes = await pool.query(
            `SELECT COUNT(*) as count FROM visits 
             WHERE created_at >= $1::date AND created_at <= $2::date`,
            [lastMonthStart.toISOString().split('T')[0], lastMonthEnd.toISOString().split('T')[0]]
        );
        const lastMonthCount = parseInt(lastMonthRes.rows[0].count) || 0;
        const monthlyChange = lastMonthCount > 0 
            ? Math.round(((monthCount - lastMonthCount) / lastMonthCount) * 100) 
            : (monthCount > 0 ? 100 : 0);

        res.json({
            today: {
                count: todayCount,
                trend: todayCount - yesterdayCount,
                trendPercent: yesterdayCount > 0 ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100) : 0
            },
            month: {
                count: monthCount,
                avgPerDay
            },
            weekly: {
                thisWeek: thisWeekCount,
                lastWeek: lastWeekCount,
                change: weeklyChange
            },
            last7Days,
            gender: genderData,
            category: categoryData,
            topCities,
            busiestDay,
            newReturning,
            monthlyComparison: {
                thisMonth: monthCount,
                lastMonth: lastMonthCount,
                change: monthlyChange
            }
        });
    } catch (err) {
        console.error('Statistics error:', err);
        res.status(500).json({ error: err.message });
    }
});

// OPD Status Management - In-memory state (resets on server restart)
let opdStatus = {
    isPaused: false,
    pauseReason: ''
};

// Get OPD status options from OPDSTATUS.txt
app.get('/api/opd-status-options', (req, res) => {
    try {
        const filePath = path.join(__dirname, 'OPDSTATUS.txt');
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            const options = content.split('\n').filter(line => line.trim() !== '');
            res.json({ options });
        } else {
            res.json({ options: ['OPD is Paused. Please Wait'] });
        }
    } catch (err) {
        console.error('Error reading OPDSTATUS.txt:', err.message);
        res.json({ options: ['OPD is Paused. Please Wait'] });
    }
});

// Get current OPD status
app.get('/api/opd-status', (req, res) => {
    res.json(opdStatus);
});

// Set OPD status (toggle pause/unpause)
app.post('/api/opd-status', requireAuth, (req, res) => {
    try {
        const { isPaused, pauseReason } = req.body;
        opdStatus = {
            isPaused: isPaused || false,
            pauseReason: isPaused ? (pauseReason || '') : ''
        };
        
        // Broadcast OPD status change to all connected clients
        io.emit('opd:status-change', opdStatus);
        
        console.log('OPD Status changed:', opdStatus);
        res.json({ success: true, ...opdStatus });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reset-data', requireAuth, async (req, res) => {
    try {
        if (req.user.role !== 'DOCTOR') {
            return res.status(403).json({ error: 'Only doctors can reset data' });
        }
        await pool.query(`
            TRUNCATE TABLE visits, patient, messages, events, complaint_tags, diagnosis_tags
            RESTART IDENTITY CASCADE
        `);
        io.emit('queue:update');
        res.json({ success: true, message: 'All data has been reset successfully' });
    } catch (err) {
        console.error('Reset data error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Handle React routing, return all requests to React app (only in production)
if (isProduction) {
    app.get('*', (req, res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} with Socket.IO`);
});
