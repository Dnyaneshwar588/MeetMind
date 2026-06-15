const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);

// Route to verify token validity and return user details
router.get('/me', verifyToken, (req, res) => {
  res.status(200).json({ user: req.user });
});

module.exports = router;
