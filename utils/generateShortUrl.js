const crypto = require('crypto');

function generateShortUrl() {
  return crypto.randomBytes(3).toString('hex'); // 6-char short URL
}

module.exports = generateShortUrl;
