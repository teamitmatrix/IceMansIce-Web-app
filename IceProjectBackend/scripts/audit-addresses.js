#!/usr/bin/env node
/*
  Audit script: reports documents missing address.country or using legacy zip fields.
  Usage: node scripts/audit-addresses.js [mongo_uri]
  Defaults to mongodb://localhost:27017/sales_system
*/
const mongoose = require('mongoose');
db_url = process.env.MONGODB_URI
async function main() {
  const uri = process.argv[2] || db_url;
  await mongoose.connect(uri);
  const User = require('../src/models/User');
  const Customer = require('../src/models/Customer');
  const SalesOrder = require('../src/models/SalesOrder');
  const Warehouse = require('../src/models/Warehouse');

  const results = {};

  results.usersMissingCountry = await User.countDocuments({ $or: [ { 'address': { $exists: false } }, { 'address.country': { $in: [null, '', undefined] } } ] });
  results.customersMissingCountry = await Customer.countDocuments({ $or: [ { 'address': { $exists: false } }, { 'address.country': { $in: [null, '', undefined] } } ] });
  results.ordersMissingDeliveryCountry = await SalesOrder.countDocuments({ $and: [ { deliveryAddress: { $exists: true } }, { 'deliveryAddress.country': { $in: [null, '', undefined] } } ] });
  results.warehousesMissingCountry = await Warehouse.countDocuments({ $or: [ { 'address': { $exists: false } }, { 'address.country': { $in: [null, '', undefined] } } ] });

  const sampleUsers = await User.find({ 'address.country': { $in: [null, '', undefined] } }).limit(5);
  const sampleCustomers = await Customer.find({ 'address.country': { $in: [null, '', undefined] } }).limit(5);

  console.log('Address Audit Summary');
  console.log('======================');
  console.table({
    usersMissingCountry: results.usersMissingCountry,
    customersMissingCountry: results.customersMissingCountry,
    ordersMissingDeliveryCountry: results.ordersMissingDeliveryCountry,
    warehousesMissingCountry: results.warehousesMissingCountry,
  });

  console.log('\nExamples (users):');
  sampleUsers.forEach(u => console.log({ id: u.id, name: u.name, address: u.address }));

  console.log('\nExamples (customers):');
  sampleCustomers.forEach(c => console.log({ id: c.id, name: c.name, address: c.address }));

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
