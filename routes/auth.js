const express = require('express');
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

const router = express.Router();

const RESET_TOKEN_EXPIRY_MINUTES = parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES || '60');

// Register a new user
router.post('/register',
    body('username').isLength({ min: 3 }).trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const { username, email, password, role } = req.body;

            // check username/email unique
            const [uRows] = await pool.query(
                'SELECT id FROM users WHERE username = ? OR email = ?',
                [username, email]
            );
            if (uRows.length) return res.status(400).json({ message: 'Username or email already in use' });

            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(password, salt);

            const [result] = await pool.query(
                'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                [username, email, hashed, role && role === 'admin' ? 'admin' : 'user']
            );

            return res.status(201).json({ message: 'User registered', userId: result.insertId });
        } catch (err) {
            next(err);
        }
    }
);

// login user
router.post('/login',
    body('email').isEmail().normalizeEmail(),
    body('password').exists(),
    async (req, res, next) => {
        try {
            const { email, password } = req.body;
            const [rows] = await pool.query(
                'SELECT id, password, role FROM users WHERE email = ?',
                [email]
            );
            if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });

            const user = rows[0];
            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.status(401).json({ message: 'Invalid credentials' });

            // create jwt
            const token = jwt.sign(
                { id: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRY || '1d' }
            );
            res.json({ token });
        } catch (err) {
            next(err);
        }
    }
);

// forgot password - generate reset token
router.post('/forgot-password',
    body('email').isEmail().normalizeEmail(),
    async (req, res, next) => {
        try {
            const { email } = req.body;
            const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
            if (!rows.length) {
                // avoid leaking which emails exist
                return res.json({ message: 'If that email exists, a reset token has been generated.' });
            }

            const userId = rows[0].id;
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

            await pool.query(
                'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
                [userId, token, expiresAt]
            );

            // Instead of sending mail, return token + expiry in response
            res.json({
                message: 'Password reset token generated',
                resetToken: token,
                expiresAt
            });
        } catch (err) {
            next(err);
        }
    }
);

// reset password using token
router.post('/reset-password',
    body('token').exists(),
    body('password').isLength({ min: 6 }),
    async (req, res, next) => {
        try {
            const { token, password } = req.body;
            const [rows] = await pool.query(
                'SELECT * FROM password_resets WHERE token = ? AND used = FALSE',
                [token]
            );
            if (!rows.length) return res.status(400).json({ message: 'Invalid or used token' });

            const reset = rows[0];
            if (new Date(reset.expires_at) < new Date()) {
                return res.status(400).json({ message: 'Token expired' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(password, salt);

            await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, reset.user_id]);
            await pool.query('UPDATE password_resets SET used = TRUE WHERE id = ?', [reset.id]);

            res.json({ message: 'Password reset successful' });
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;
