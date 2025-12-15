// routes/cartRoutes.js
const express = require('express');
const Cart = require('../models/Cart');
const auth = require('../middleware/authMiddleware');
const router = express.Router();

// 🔸 Get user cart
router.get('/', auth, async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id }).populate('items.productId');
  res.json(cart || { items: [] });
});

// 🔸 Add item to cart
router.post('/add', auth, async (req, res) => {
  const { productId, quantity } = req.body;
  let cart = await Cart.findOne({ user: req.user.id });

  if (!cart) cart = new Cart({ user: req.user.id, items: [] });

  const itemIndex = cart.items.findIndex(i => i.productId.toString() === productId);

  if (itemIndex > -1) {
    cart.items[itemIndex].quantity += quantity;
  } else {
    cart.items.push({ productId, quantity });
  }

  await cart.save();
  res.json(cart);
});




// 🔸 Remove item from cart
router.delete('/remove/:productId', auth, async (req, res) => {
  const { productId } = req.params;
  let cart = await Cart.findOne({ user: req.user.id });

  if (!cart) return res.status(404).json({ message: 'Cart not found' });

  cart.items = cart.items.filter(item => item.productId.toString() !== productId);
  await cart.save();

  res.json({ message: 'Item removed successfully', cart });
});




// 🔸 Update item quantity
router.put('/update/:productId', auth, async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  let cart = await Cart.findOne({ user: req.user.id });
  if (!cart) return res.status(404).json({ message: 'Cart not found' });

  const item = cart.items.find(i => i.productId.toString() === productId);
  if (!item) return res.status(404).json({ message: 'Item not found' });

  item.quantity = quantity;
  await cart.save();

  res.json({ message: 'Quantity updated successfully', cart });
});


// 🔸 Clear user cart
router.delete('/clear', auth, async (req, res) => {
  try {
    await Cart.deleteMany({ user: req.user.id });
    res.json({ message: '✅ تم مسح السلة من قاعدة البيانات' });
  } catch (error) {
    console.error('❌ خطأ أثناء مسح السلة:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء مسح السلة' });
  }
});




module.exports = router;
