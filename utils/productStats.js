const Product = require('../models/Product');
const Order = require('../models/Order');
/*
async function getProductStats() {
  try {
    const products = await Product.find();

    const stats = [];
    for (const product of products) {
  const orders = await Order.find({ 'products.productId': product._id });
  let soldQuantity = 0;
  let totalSales = 0;
  let totalProfit = 0;

  for (const order of orders) {
    if (!order.products) continue;
    for (const item of order.products) {
      if (!item.productId) continue;
      if (item.productId.toString() === product._id.toString() && order.status === 'تم التسليم') {
        soldQuantity += item.quantity || 0;


        // احسب مجموع الموديفايرز من الخيارات
const modifiersTotal = (item.selectedOptions || [])
  .reduce((sum, opt) => sum + (opt.priceModifier || 0), 0);

// السعر الحقيقي الذي بيع به المنتج
const finalSoldPrice = (item.price || 0) + modifiersTotal;

// أضف إجمالي المبيعات
totalSales += finalSoldPrice * (item.quantity || 0);

// أضف الربح الحقيقي
totalProfit += (finalSoldPrice - (product.cost || 0)) * (item.quantity || 0);

      
      }
    }
  }

  stats.push({
    productId: product._id,
    name: product.name || 'بدون اسم',
    image: product.image ? `/uploads/${product.image}` : null,
    availableQuantity: product.quantity || 0,
    soldQuantity,
    remainingQuantity: product.quantity || 0,
    totalSales,
    totalProfit,
    price: product.price,
    cost: product.cost,
  });
}


    return stats;
  } catch (err) {
    console.error('❌ خطأ في حساب الإحصائيات:', err);
    return [];
  }
}
  */


async function getProductStats() {
  try {
    const products = await Product.find();

    const stats = [];
    let totalSalesAll = 0;   // ⭐ إجمالي المبيعات
    let totalProfitAll = 0;  // ⭐ إجمالي الربح

    for (const product of products) {
      const orders = await Order.find({ 'products.productId': product._id });

      let soldQuantity = 0;
      let totalSales = 0;
      let totalProfit = 0;

      for (const order of orders) {
        if (!order.products) continue;

        for (const item of order.products) {
          if (!item.productId) continue;

          if (
            item.productId.toString() === product._id.toString() &&
            order.status === "تم التسليم"
          ) {
            soldQuantity += item.quantity || 0;

            const modifiersTotal = (item.selectedOptions || [])
              .reduce((sum, opt) => sum + (opt.priceModifier || 0), 0);

            const finalSoldPrice = (item.price || 0) + modifiersTotal;

            totalSales += finalSoldPrice * (item.quantity || 0);

            totalProfit +=
              (finalSoldPrice - (product.cost || 0)) * (item.quantity || 0);
          }
        }
      }

      // ⭐ اجمع الإجمالي العام هنا
      totalSalesAll += totalSales;
      totalProfitAll += totalProfit;

      stats.push({
        productId: product._id,
        name: product.name || "بدون اسم",
        image: product.image ? `/uploads/${product.image}` : null,
        availableQuantity: product.quantity || 0,
        soldQuantity,
        remainingQuantity: product.quantity || 0,
        totalSales,
        totalProfit,
        price: product.price,
        cost: product.cost,
      });
    }

    // ⭐ إرجاع الإجماليات مع الإحصائيات
    return {
      stats,
      totalSalesAll,
      totalProfitAll
    };

  } catch (err) {
    console.error("❌ خطأ في حساب الإحصائيات:", err);
    return {
      stats: [],
      totalSalesAll: 0,
      totalProfitAll: 0
    };
  }
}



module.exports = getProductStats;
