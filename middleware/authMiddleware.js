

const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: '⛔ غير مصرح' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.id).select(
      'username email subscriptionPlan isVerified isSubscribed subscriptionExpiresAt'
    );

    if (!user) return res.status(401).json({ message: '❌ المستخدم غير موجود' });

    if (!user.isVerified) {
      return res.status(403).json({ message: '⚠️ لم يتم تفعيل البريد الإلكتروني بعد' });
    }

    // ✅ التحقق من صلاحية الاشتراك
    const now = new Date();
    if (user.isSubscribed && user.subscriptionExpiresAt && now > user.subscriptionExpiresAt) {
      user.isSubscribed = false;
      await user.save(); // تحديث الحالة في قاعدة البيانات
    }

    req.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      subscriptionPlan: user.subscriptionPlan,
      isVerified: user.isVerified,
      isSubscribed: user.isSubscribed,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
    };

    next();
  } catch (err) {
    console.error('authMiddleware error:', err);
    return res.status(403).json({ message: '❌ توكن غير صالح' });
  }
}

module.exports = authMiddleware;








