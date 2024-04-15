const mongoose = require('mongoose');

const orderPaymentLogsSchema = new mongoose.Schema({
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

const OrderPaymentLogs = mongoose.model(
  'orderPaymentLogs',
  orderPaymentLogsSchema
);

module.exports = OrderPaymentLogs;
