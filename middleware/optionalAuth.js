const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // 🚀 لا يوجد توكن ➔ أكمل عادي بدون خطأ
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (user) {
      req.user = user; // ✅ أضف بيانات المستخدم للطلب
    }
  } catch (err) {
    console.error('optionalAuth error:', err);
    // ❌ إذا التوكن غير صالح ➔ تجاهله وأكمل بدون خطأ
  }

  next();
}

module.exports = optionalAuth;
