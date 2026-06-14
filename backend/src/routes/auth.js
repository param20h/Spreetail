const express = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const validate = require('../middleware/validate');

const router = express.Router();

// Register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Must be a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  validate,
  async (req, res, next) => {
    const { name, email, password } = req.body;

    try {
      // Check if user exists
      const existingUser = await db('users').where({ email: email.toLowerCase() }).first();
      if (existingUser) {
        return res.status(400).json({
          error: true,
          code: 'USER_EXISTS',
          message: 'A user with this email already exists'
        });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const [newUser] = await db('users')
        .insert({
          name,
          email: email.toLowerCase(),
          password_hash: passwordHash
        })
        .returning(['id', 'name', 'email', 'is_guest', 'created_at']);

      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, name: newUser.name },
        process.env.JWT_SECRET || 'supersecretjwtkeythatisverysecureandlong',
        { expiresIn: '24h' }
      );

      res.status(201).json({
        token,
        user: newUser
      });
    } catch (err) {
      next(err);
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Must be a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  async (req, res, next) => {
    const { email, password } = req.body;

    try {
      const user = await db('users').where({ email: email.toLowerCase() }).first();
      if (!user) {
        return res.status(400).json({
          error: true,
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({
          error: true,
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        process.env.JWT_SECRET || 'supersecretjwtkeythatisverysecureandlong',
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          is_guest: user.is_guest,
          created_at: user.created_at
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
