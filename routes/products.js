






const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const multer = require('multer');
const path = require('path');
const Category = require('../models/Category');

const authAdminMiddleware = require('../middleware/authAdminMiddleware');
const getProductStats = require('../utils/productStats');

// إعداد Cloudinary
const { v2: cloudinary } = require("cloudinary");
const fs = require("fs");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// إعداد مجلد التخزين
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // مجلد التخزين
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });


// 🔹 إضافة منتج جديد
router.post(
  "/add",
  authAdminMiddleware,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "files", maxCount: 20 },
      { name: "optionImages", maxCount: 50 },
  ]),
  async (req, res) => {
    try {
      const {
        name,
        price,
        category,
        cost,
        description,
        quantity,
        discountType,
        discountValue,
        discountIsActive,
        discountExpiryDate,
        options,
        content,
      } = req.body;

      const parsedOptions = options ? JSON.parse(options) : [];
      let parsedContent = content ? JSON.parse(content) : [];

      // صورة المنتج الأساسية
      let mainImage = null;
      if (req.files["image"] && req.files["image"][0]) {
        const imgFile = req.files["image"][0];
        const uploadResult = await cloudinary.uploader.upload(imgFile.path, {
          folder: "product_main",
        });
        fs.unlinkSync(imgFile.path);
        mainImage = uploadResult.secure_url;
      }

      // ملفات المحتوى
      const contentFiles = req.files["files"] || [];
      let fileIndex = 0;

      // رفع كل ملفات content بشكل متوازي
      const finalContent = await Promise.all(
        parsedContent.map(async (block) => {
          if (
            (block.type === "image" || block.type === "video") &&
            contentFiles[fileIndex]
          ) {
            const file = contentFiles[fileIndex];
            fileIndex++;

            const uploadResult = await cloudinary.uploader.upload(file.path, {
              folder: "product_content",
              resource_type: block.type === "video" ? "video" : "image",
            });

            fs.unlinkSync(file.path);

            return {
              ...block,
              filePath: uploadResult.secure_url,
            };
          } else {
            return block;
          }
        })
      );






            // -------------------------
      // رفع صور الخيارات (Options)
      // -------------------------
      
      const optionImages = req.files["optionImages"] || [];
      let optionIndexFile = 0;
      
      for (let opt of parsedOptions) {
        for (let val of opt.values) {
          // تحقق إذا val.image هو ملف من نوع File
          if (val.image && optionImages[optionIndexFile]) {
            const file = optionImages[optionIndexFile];
            optionIndexFile++;
      
            const uploadResult = await cloudinary.uploader.upload(file.path, {
              folder: "product_option_images",
            });
      
            fs.unlinkSync(file.path);
            val.image = uploadResult.secure_url;
          }
        }
      }

      // إنشاء المنتج
      const newProduct = new Product({
        name,
        price,
        category,
        cost,
        description,
        quantity,
        image: mainImage,
        discount: {
          isActive: discountIsActive || false,
          type: discountType || "percentage",
          value: discountValue || 0,
          expiryDate: discountExpiryDate || null,
        },
        options: parsedOptions,
        content: finalContent,
      });

      await newProduct.save();

      res.json({
        message: "✅ تم إضافة المنتج بنجاح مع رفع كل الملفات",
        product: newProduct,
      });
    } catch (error) {
      console.error("❌ خطأ في إضافة المنتج:", error);
      res.status(500).json({ message: "❌ خطأ أثناء إضافة المنتج" });
    }
  }
);


/*
router.post('/add', authAdminMiddleware, upload.single('image'), async (req, res) => {

  const { name, price, category, cost, description, quantity, discountType, discountValue, discountIsActive, discountExpiryDate, options , content } = req.body;
 const parsedOptions = options ? JSON.parse(options) : [];
  let parsedContent = content ? JSON.parse(content) : [];

  const image = req.file ? req.file.filename : null;

  try {
    const newProduct = new Product({
      name,
      price,
      category,
      cost,
      description,
      quantity,
      image,
      discount: {
        isActive: discountIsActive || false,
        type: discountType || 'percentage',
        value: discountValue || 0,
        expiryDate: discountExpiryDate || null,
      },
      options: parsedOptions,
      content: parsedContent,

    });

    await newProduct.save();
    res.json({ message: '✅ تم إضافة المنتج بنجاح', product: newProduct });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ خطأ في إضافة المنتج' });
  }
});

*/


// 🔹 جلب كل المنتجات
router.get('/all', async (req, res) => {
  try {
    const products = await Product.find()
      .populate('category', 'name slug'); // ✅ اجلب الاسم والـ slug للفئة
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ خطأ في جلب المنتجات' });
  }
});



// 🔹 جلب المنتجات التي عليها تخفيض نشط
router.get('/offers/active', async (req, res) => {
  try {
    const products = await Product.find({ 'discount.isActive': true });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ خطأ في جلب العروض' });
  }
});





// 🔹 تعديل منتج
router.put(
  "/:id",
  authAdminMiddleware,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "files", maxCount: 20 },
  ]),
  async (req, res) => {
    try {
      const {
        name,
        price,
        category,
        cost,
        description,
        quantity,
        discountType,
        discountValue,
        discountIsActive,
        discountExpiryDate,
        options,
        content
      } = req.body;

      const parsedOptions = options ? JSON.parse(options) : [];
      let parsedContent = content ? JSON.parse(content) : [];

      // تحديث الصورة الرئيسية إن وجدت
      let mainImage = null;
      if (req.files["image"] && req.files["image"][0]) {
        const imgFile = req.files["image"][0];
        const uploadResult = await cloudinary.uploader.upload(imgFile.path, {
          folder: "product_main",
        });
        fs.unlinkSync(imgFile.path);
        mainImage = uploadResult.secure_url;
      }

      // تحديث محتوى الملفات...
      
      const contentFiles = req.files["files"] || [];
      let fileIndex = 0;

      const finalContent = await Promise.all(
        parsedContent.map(async (block) => {
          if (
            (block.type === "image" || block.type === "video") &&
            contentFiles[fileIndex]
          ) {
            const file = contentFiles[fileIndex];
            fileIndex++;

            const uploadResult = await cloudinary.uploader.upload(file.path, {
              folder: "product_content",
              resource_type: block.type === "video" ? "video" : "image",
            });

            fs.unlinkSync(file.path);

            return {
              ...block,
              filePath: uploadResult.secure_url,
            };
          }
          return block;
        })
      );
      // مضاف لحل مشكلة التخفيض
  let finalPrice = price; // السعر الافتراضي

if (discountIsActive) {
  if (discountType === 'percentage') {
    finalPrice = price - (price * discountValue / 100);
  } else if (discountType === 'fixed') {
    finalPrice = price - discountValue;
  }
  if (finalPrice < 0) finalPrice = 0;
}


      const updateData = {
        name,
        price,
        category,
        cost,
        description,
        quantity,
        finalPrice, // ✅ مهم جدا
        discount: {
          isActive: discountIsActive,
          type: discountType,
          value: discountValue,
          expiryDate: discountExpiryDate,
        },
        options: parsedOptions,
        content: finalContent,
      };

      if (mainImage) updateData.image = mainImage;

      const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

      res.json({ message: "تم تحديث المنتج بنجاح", product: updatedProduct });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "خطأ أثناء التعديل" });
    }
  }
);
/*
router.put('/:id', authAdminMiddleware, upload.single('image'), async (req, res) => {
  const { name, price, category, cost, description,quantity, discountType, discountValue, discountIsActive, discountExpiryDate } = req.body;

  try {
    const updatedFields = { name, price, category, cost, description, quantity };

    // 🔹 تحديث بيانات التخفيض
    updatedFields.discount = {
      isActive: discountIsActive || false,
      type: discountType || 'percentage',
      value: discountValue || 0,
      expiryDate: discountExpiryDate || null,
    };

    // إذا أُرسلت صورة جديدة ✅
    if (req.file) {
      updatedFields.image = req.file.filename;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updatedFields,
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: '❌ المنتج غير موجود' });
    }

    // 🔹 حفظ finalPrice المعدل
    await updatedProduct.save();

    res.json({ message: '✅ تم تعديل المنتج بنجاح', product: updatedProduct });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ خطأ في تعديل المنتج' });
  }
});
*/







// 🔹 حذف منتج
router.delete('/:id', authAdminMiddleware, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: '✅ تم حذف المنتج بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ خطأ في حذف المنتج' });
  }
});



// 🔹 جلب كل الفئات بدون تكرار
router.get('/categories/all', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ خطأ في جلب الفئات' });
  }
});


// ✅ جلب المنتجات حسب slug الفئة (يدعم الشجرة لاحقًا)
router.get('/by-category/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;

    // ابحث عن الفئة المطلوبة
    const category = await Category.findOne({ slug });
    if (!category) {
      return res.status(404).json({ message: 'الفئة غير موجودة' });
    }

    // اجلب كل الفئات الفرعية أيضًا (من الشجرة)
    const subCats = await Category.find({ path: category._id }).select('_id');
    const allCatIds = [category._id, ...subCats.map(c => c._id)];

    // الآن اجلب المنتجات التي تقع ضمن هذه الفئات
    const products = await Product.find({ category: { $in: allCatIds } })
      .populate('category', 'name slug');

    res.json(products);
  } catch (err) {
    console.error('❌ خطأ في جلب منتجات الفئة:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب المنتجات' });
  }
});

// 🔹 جلب المنتجات حسب الفئة (category)
/*
router.get('/category/:categoryName', async (req, res) => {
  const { categoryName } = req.params;
  try {
    const products = await Product.find({ category: categoryName });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '❌ خطأ في جلب منتجات الفئة' });
  }
});
*/


router.get("/stats", authAdminMiddleware, async (req, res) => {
  const result = await getProductStats();

  console.log("📊 Product Stats:");
  console.log(result);

  res.json(result);  // الآن يعيد stats + الإجماليات
});

/*
router.get('/stats', authAdminMiddleware, async (req, res) => {
  const stats = await getProductStats();
    console.log("📊 Product Stats:");
  console.log(stats); // 👈 اطبع النتيجة في الكونسول
  res.json(stats);
 

});
*/


router.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);
  res.json(product);
});






module.exports = router;
