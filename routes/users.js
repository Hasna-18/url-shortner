const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const Url = require('../models/urlModel');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

router.get('/signup', (req, res) => {
  res.render('signup', { errors: [] });
});

router.post('/signup', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('conform_password').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password confirmation does not match password');
    }
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('signup', { errors: errors.array() });
  }

  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('signup', { errors: [{ msg: 'User already exists' }] });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();

    res.redirect('/users/login');
  } catch (error) {
    res.render('signup', { errors: [{ msg: 'Server error' }] });
  }
});

router.get('/login', (req, res) => {
  res.render('login', { errors: [] });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.render('login', { errors: [{ msg: 'Invalid credentials' }] });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('login', { errors: [{ msg: 'Invalid credentials' }] });
    }

    req.session.user = user;
    res.redirect('/url-home');
  } catch (error) {
    res.render('login', { errors: [{ msg: 'Server error' }] });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/users/login');
});

router.get('/add-url', (req, res) => {
  if (!req.session.user) return res.redirect('/users/login');
  res.render('add-url', { error: null });
});

router.post('/add-url', async (req, res) => {
  if (!req.session.user) return res.redirect('/users/login');
  
  try {
    const userId = req.session.user._id;
    
    const urlCount = await Url.countDocuments({ user: userId });
    if (urlCount >= 5) {
      return res.render('add-url', { 
        error: 'You have reached the maximum limit of 5 URLs. Delete some to add more.' 
      });
    }

    const { title, originalUrl } = req.body;
    const url = new Url({
      user: userId,
      title,
      originalUrl
    });
    
    await url.save();
    res.redirect('/url-home');
  } catch (error) {
    res.render('add-url', { error: 'Error adding URL' });
  }
});

router.get('/edit-url/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/users/login');
  
  try {
    const url = await Url.findOne({ 
      _id: req.params.id, 
      user: req.session.user._id 
    });
    
    if (!url) {
      return res.redirect('/url-home');
    }
    
    res.render('edit-url', { url, error: null });
  } catch (error) {
    res.redirect('/url-home');
  }
});

router.post('/edit-url/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/users/login');
  
  try {
    const { title, originalUrl } = req.body;
    await Url.updateOne(
      { _id: req.params.id, user: req.session.user._id },
      { title, originalUrl }
    );
    
    res.redirect('/url-home');
  } catch (error) {
    res.render('edit-url', { 
      url: { _id: req.params.id, title: req.body.title, originalUrl: req.body.originalUrl }, 
      error: 'Error updating URL' 
    });
  }
});

router.post('/delete-url/:id', async (req, res) => {
  if (!req.session.user) return res.redirect('/users/login');
  
  try {
    await Url.deleteOne({ 
      _id: req.params.id, 
      user: req.session.user._id 
    });
    
    res.redirect('/url-home');
  } catch (error) {
    res.redirect('/url-home');
  }
});

module.exports = router;