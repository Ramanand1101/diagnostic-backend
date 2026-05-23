const createCrudController = require('./crudFactory');
const Coupon = require('../models/Coupon');
module.exports = createCrudController(Coupon, { searchable: ['code'] });
