const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ==========================================
// GET ALL STORES
// ==========================================

const getStores = async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      where: {
        isOpen: true,
      },

      orderBy: {
        createdAt: 'desc',
      },

      include: {
        menuItems: {
          where: {
            isAvailable: true,
          },

          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    return res.json({
      success: true,
      count: stores.length,
      data: stores,
    });
  } catch (error) {
    console.error('GET STORES ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحميل المتاجر',
      error: error.message,
    });
  }
};


// ==========================================
// GET STORE BY ID
// ==========================================

const getStoreById = async (req, res) => {
  try {
    const storeId = Number(req.params.id);

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'رقم المتجر غير صحيح',
      });
    }

    const store = await prisma.store.findUnique({
      where: {
        id: storeId,
      },

      include: {
        menuItems: {
          orderBy: {
            createdAt: 'desc',
          },
        },

        vendor: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'المتجر غير موجود',
      });
    }

    return res.json({
      success: true,
      data: store,
    });
  } catch (error) {
    console.error('GET STORE ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحميل المتجر',
    });
  }
};


// ==========================================
// CREATE STORE
// ==========================================

const createStore = async (req, res) => {
  try {
    const {
      vendorId,
      name,
      description,
      latitude,
      longitude,
      image,
    } = req.body;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'vendorId مطلوب',
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'اسم المتجر مطلوب',
      });
    }

    const vendor = await prisma.user.findUnique({
      where: {
        id: Number(vendorId),
      },

      include: {
        role: true,
      },
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'البائع غير موجود',
      });
    }

    const store = await prisma.store.create({
      data: {
        vendorId: Number(vendorId),
        name: name.trim(),
        description: description || null,
        latitude: latitude
          ? Number(latitude)
          : null,
        longitude: longitude
          ? Number(longitude)
          : null,
        image: image || null,
        isOpen: true,
      },

      include: {
        menuItems: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء المتجر بنجاح',
      data: store,
    });
  } catch (error) {
    console.error('CREATE STORE ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء المتجر',
      error: error.message,
    });
  }
};


// ==========================================
// UPDATE STORE
// ==========================================

const updateStore = async (req, res) => {
  try {
    const storeId = Number(req.params.id);

    const {
      name,
      description,
      isOpen,
      latitude,
      longitude,
      image,
    } = req.body;

    const store = await prisma.store.findUnique({
      where: {
        id: storeId,
      },
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'المتجر غير موجود',
      });
    }

    const updatedStore = await prisma.store.update({
      where: {
        id: storeId,
      },

      data: {
        name:
          name !== undefined
            ? name.trim()
            : undefined,

        description:
          description !== undefined
            ? description
            : undefined,

        isOpen:
          isOpen !== undefined
            ? Boolean(isOpen)
            : undefined,

        latitude:
          latitude !== undefined
            ? Number(latitude)
            : undefined,

        longitude:
          longitude !== undefined
            ? Number(longitude)
            : undefined,

        image:
          image !== undefined
            ? image
            : undefined,
      },
    });

    return res.json({
      success: true,
      message: 'تم تحديث المتجر',
      data: updatedStore,
    });
  } catch (error) {
    console.error('UPDATE STORE ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث المتجر',
    });
  }
};


// ==========================================
// DELETE STORE
// ==========================================

const deleteStore = async (req, res) => {
  try {
    const storeId = Number(req.params.id);

    const store = await prisma.store.findUnique({
      where: {
        id: storeId,
      },
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'المتجر غير موجود',
      });
    }

    await prisma.store.delete({
      where: {
        id: storeId,
      },
    });

    return res.json({
      success: true,
      message: 'تم حذف المتجر',
    });
  } catch (error) {
    console.error('DELETE STORE ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف المتجر',
    });
  }
};


module.exports = {
  getStores,
  getStoreById,
  createStore,
  updateStore,
  deleteStore,
};