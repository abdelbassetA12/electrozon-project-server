const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const authAdmin = require('../middleware/authAdminMiddleware');

// إنشاء فئة (يمكن أن تكون فرعية بتحديد parent)
router.post('/add', authAdmin, async (req, res) => {
  try {
    const { name, parent } = req.body;
    const cat = new Category({
      name,
      parent: parent || null
    });
    await cat.save();
    res.json({ message: 'تم إضافة الفئة', category: cat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'خطأ' });
  }
});

// جلب شجرة الفئات كاملة (nested)
router.get('/tree', async (req, res) => {
  try {
    const cats = await Category.find().sort({ name: 1 }).lean();
    // بناء شجرة في الذاكرة
    const map = {};
    cats.forEach(c => { c.children = []; map[c._id] = c; });
    const roots = [];
    cats.forEach(c => {
      if (c.parent) {
        const parent = map[c.parent];
        if (parent) parent.children.push(c);
      } else {
        roots.push(c);
      }
    });
    res.json(roots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'خطأ في جلب شجرة الفئات' });
  }
});

// جلب فئة واحدة مع سلسلة الأجداد (breadcrumbs) و/أو الأطفال
router.get('/:id', async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id).lean();
    if (!cat) return res.status(404).json({ message: 'غير موجود' });
    // جلب الأطفال المباشرين
    const children = await Category.find({ parent: cat._id }).lean();
    // جلب بيانات الأجداد (path)
    const ancestors = await Category.find({ _id: { $in: cat.path } }).lean();
    res.json({ category: cat, ancestors, children });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'خطأ' });
  }
});

// تحديث فئة
router.put('/:id', authAdmin, async (req, res) => {
  try {
    const { name, parent } = req.body;
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: 'غير موجود' });

    // ضع parent و name ثم احفظ (pre validate سيبنى path ويمنع الحلقات)
    cat.name = name ?? cat.name;
    cat.parent = typeof parent === 'undefined' ? cat.parent : parent || null;
    await cat.save();

    // بعد التغيير يجب تحديث path لجميع الأبناء (يمكن عمل وظيفة لإعادة بناء)
    // سنعيد بناء paths للأطفال recursively
    await rebuildPathsForDescendants(cat._id);

    res.json({ message: 'تم التحديث', category: cat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'خطأ' });
  }
});

// حذف فئة
router.delete('/:id', authAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    // خياران شائعان:
    // 1) منع الحذف إذا توجد فئات فرعية أو منتجات (آمن)
    // 2) عند الحذف إعادة تعيين آباء الأطفال إلى parent الحذف (splicing)
    const childrenCount = await Category.countDocuments({ parent: id });
    if (childrenCount > 0) {
      return res.status(400).json({ message: 'لا يمكن حذف فئة تحتوي على فئات فرعية. أنقل أو احذف الفرعية أولاً.' });
    }
    // تفحص المنتجات المرتبطة بهذه الفئة قبل الحذف (يوصى)
    // await Product.updateMany({ category: id }, { $unset: { category: "" } }); // أو إعادة تعيين لفئة افتراضية
    await Category.findByIdAndDelete(id);
    res.json({ message: 'تم الحذف' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'خطأ' });
  }
});

// --- Helpers ---
async function rebuildPathsForDescendants(parentId) {
  const parent = await Category.findById(parentId);
  if (!parent) return;
  const children = await Category.find({ parent: parentId });
  for (const child of children) {
    child.path = [...parent.path, parent._id];
    await child.save();
    // تكرار للأسفل
    await rebuildPathsForDescendants(child._id);
  }
}

module.exports = router;
