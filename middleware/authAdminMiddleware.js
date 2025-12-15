const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

async function authAdminMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: '⛔ غير مصرح. لا يوجد توكن' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const admin = await Admin.findById(decoded.id).select('username email role isVerified');
    if (!admin) return res.status(401).json({ message: '❌ الأدمن غير موجود' });

    req.admin = {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      isVerified: admin.isVerified,
    };

    next();
  } catch (err) {
    console.error('authAdminMiddleware error:', err);
    return res.status(403).json({ message: '❌ توكن الأدمن غير صالح' });
  }
}

module.exports = authAdminMiddleware;
