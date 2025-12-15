const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  // path = array of ancestor ids (from root -> parent). مفيد لبناء الشجرة والبحث
  path: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  // you can add extra fields (description, image, order, isActive, etc.)
}, { timestamps: true });

// توليد slug و path قبل الحفظ
categorySchema.pre('validate', async function(next) {
  if (!this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }

  // ensure slug uniqueness (append random suffix if needed)
  // إذا أردت تحقق متقدم يمكنك تحسينه؛ هذا حل بسيط:
  const existing = await mongoose.models.Category.findOne({ slug: this.slug, _id: { $ne: this._id } });
  if (existing) {
    this.slug = `${this.slug}-${Date.now().toString().slice(-4)}`;
  }

  // build path: copy parent's path + parent
  if (this.parent) {
    const parentCat = await mongoose.models.Category.findById(this.parent).select('path');
    if (!parentCat) {
      return next(new Error('Parent category not found'));
    }
    // منع الحلقات: تأكد أن هذا._id ليس داخل path الأب
    if (parentCat.path && parentCat.path.some(id => id.equals(this._id))) {
      return next(new Error('Cycle detected in category parent assignment'));
    }
    this.path = [...(parentCat.path || []), parentCat._id];
  } else {
    this.path = [];
  }

  next();
});

module.exports = mongoose.model('Category', categorySchema);
