const express = require('express');
const router = express.Router();
const Url = require('../models/urlModel');

router.get('/', (req, res) => {
  res.redirect('/users/login');
});

router.get('/url-home', async (req, res) => {
  if (!req.session.user) return res.redirect('/users/login');
  
  const userId = req.session.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = 3;
  const search = req.query.search || '';

  try {
    const query = {
      user: userId,
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { originalUrl: { $regex: search, $options: 'i' } },
        { shortUrl: { $regex: search, $options: 'i' } }
      ]
    };

    const total = await Url.countDocuments(query);
    const urls = await Url.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.render('url-home', {
      user: req.session.user,
      urls,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
      search,
      error: null
    });
  } catch (error) {
    res.render('url-home', {
      user: req.session.user,
      urls: [],
      currentPage: 1,
      totalPages: 1,
      total: 0,
      search,
      error: 'Error loading URLs'
    });
  }
});

router.get('/:shortCode', async (req, res) => {
  try {
    const code = req.params.shortCode;
    const urlEntry = await Url.findOne({ shortUrl: code });
    
    if (!urlEntry) {
      return res.status(404).send('Short URL not found');
    }

    res.redirect(urlEntry.originalUrl);
  } catch (error) {
    res.status(500).send('Server error');
  }
});

module.exports = router;