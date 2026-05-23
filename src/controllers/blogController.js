const createCrudController = require('./crudFactory');
const Blog = require('../models/Blog');
module.exports = createCrudController(Blog, { searchable: ['title', 'excerpt', 'tags'] });
