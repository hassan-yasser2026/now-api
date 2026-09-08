const express = require('express');

const router = express.Router();

const {
  register,
  login,
  me,
  updateProfile,
  deleteAccount,
} = require('../controllers/auth.controller');

const {
  authenticate,
} = require('../middleware/auth.middleware');

router.post('/register', register);

router.post('/login', login);

router.get('/me', authenticate, me);
router.patch('/profile', authenticate, updateProfile);
router.delete('/profile', authenticate, deleteAccount);

module.exports = router;