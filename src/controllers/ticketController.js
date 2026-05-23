const createCrudController = require('./crudFactory');
const Ticket = require('../models/Ticket');
module.exports = createCrudController(Ticket, { searchable: ['subject', 'message', 'category'] });
