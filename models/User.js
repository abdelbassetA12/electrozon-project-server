const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,

  subscriptionPlan: {
    type: String,
    enum: ['basic', 'pro', 'premium'],
    default: 'basic',
  },
  
  isSubscribed: {               // ✅ أضف هذا الحقل
    type: Boolean,
    default: false,
  },
  subscriptionExpiresAt: {
  type: Date,
  default: null,
},

subscriptionStartDate: {
  type: Date,
  default: null,
},


  isVerified: {
    type: Boolean,
    default: false,
  },

  emailVerificationToken: String,


  resetPasswordToken: String,
resetPasswordExpires: Date,


  // 🆕 الحقول الخاصة بالترويج بالعمولة
  referralCode: {
    type: String,
    unique: true,
    default: () => Math.random().toString(36).substring(2, 10), // مثال لكود تلقائي
  },

  referredBy: {
    type: String, // سيتم تخزين referralCode للمستخدم المُحيل
    default: null,
  },

  referrals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],

  commissionBalance: {
    type: Number,
    default: 0,
  }
});

module.exports = mongoose.model("User", userSchema);
