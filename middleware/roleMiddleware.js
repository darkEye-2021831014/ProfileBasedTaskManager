function permit(...allowedRoles) {
    return (req, res, next) => {
        const { role } = req.user || {};
        if (!role) return res.status(401).json({ message: 'Unauthorized' });
        if (allowedRoles.includes(role)) return next();
        return res.status(403).json({ message: 'Forbidden: insufficient rights' });
    };
}

module.exports = { permit };
