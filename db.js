const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'task_manager',
    waitForConnections: true,
    connectionLimit: 10,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
});

module.exports = pool;
