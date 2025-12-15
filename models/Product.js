const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },

  price: { type: Number, required: true }, // السعر الأصلي
 quantity: { type: Number, required: true }, 
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: true, 
  },

  cost: { type: Number, required: true }, // تكلفة المنتج عليك

  description: { type: String },

  image: { type: String },

  // 🔹 حقل التخفيض
  discount: {
    isActive: { type: Boolean, default: false },
    type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    value: { type: Number, default: 0 }, // إذا كان نسبة: 20 = 20%
    expiryDate: { type: Date },
  },

  // 🔹 سعر البيع النهائي بعد التخفيض
  finalPrice: { type: Number },







    // 🔹 خيارات المنتج المرنة
  options: [
    {
      name: { type: String, required: true }, // مثال: "المقاس" أو "اللون"
      type: { type: String, enum: ['text', 'number', 'color', 'image'], default: 'text' },
      values: [
        {
          value: { type: String, required: true }, // مثال: "S", "أحمر", "128GB"
          image: { type: String }, // اختياري إذا كان اللون أو صورة
          priceModifier: { type: Number, default: 0 }, // زيادة أو نقصان على السعر الأساسي
          quantity: { type: Number, default: 0 }, // كمية كل نسخة
        },
      ],
    },
  ],



   content: [
    {
      type: {
        type: String,
        enum: ["image", "video", "text", "link"], // أنواع المحتوى
        required: false
      },
      url: String,       // رابط صورة أو فيديو
      filePath: String,  // في حال رفع ملف (صورة أو فيديو)
      title: String,     // في حال كان النص يحتوي عنوان
      text: String       // النصوص
    }
  ],  











}, { timestamps: true });

// 🔹 تحديث finalPrice تلقائيًا عند الحفظ أو التعديل
productSchema.pre('save', function (next) {
  if (this.discount && this.discount.isActive) {
    if (this.discount.type === 'percentage') {
      this.finalPrice = this.price - (this.price * this.discount.value / 100);
    } else if (this.discount.type === 'fixed') {
      this.finalPrice = this.price - this.discount.value;
    }
    if (this.finalPrice < 0) this.finalPrice = 0;
  } else {
    this.finalPrice = this.price;
  }

  next();
});

module.exports = mongoose.model('Product', productSchema);
