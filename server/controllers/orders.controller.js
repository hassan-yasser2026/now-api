const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createOrder(req, res) {
  try {
    const customerId = req.user.id;
    const { storeId, items, address, scheduledAt } = req.body;

    if (!storeId || !Array.isArray(items) || items.length === 0 || !address) {
      return res.status(400).json({ success: false, message: 'بيانات الطلب غير مكتملة' });
    }

    // التحقق من المتجر والمنتجات
    const store = await prisma.store.findFirst({ where: { id: Number(storeId), isOpen: true } });
    if (!store) return res.status(404).json({ success: false, message: 'المتجر غير موجود أو مغلق' });

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: items.map(i => Number(i.menuItemId)) }, storeId: Number(storeId), isAvailable: true }
    });

    if (menuItems.length !== items.length) {
      return res.status(400).json({ success: false, message: 'يوجد منتج غير متاح أو غير تابع للمتجر' });
    }

    let totalPrice = 0;
    const orderItemsData = items.map(item => {
      const menuItem = menuItems.find(p => p.id === Number(item.menuItemId));
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('INVALID_QUANTITY');
      totalPrice += Number(menuItem.price) * quantity;
      return { menuItemId: menuItem.id, quantity, priceAtOrder: menuItem.price };
    });

    // استخدام Transaction لضمان سلامة البيانات
    const order = await prisma.$transaction(async (tx) => {
      return await tx.order.create({
        data: {
          customerId,
          storeId: Number(storeId),
          totalPrice,
          address,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
          items: { create: orderItemsData },
          payment: { create: { amount: totalPrice, currency: 'EGP', status: 'PENDING' } }
        },
        include: { items: { include: { menuItem: true } }, store: true, payment: true }
      });
    });

    return res.status(201).json({ success: true, message: 'تم إنشاء الطلب بنجاح', data: order });
  } catch (error) {
    if (error.message === 'INVALID_QUANTITY') return res.status(400).json({ success: false, message: 'الكمية غير صحيحة' });
    console.error('CREATE ORDER ERROR:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء إنشاء الطلب' });
  }
}

async function getCustomerOrders(req, res) {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: req.user.id },
      include: { store: { select: { id: true, name: true, image: true } }, items: { include: { menuItem: true } }, payment: true },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحميل الطلبات' });
  }
}

async function getOrderById(req, res) {
  try {
    const id = Number(req.params.id);
    const order = await prisma.order.findFirst({
      where: { id, OR: [{ customerId: req.user.id }, { deliveryId: req.user.id }, { store: { vendorId: req.user.id } }] },
      include: { store: true, customer: true, delivery: true, items: { include: { menuItem: true } }, payment: true }
    });
    if (!order) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    return res.json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحميل الطلب' });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    const existingOrder = await prisma.order.findUnique({ where: { id }, include: { store: true } });
    
    if (!existingOrder) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

    // التحقق من الصلاحيات
    const role = req.user.role;
    const isAuthorized = (role === 'ADMIN') || 
                         (role === 'VENDOR' && existingOrder.store.vendorId === req.user.id) ||
                         (role === 'DELIVERY' && existingOrder.deliveryId === req.user.id);

    if (!isAuthorized) return res.status(403).json({ success: false, message: 'ليس لديك صلاحية' });

    const updatedOrder = await prisma.order.update({ where: { id }, data: { status } });
    return res.json({ success: true, message: 'تم التحديث', data: updatedOrder });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'خطأ أثناء التحديث' });
  }
}

async function cancelOrder(req, res) {
  try {
    const id = Number(req.params.id);
    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    if (order.customerId !== req.user.id) return res.status(403).json({ success: false, message: 'لا يمكنك إلغاء طلب ليس لك' });
    if (['PICKED_UP', 'DELIVERED'].includes(order.status)) return res.status(400).json({ success: false, message: 'لا يمكن إلغاء الطلب بعد استلامه' });

    const updatedOrder = await prisma.order.update({ where: { id }, data: { status: 'CANCELLED' } });
    return res.json({ success: true, message: 'تم إلغاء الطلب بنجاح', data: updatedOrder });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'خطأ أثناء الإلغاء' });
  }
}

module.exports = { createOrder, getCustomerOrders, getOrderById, updateOrderStatus, cancelOrder };