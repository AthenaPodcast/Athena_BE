const adminOnly = (req, res, next) => {
  if (req.user.type !== 'admin') {
    return res.status(403).json({ message: 'Admin access only' });
  }
  next();
};

module.exports = adminOnly;
