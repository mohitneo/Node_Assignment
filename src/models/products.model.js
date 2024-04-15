const mongoose = require('mongoose');

const productsSchema = new mongoose.Schema({
  name: {
    type: String
  },
  price: {
    type: Number
  },
  quantity: {
    type: Number
  },
  isActive: {
    type: Boolean
  },
  isDelete: {
    type: Boolean
  },
  createdAt: {
    type: Date
  },
  updatedAt: {
    type: Date
  }
});

const Products = mongoose.model('products', productsSchema);

module.exports = Products;
