const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/authMiddleware');
const { permit } = require('../middleware/roleMiddleware');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// GET /tasks?status=To Do&q=keyword
router.get('/', authenticateToken, async (req, res, next) => {
    try {
        const { status, q } = req.query;
        const isAdmin = req.user.role === 'admin';
        let sql = 'SELECT t.*, u.username, u.email FROM tasks t JOIN users u ON t.user_id = u.id';
        const params = [];
        const where = [];

        if (!isAdmin) {
            where.push('t.user_id = ?');
            params.push(req.user.id);
        }

        if (status) {
            where.push('t.status = ?');
            params.push(status);
        }

        if (q) {
            where.push('(t.title LIKE ? OR t.description LIKE ?)');
            params.push(`%${q}%`, `%${q}%`);
        }

        if (where.length) sql += ' WHERE ' + where.join(' AND ');

        sql += ' ORDER BY t.created_at DESC';
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// POST /tasks
router.post('/',
    authenticateToken,
    body('title').isLength({ min: 1 }).trim(),
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const { title, description } = req.body;
            const [result] = await pool.query('INSERT INTO tasks (user_id, title, description) VALUES (?, ?, ?)', [req.user.id, title, description || null]);
            const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
            res.status(201).json(rows[0]);
        } catch (err) {
            next(err);
        }
    }
);

// GET /tasks/:id
router.get('/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT t.*, u.username, u.email FROM tasks t JOIN users u ON t.user_id = u.id WHERE t.id = ?', [id]);
        if (!rows.length) return res.status(404).json({ message: 'Task not found' });
        const task = rows[0];

        if (req.user.role !== 'admin' && task.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

        res.json(task);
    } catch (err) {
        next(err);
    }
});

// PUT /tasks/:id
router.put('/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, status } = req.body;

        // fetch task
        const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
        if (!rows.length) return res.status(404).json({ message: 'Task not found' });
        const task = rows[0];
        if (req.user.role !== 'admin' && task.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

        const fields = [];
        const params = [];
        if (title !== undefined) { fields.push('title = ?'); params.push(title); }
        if (description !== undefined) { fields.push('description = ?'); params.push(description); }
        if (status !== undefined) { fields.push('status = ?'); params.push(status); }

        if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });

        params.push(id);
        const sql = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;
        await pool.query(sql, params);

        const [updated] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
        res.json(updated[0]);
    } catch (err) {
        next(err);
    }
});

// DELETE /tasks/:id
router.delete('/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
        if (!rows.length) return res.status(404).json({ message: 'Task not found' });
        const task = rows[0];
        if (req.user.role !== 'admin' && task.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

        await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
