const slugify = require('slugify');

module.exports = function makeSlug(value) {
  return slugify(String(value || ''), {
    lower: true,
    strict: true,
    trim: true
  });
};
