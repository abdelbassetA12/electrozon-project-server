const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const optionalAuth = require('../middleware/optionalAuth');
const authMiddleware = require('../middleware/authMiddleware');
const authAdminMiddleware = require('../middleware/authAdminMiddleware');



require('dotenv').config();

// إعداد transporter للبريد
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// تصميم بريد HTML
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

// 🔸 إنشاء طلب (مع التحقق من التوكن إذا موجود)
router.post('/create', optionalAuth, async (req, res) => {

  const { firstName, lastName, phone, city, address, email, products, totalPrice, password } = req.body;

  let userId = req.user ? req.user._id : null;

  try {
    // ✅ إذا لم يكن مسجل دخول وأرسل كلمة مرور ➔ إنشاء حساب
    if (!userId && password && email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'هذا الإيميل مسجل مسبقًا. قم بتسجيل الدخول.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = crypto.randomBytes(32).toString('hex');

      const newUser = new User({
        username: firstName + ' ' + lastName,
        email,
        password: hashedPassword,
        subscriptionPlan: 'basic',
        emailVerificationToken: verificationToken,
      });

      const savedUser = await newUser.save();
      userId = savedUser._id;

      const verificationLink = `http://localhost:5000/api/auth/verify-email?token=${verificationToken}`;

      // ✉️ إرسال بريد التفعيل
      await transporter.sendMail({
        from: `"Your App" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'تأكيد البريد الإلكتروني',
        html: emailHTML(
          newUser.username,
          'تأكيد البريد الإلكتروني',
          verificationLink,
          'يرجى الضغط على الزر أدناه لتفعيل حسابك:'
        ),
      });
    }

    // ✅ إنشاء الطلب
    /*
    const newOrder = new Order({
      user: userId,
      firstName,
      lastName,
      phone,
      city,
      address,
      email,
      products,
      totalPrice,
    });
    */
   const newOrder = new Order({
  user: userId,
  firstName,
  lastName,
  phone,
  city,
  address,
  email,
  products: products.map(p => ({
    productId: p.productId || p._id,
    name: p.name,
    price: p.price,
    quantity: p.quantity,
    selectedOptions: Object.entries(p.selectedOptions || {}).map(([key, val]) => ({
      name: key,
      value: val.value || val,
      priceModifier: val.priceModifier || 0
    }))
  })),
  totalPrice,
});


    const savedOrder = await newOrder.save();

    res.json({
      message: userId
        ? '✅ تم إنشاء الطلب وهو مرتبط بحسابك.'
        : '✅ تم إنشاء الطلب بنجاح.',
      order: savedOrder,
    });

  } catch (error) {
    console.error("❌ خطأ أثناء إنشاء الطلب:", error);
    res.status(500).json({ message: 'حدث خطأ أثناء إنشاء الطلب' });
  }
});



// 🔄 تحديث حالة الطلب (يتطلب صلاحية Admin)
/*
router.put('/update-status/:orderId', async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['قيد الانتظار', 'قيد الشحن', 'تم التسليم', 'ملغي'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: '⚠️ حالة غير صالحة' });
  }

  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: '🔍 الطلب غير موجود' });
    }

    res.json({ message: '✅ تم تحديث حالة الطلب', order: updatedOrder });
  } catch (error) {
    console.error('❌ خطأ في تحديث حالة الطلب:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء التحديث' });
  }
});
*/
// 🔄 تحديث حالة الطلب (يتطلب صلاحية Admin)
/*
router.put('/update-status/:orderId',  async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['قيد الانتظار', 'قيد الشحن', 'تم التسليم', 'ملغي'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: '⚠️ حالة غير صالحة' });
  }

  try {
    // احضر الطلب الحالي
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: '🔍 الطلب غير موجود' });
    }

    // ⚠️ إذا كان الطلب لم يكن تم تسليمه سابقًا والآن أصبح "تم التسليم"
    const shouldDecreaseStock = order.status !== "تم التسليم" && status === "تم التسليم";

    // تحديث الحالة
    order.status = status;
    await order.save();

    // 🔥 خصم الكميات عند التسليم فقط (مرة واحدة)
    if (shouldDecreaseStock) {
      for (let item of order.products) {
        const product = await Product.findById(item.productId); // productId من الطلب

        if (product) {
          product.quantity -= item.quantity;

          if (product.quantity < 0) product.quantity = 0; // حماية إضافية
          
          await product.save();
        }
      }
    }

    res.json({ message: '✅ تم تحديث حالة الطلب بنجاح', order });

  } catch (error) {
    console.error('❌ خطأ في تحديث حالة الطلب:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء التحديث' });
  }
});
*/
// 🔄 تحديث حالة الطلب (Admin فقط)
router.put('/update-status/:orderId', async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['قيد الانتظار', 'قيد الشحن', 'تم التسليم', 'ملغي'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: '⚠️ حالة غير صالحة' });
  }

  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: '🔍 الطلب غير موجود' });
    }

    const previousStatus = order.status;

    // 👇 هل نخصم الكمية؟
    const shouldDecreaseStock =
      previousStatus !== 'تم التسليم' && status === 'تم التسليم';

    // 👇 هل نرجع الكمية؟
    const shouldIncreaseStock =
      previousStatus === 'تم التسليم' && status !== 'تم التسليم';

    // 🔄 تحديث الحالة
    order.status = status;
    await order.save();

    // 📦 خصم الكمية عند التسليم لأول مرة
    if (shouldDecreaseStock) {
      for (let item of order.products) {
        const product = await Product.findById(item.productId);
        if (product) {
          product.quantity -= item.quantity;
          if (product.quantity < 0) product.quantity = 0;
          await product.save();
        }
      }
    }

    // 🔁 إعادة الكمية إذا عاد الطلب من "تم التسليم" إلى أي حالة أخرى
    if (shouldIncreaseStock) {
      for (let item of order.products) {
        const product = await Product.findById(item.productId);
        if (product) {
          product.quantity += item.quantity;
          await product.save();
        }
      }
    }

    res.json({ message: '✅ تم تحديث حالة الطلب بنجاح', order });

  } catch (error) {
    console.error('❌ خطأ في تحديث حالة الطلب:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء التحديث' });
  }
});



// ✅ جلب طلبات المستخدم
router.get('/my-orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .select('-__v'); // اختياري: إخفاء حقل __v

    res.json(orders);
  } catch (err) {
    console.error('❌ خطأ أثناء جلب الطلبات:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الطلبات' });
  }
});




// ✅ جلب جميع الطلبات للأدمين
router.get('/all', authAdminMiddleware, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'username email') // جلب اسم وإيميل المستخدم إذا موجود
      .populate('products.productId', 'name image description') // بيانات إضافية من Product
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error('❌ خطأ أثناء جلب جميع الطلبات:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الطلبات' });
  }
});


// ❌ حذف طلب
router.delete('/:orderId', authAdminMiddleware, async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.orderId);
    if (!deleted) {
      return res.status(404).json({ message: '🔍 الطلب غير موجود' });
    }
    res.json({ message: '✅ تم حذف الطلب' });
  } catch (error) {
    console.error('❌ خطأ أثناء حذف الطلب:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء حذف الطلب' });
  }
});




module.exports = router;









