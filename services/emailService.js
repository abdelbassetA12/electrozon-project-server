const SibApiV3Sdk = require('@sendinblue/client');
require('dotenv').config();

// إعداد العميل
const client = new SibApiV3Sdk.TransactionalEmailsApi();
client.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_KEY);

// دالة إرسال البريد
async function sendEmail(to, subject, text, html = null) {
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail.to = [{ email: to }];
  sendSmtpEmail.sender = { name: 'CV Generator', email:  process.env.EMAIL_USER };  // استخدام البريد من ملف .env
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.textContent = text;
  if (html) sendSmtpEmail.htmlContent = html;

  try {
    // محاولة إرسال البريد
    const response = await client.sendTransacEmail(sendSmtpEmail);
    console.log('Email sent:', response);  // طباعة الاستجابة للتأكد من نجاح الإرسال
    return response;
  } catch (err) {
    // في حال حدوث خطأ
    console.error('Error sending email:', err);
    throw err;  // رمي الخطأ ليمكن التعامل معه في مكان آخر
  }
}

module.exports = { sendEmail };
