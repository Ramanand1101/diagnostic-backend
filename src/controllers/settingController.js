const createCrudController = require('./crudFactory');
const Setting = require('../models/Setting');
module.exports = createCrudController(Setting, { searchable: ['key'] });
