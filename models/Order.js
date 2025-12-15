const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true },
  city: { type: String, required: true },
  address: String,
  email: String,
  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: String,
      price: Number,
      quantity: Number,

      selectedOptions: [
        {
          name: String,         // اسم الخيار (مثل: اللون)
          value: String,        // القيمة المختارة (مثل: أحمر)
          priceModifier: Number // أي إضافة على السعر من هذا الخيار
        }
      ]




    }
  ],
  totalPrice: Number,


  // ✅ الحالة الجديدة للطلب
  status: {
    type: String,
    enum: ['قيد الانتظار', 'قيد الشحن', 'تم التسليم', 'ملغي'],
    default: 'قيد الانتظار',
  },


  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);
