const USER_CONSTANTS = {
  USER_COLLECTION: 'users',
  PRODUCT_COLLECTION: 'products',
  ORDER_COLLECTION: 'orders',
  ORDER_PAYMENT_TRANSACTION_COLLECTION: 'orderPaymentTransactions',
  ORDER_PAYMENT_TRANSACTION_LOGS_COLLECTION: 'orderPaymentTransactionLogs',
  ROLE_ADMIN: 'admin',
  ROLE_USER: 'user',
  GENDER: ['male', 'female'],
  CONTACT_TYPE: ['phone', 'email'],
  ADDRESS_TYPE: ['home', 'office'],
  SORTING: ['asc', 'desc'],
  PRODUCT_SORTBY: ['name', 'value', 'currentQuantity', 'createdAt'],
  ORDER_SORTBY: ['orderStatus', 'totalAmount', 'createdAt'],
  USER_SORTBY: [
    'username',
    'firstname',
    'lastname',
    'age',
    'gender',
    'role',
    'createdAt'
  ],
  ORDER_CREATED: 'Created',
  ORDER_PROCESSING: 'Processing',
  ORDER_PAYMENT_PROCESSING: 'PaymentProcessing',
  ORDER_PAYMENT_FAILED: 'PaymentFailed',
  ORDER_PAYMENT_COMPLETE: 'PaymentComplete',
  ORDER_SHIPPING: 'Shipping',
  ORDER_COMPLETE: 'Complete',
  ORDER_CANCELLED: 'Cancelled',
  ORDER_PAYMENT_TRANSACTION_SUCCESS: 'Success',
  ORDER_PAYMENT_TRANSACTION_FAILURE: 'Failed'
};

module.exports = { USER_CONSTANTS };
