const express = require('express');
const User = require('../models/users.model');
const router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { jwtSecretKey } = process.env;

router.post('/login', async (req, res) => {
  try {
    const { username } = req.body;
    const userPassword = req.body.password;
    const result = await User.findOne({
      $or: [{ email: username }, { username: username }]
    });
    if (Object.keys(result).length) {
      const { _id, email, username, mobile, password } = result;
      const checkPassword = await bcrypt.compare(userPassword, password);

      if (checkPassword) {
        const tokenData = {
          userId: _id,
          email: email,
          mobile: mobile,
          username: username
        };
        const token = jwt.sign(
          {
            data: tokenData
          },
          jwtSecretKey,
          { expiresIn: '2h' }
        );
        res.status(200).json({
          message: 'Login Successfull',
          data: { token: token }
        });
      } else {
        res.status(400).json({ message: 'Invalid credentials', data: '' });
      }
    }
  } catch (err) {
    res.status(400).json(err);
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, email, mobile, password, cpassword } = req.body;

    if (password.trim() === cpassword.trim()) {
      const hashPassword = bcrypt.hashSync(password, saltRounds);
      const userData = {
        username: username,
        email: email,
        mobile: mobile,
        password: hashPassword,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      const newUser = new User(userData);
      await newUser.save();
      res.status(200).json({ message: 'Register Successfull' });
    } else {
      res.status(400).json({
        message: 'Password, Confirm Password not matched.'
      });
    }
  } catch (err) {
    res.status(400).json(err);
  }
});

module.exports = router;
