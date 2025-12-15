const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Admin = require('../models/Admin');
const authAdminMiddleware = require('../middleware/authAdminMiddleware');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const router = express.Router();

// ✅ إعداد nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 🔸 تصميم بريد HTML بسيط
const emailHTML = (username, actionText, actionLink, message) => `
  <div>
    <h2>مرحبًا ${username}</h2>
    <p>${message}</p>
    <a href="${actionLink}">${actionText}</a>
    <p>إذا لم تطلب ذلك، تجاهل الرسالة.</p>
  </div>
`;

// 🔹 تسجيل أدمن جديد
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) return res.status(400).json({ message: 'البريد مستخدم مسبقًا' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const newAdmin = new Admin({
      username,
      email,
      password: hashedPassword,
      emailVerificationToken: verificationToken,
    });

    await newAdmin.save();

    const verificationLink = `http://localhost:5000/api/authadmin/verify-email?token=${verificationToken}`;

    await transporter.sendMail({
      from: `"Admin System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'تأكيد البريد الإلكتروني',
      html: emailHTML(username, 'تأكيد البريد الإلكتروني', verificationLink, 'يرجى الضغط على الزر التالي لتفعيل حسابك.'),
    });

    res.status(201).json({ message: '✅ تم إنشاء الحساب. تحقق من بريدك الإلكتروني.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  }
});

// 🔹 تأكيد البريد
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('رمز التحقق مفقود');

  const admin = await Admin.findOne({ emailVerificationToken: token });
  if (!admin) return res.status(400).send('رمز غير صالح أو المستخدم غير موجود');

  admin.isVerified = true;
  admin.emailVerificationToken = undefined;
  await admin.save();

  res.redirect('http://localhost:3001/login?verified=1');
});

// 🔹 تسجيل الدخول
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: 'الأدمن غير موجود' });
    if (!admin.isVerified) return res.status(401).json({ message: 'يرجى تأكيد بريدك الإلكتروني أولاً' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: 'كلمة المرور غير صحيحة' });

    const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  }
});





router.post('/change-password', authAdminMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const admin = await Admin.findById(req.admin.id);
    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) return res.status(400).json({ message: 'كلمة المرور الحالية غير صحيحة' });

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ أثناء تغيير كلمة المرور' });
  }
});





router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: 'المستخدم غير موجود' });

    const resetToken = crypto.randomBytes(32).toString('hex');
admin.resetPasswordToken = resetToken;
admin.resetPasswordExpires = Date.now() + 1000 * 60 * 30; // 30 دقيقة
await admin.save();

const resetLink = `http://localhost:3001/reset-password?token=${resetToken}`;

// ✨ استخدم البريد المصمم
await transporter.sendMail({
  from: `"CV Generator" <${process.env.EMAIL_USER}>`,
  to: email,
  subject: '🔒 إعادة تعيين كلمة المرور',
  html: emailHTML(admin.username, 'إعادة تعيين كلمة المرور', resetLink, 'لقد طلبت إعادة تعيين كلمة المرور. اضغط على الزر أدناه للمتابعة:'),
});


    res.json({ message: '📩 تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني' });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء إرسال رابط إعادة التعيين' });
  }
});







router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    


    const admin = await Admin.findOne({
  resetPasswordToken: token,
  resetPasswordExpires: { $gt: Date.now() }, // ✅ لم ينتهِ بعد
});

    if (!admin) return res.status(400).json({ message: 'رمز غير صالح أو منتهي' });

    admin.password = await bcrypt.hash(newPassword, 10);
      // ✅ حذف صلاحية التعيين بعد الاستخدام
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    
    await admin.save();

    res.json({ message: '✅ تم تعيين كلمة المرور بنجاح' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء إعادة التعيين' });
  }
});


// 🔹 إرجاع بيانات الأدمن الحالي
router.get('/me', authAdminMiddleware, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('username email role isVerified');
    if (!admin) return res.status(404).json({ message: '❌ الأدمن غير موجود' });

    res.json({
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      isVerified: admin.isVerified,
    });
  } catch (err) {
    console.error('me route error:', err);
    res.status(500).json({ message: '❌ خطأ أثناء جلب بيانات الأدمن' });
  }
});

module.exports = router;
