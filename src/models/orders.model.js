const mongoose = require('mongoose');

const ordersSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Types.ObjectId
  },
  userDetails: {
    type: Array
  },
  orderItems: {
    type: Array
  },
  shippingAddress: {
    type: Array
  },
  deliveryAddress: {
    type: Array
  },
  totalAmount: {
    type: Number
  },
  orderStatus: {
    type: String,
    enum: [
      'created',
      'confirmed',
      'cancelled',
      'declined',
      'delivered',
      'processing',
      'paymentProcessing',
      'paymentComplete'
    ]
  },
  createdAt: {
    type: Date
  },
  updatedAt: {
    type: Date,
    default: Date.now()
  }
});

ordersSchema.post('validate', doc => {
  doc.status = 'created';
});

const Orders = mongoose.model('orders', ordersSchema);
module.exports = Orders;
