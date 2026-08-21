const express = require('express');

const router = express.Router();

const {
  getStores,
  getStoreById,
  createStore,
  updateStore,
  deleteStore,
} = require('../controllers/stores.controller');


// جميع المتاجر
router.get('/', getStores);


// متجر واحد
router.get('/:id', getStoreById);


// إنشاء متجر
router.post('/', createStore);


// تعديل متجر
router.put('/:id', updateStore);


// حذف متجر
router.delete('/:id', deleteStore);


module.exports = router;