const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { sendEmail } = require('../services/emailService');  // استيراد الدالة من emailService.js
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
require('dotenv').config();

const SERVER_URL = process.env.SERVER_URL;   // السيرفر
const CLIENT_URL = process.env.CLIENT_URL;   // موقع العملاء



// 📧 تصميم HTML للبريد
const emailHTML = (username, actionText, actionLink, message) => `
  <div style="font-family: 'Cairo', sans-serif; background-color: #f8f9fa; padding: 20px; direction: rtl;">
    <div style="max-width: 500px; margin: auto; background: white; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); padding: 30px;">
      <h2 style="color: #00796b;">مرحبًا ${username} 👋</h2>
      <p style="color: #333;">${message}</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${actionLink}" style="background-color: #26a69a; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">
          ${actionText}
        </a>
      </div>
      <p style="color: #888; font-size: 0.9rem;">إذا لم تطلب ذلك، يمكنك تجاهل هذا البريد بأمان.</p>
    </div>
  </div>
`;


const JWT_SECRET = process.env.JWT_SECRET;
const router = express.Router();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 🔸 إنشاء حساب
router.post('/register', async (req, res) => {
  const { username, email, password, referralCode } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'البريد مستخدم مسبقًا' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // 🟡 إذا وُجد كود إحالة، ابحث عن المحيل
    let referredBy = null;
    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ referralCode });
      if (referrer) {
        referredBy = referralCode;
      }
    }

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      subscriptionPlan: 'basic',
      emailVerificationToken: verificationToken,
      referredBy,
    });

    await newUser.save();

    // 🟢 أضف المستخدم الجديد إلى قائمة referrals للمُحيل
    if (referrer) {
      referrer.referrals.push(newUser._id);
      await referrer.save();
    }

    //const verificationLink = `http://localhost:5000/api/auth/verify-email?token=${verificationToken}`;
     const verificationLink = `${SERVER_URL}/api/auth/verify-email?token=${verificationToken}`;
/*
    await transporter.sendMail({
      from: `"CV Generator" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'تأكيد البريد الإلكتروني',
      html: `<p>أهلاً ${username}،</p>
             <p>يرجى الضغط على الرابط التالي لتفعيل حسابك:</p>
             <a href="${verificationLink}">تأكيد البريد</a>`
    });
    */

     await sendEmail(
  email,
  'تأكيد البريد الإلكتروني',
  `أهلاً ${username}، يرجى الضغط على الرابط التالي لتفعيل حسابك: ${verificationLink}`,
  `<p>أهلاً ${username}،</p>
   <p>يرجى الضغط على الرابط التالي لتفعيل حسابك:</p>
   <a href="${verificationLink}">تأكيد البريد</a>`
);

    res.status(201).json({ message: '✅ تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتفعيل الحساب.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: ' خطأ في السيرفر' });
  }
});


// 🔸 تأكيد البريد
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('رمز التحقق مفقود');

  const user = await User.findOne({ emailVerificationToken: token });
  if (!user) return res.status(400).send('رمز غير صالح أو المستخدم غير موجود');

  user.isVerified = true;
  user.emailVerificationToken = undefined;
  await user.save();

  //res.send('✅ تم تأكيد البريد بنجاح. يمكنك الآن تسجيل الدخول.');
 // res.redirect('http://localhost:3000/login?verified=1');
    //res.send('✅ تم تأكيد البريد بنجاح. يمكنك الآن تسجيل الدخول.');
  res.redirect(`${CLIENT_URL}/login?verified=1`);

});

// 🔸 تسجيل الدخول
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: ' المستخدم غير موجود' });

    if (!user.isVerified) {
      return res.status(401).json({ message: 'يرجى تأكيد بريدك الإلكتروني أولاً' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: ' كلمة المرور غير صحيحة' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        subscriptionPlan: user.subscriptionPlan
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: ' خطأ في السيرفر' });
  }
});




router.post('/change-password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'كلمة المرور الحالية غير صحيحة' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ أثناء تغيير كلمة المرور' });
  }
});




router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'المستخدم غير موجود' });

    const resetToken = crypto.randomBytes(32).toString('hex');
user.resetPasswordToken = resetToken;
user.resetPasswordExpires = Date.now() + 1000 * 60 * 30; // 30 دقيقة
await user.save();

//const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
const resetLink = `${CLIENT_URL}/reset-password?token=${resetToken}`;

// ✨ استخدم البريد المصمم
/*
await transporter.sendMail({
  from: `"CV Generator" <${process.env.EMAIL_USER}>`,
  to: email,
  subject: '🔒 إعادة تعيين كلمة المرور',
  html: emailHTML(user.username, 'إعادة تعيين كلمة المرور', resetLink, 'لقد طلبت إعادة تعيين كلمة المرور. اضغط على الزر أدناه للمتابعة:'),
});
*/

await sendEmail(
  email,
  '🔒 إعادة تعيين كلمة المرور',
  `لقد طلبت إعادة تعيين كلمة المرور. اضغط على الرابط التالي: ${resetLink}`,
  emailHTML(user.username, 'إعادة تعيين كلمة المرور', resetLink, 'لقد طلبت إعادة تعيين كلمة المرور. اضغط على الزر أدناه للمتابعة:')
);



    res.json({ message: '📩 تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني' });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء إرسال رابط إعادة التعيين' });
  }
});








router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    


    const user = await User.findOne({
  resetPasswordToken: token,
  resetPasswordExpires: { $gt: Date.now() }, // ✅ لم ينتهِ بعد
});

    if (!user) return res.status(400).json({ message: 'رمز غير صالح أو منتهي' });

    user.password = await bcrypt.hash(newPassword, 10);
      // ✅ حذف صلاحية التعيين بعد الاستخدام
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();

    res.json({ message: '✅ تم تعيين كلمة المرور بنجاح' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء إعادة التعيين' });
  }
});














// 🔸 المستخدم الحالي
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      'username email subscriptionPlan isVerified isSubscribed subscriptionExpiresAt'
    );

    let isSubscribed = false;

    // ✅ المستخدم في الخطة المجانية دائماً مشترك
    if (user.subscriptionPlan === 'basic') {
      isSubscribed = true;
    }

    // ✅ المستخدم في خطة مدفوعة يتم التحقق من انتهاء الاشتراك
    else if (user.subscriptionExpiresAt) {
      const now = new Date();
      if (now < user.subscriptionExpiresAt) {
        isSubscribed = true;
      } else {
        user.isSubscribed = false;
        await user.save(); // ⛔ انتهى الاشتراك، احفظ التحديث
      }
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      subscriptionPlan: user.subscriptionPlan,
      isSubscribed,
      isVerified: user.isVerified,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
    });
  } catch (error) {
    console.error('me route error:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب معلومات المستخدم' });
  }
});










// 🔸 إعادة إرسال رابط التفعيل
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: '❌ المستخدم غير موجود' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: '✅ الحساب مفعل بالفعل' });
    }

    // إنشاء رمز تحقق جديد
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    await user.save();

   // const verificationLink = `http://localhost:5000/api/auth/verify-email?token=${verificationToken}`;
     const verificationLink = `${SERVER_URL}/api/auth/verify-email?token=${verificationToken}`;
/*
    await transporter.sendMail({
      from: `"CV Generator" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'إعادة إرسال رابط التفعيل',
      html: `<p>مرحبًا ${user.username}،</p>
             <p>يرجى الضغط على الرابط التالي لتفعيل حسابك:</p>
             <a href="${verificationLink}">تأكيد البريد</a>`
    });
    */


       await sendEmail(
  email,
  'إعادة إرسال رابط التفعيل',
  `مرحبًا ${user.username}، يرجى الضغط على الرابط التالي لتفعيل حسابك: ${verificationLink}`,
  `<p>مرحبًا ${user.username}،</p>
   <p>يرجى الضغط على الرابط التالي لتفعيل حسابك:</p>
   <a href="${verificationLink}">تأكيد البريد</a>`
);

    res.json({ message: '📩 تم إرسال رابط التفعيل إلى بريدك الإلكتروني' });
  } catch (err) {
    console.error('resend-verification error:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء إعادة إرسال التفعيل' });
  }
});




module.exports = router;









