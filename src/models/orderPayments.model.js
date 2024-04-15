const mongoose = require('mongoose');

const orderPaymentsSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Types.ObjectId
  },
  transactionId: {
    type: String
  },
  transactionStatus: {
    type: String,
    enum: ['success', 'failed']
  },
  transactionAt: {
    type: Date,
    default: Date.now()
  },
  createdAt: {
    type: Date,
    default: Date.now()
  },
  updatedAt: {
    type: Date,
    default: Date.now()
  }
});

const OrderPayments = mongoose.model('orderPayments', orderPaymentsSchema);

module.exports = OrderPayments;
