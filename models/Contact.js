const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "⚠️ الاسم مطلوب"],
  },
  email: {
    type: String,
    required: [true, "⚠️ البريد الإلكتروني مطلوب"],
  },
  inquiry: String, // للاستفسارات
  feedback: String, // للملاحظات
  rating: {       // إضافة تقييم النجوم
    type: Number,
    min: 1,
    max: 5,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Contact", contactSchema);







