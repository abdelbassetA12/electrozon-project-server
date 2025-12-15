
const express = require('express');

const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const AdminAuthRoutes = require('./routes/adminAuthRoutes');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const categoriesRouter = require('./routes/categories');
const contactRoutes = require('./routes/contactRoutes');










const app = express();
// بورت السيرفر
const PORT = process.env.PORT || 5000; // إذا لم يكن موجود في .env يستخدم 5000 كافتراضي
app.use(cors());
app.use(express.json());


// ⬇️ لعرض الصور المرفوعة بشكل عام
app.use('/uploads', express.static('uploads'));
// الاتصال بقاعدة البيانات
mongoose.connect('mongodb+srv://abdelbassetelhajiri02:abdelbassetA11@cluster0.rdkbbev.mongodb.net/models?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error(' MongoDB error:', err));

// المسارات
app.use('/api/auth', authRoutes);
app.use('/api/authadmin', AdminAuthRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/categories', categoriesRouter);







app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});
