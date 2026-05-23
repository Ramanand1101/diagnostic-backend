const createCrudController = require('./crudFactory');
const Category = require('../models/Category');
module.exports = createCrudController(Category, { searchable: ['name', 'slug'] });
