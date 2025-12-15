const express = require("express");
const Contact = require("../models/Contact");
const adminMiddleware = require("../middleware/authAdminMiddleware"); // تأكد من وجوده
const nodemailer = require("nodemailer");
const { sendEmail } = require('../services/emailService');  // استيراد الدالة من emailService.js
require("dotenv").config();
const router = express.Router();

/*
// إعداد nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // إذا الحساب عليه 2FA استخدم App Password
  },
});
*/




// إرسال استفسار فقط
router.post("/inquiry", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: "⚠️ كل الحقول مطلوبة" });
    }

    const contact = new Contact({ name, email, inquiry: message });
    await contact.save();

     // إرسال البريد الإلكتروني بعد حفظ الاستفسار
    await sendEmail(
      email,  // إرسال إلى نفس البريد الذي أرسله
      'استفسار تم استلامه',
      `لقد تلقينا استفسارك. شكرًا لك! الرسالة: ${message}`
    );
    res.json({ success: true, message: "✅ تم إرسال الاستفسار" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});




// إرسال ملاحظة فقط
router.post("/feedback", async (req, res) => {
  try {
    const { name, email, note, rating } = req.body;

    if (!name || !email || !note) {
      return res.status(400).json({ success: false, error: "⚠️ كل الحقول مطلوبة" });
    }

    const contact = new Contact({
      name,
      email,
      feedback: note,
      rating, // حفظ التقييم
    });

    await contact.save();

     // إرسال البريد الإلكتروني بعد حفظ الملاحظة
        await sendEmail(
          email,  // إرسال إلى نفس البريد الذي أرسله
          'ملاحظة تم استلامها',
          `لقد تلقينا ملاحظتك: ${note}`
        );
    
    res.json({ success: true, message: "✅ تم إرسال الملاحظة" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
/*
// إرسال ملاحظة فقط
router.post("/feedback", async (req, res) => {
  try {
    const { name, email, note } = req.body;
    if (!name || !email || !note) {
      return res.status(400).json({ success: false, error: "⚠️ كل الحقول مطلوبة" });
    }

    const contact = new Contact({ name, email, feedback: note });
    await contact.save();
    res.json({ success: true, message: "✅ تم إرسال الملاحظة" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
*/




// 🔹 جلب كل الرسائل (الاستفسارات والملاحظات)
router.get("/messages", adminMiddleware, async (req, res) => {
  try {
    const messages = await Contact.find().sort({ date: -1 }); // الأحدث أولاً
    res.json({ success: true, messages });
  } catch (err) {
    console.error("❌ Error fetching messages:", err);
    res.status(500).json({ success: false, message: "خطأ في السيرفر", error: err.message });
  }
});














// 🔹 الرد على رسالة المستخدم
// 🔹 الرد على رسالة المستخدم
router.post("/reply/:id", adminMiddleware, async (req, res) => {
  try {
    const { message } = req.body; // نص الرد
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ success: false, message: "❌ الرسالة غير موجودة" });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "⚠️ نص الرد مطلوب" });
    }

    // إرسال البريد إلى البريد الذي أدخله المستخدم
    /*
    await transporter.sendMail({
      from: `"CV Generator" <${process.env.EMAIL_USER}>`,
      to: contact.email, // البريد الصحيح للمستخدم
      subject: "رد على رسالتك",
      html: `
        <div style="font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; background: #f8f9fa;">
          <div style="max-width: 500px; margin: auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
            <h3>مرحبًا ${contact.name} 👋</h3>
            <p>لقد تلقينا رسالتك، وإليك رد الأدمن:</p>
            <p style="background: #f0f0f0; padding: 15px; border-radius: 8px;">${message}</p>
            <p style="color: #888; font-size: 0.9rem;">إذا لم تطلب ذلك، يمكنك تجاهل هذا البريد بأمان.</p>
          </div>
        </div>
      `,
    });
    */
     // إرسال البريد باستخدام Brevo API عبر الدالة sendEmail
        await sendEmail(
          contact.email,  // إرسال إلى البريد الذي أدخله المستخدم
          "رد على رسالتك",
          `مرحبًا ${contact.name} 👋\n\nلقد تلقينا رسالتك، وإليك رد الأدمن:\n\n${message}`,
          `<div style="font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; background: #f8f9fa;">
             <div style="max-width: 500px; margin: auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
               <h3>مرحبًا ${contact.name} 👋</h3>
               <p>لقد تلقينا رسالتك، وإليك رد الأدمن:</p>
               <p style="background: #f0f0f0; padding: 15px; border-radius: 8px;">${message}</p>
               <p style="color: #888; font-size: 0.9rem;">إذا لم تطلب ذلك، يمكنك تجاهل هذا البريد بأمان.</p>
             </div>
           </div>`
        );

    res.json({ success: true, message: "✅ تم إرسال الرد إلى البريد الإلكتروني للمستخدم" });
  } catch (err) {
    console.error("❌ Reply Error:", err);
    res.status(500).json({ success: false, message: "حدث خطأ أثناء إرسال الرد", error: err.message });
  }
});

module.exports = router;
