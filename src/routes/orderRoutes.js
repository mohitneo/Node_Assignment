const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const constants = require('../utils/userConstants');
const { connectDb, getPaginationAggregateQuery } = require('../utils/db');
const handleOrderProcessing = require('../crons/order');
const orderCollection = require('../models/orders.model');
const orderPaymentTransactionCollection = require('../models/orderPayments.model');
const productCollection = require('../models/products.model');
const orderPaymentTransactionLogsCollection = require('../models/orderPaymentLogs.model');
const { v4 } = require('uuid');
require('dotenv').config();
const { jwtSecretKey } = process.env;

const validateRequest = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(403).send('A token is required for authentication');
  }

  try {
    const token = authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, jwtSecretKey);
    const { userId } = decodedToken.data;

    if (userId) {
      req.userId = userId;
      next();
    } else {
      return res.status(401).send('Invalid Token');
    }
  } catch (err) {
    return res.status(401).send('Invalid Token');
  }
};

router.post('/createOrder', validateRequest, async (req, res) => {
  console.log('Start creating order execution');
  try {
    const sqs = new AWS.SQS({ region: process.env.AWS_REGION });
    const params = {
      MessageBody: JSON.stringify(req.body),
      QueueUrl: process.env.QueueUrl
    };

    sqs.sendMessage(params, function(err, data) {
      if (err) {
        throw err;
      }
      console.log('Order placed successfully:');
    });
    return res.status(201).json({
      success: false,
      data: null,
      message: 'Order data pushed into the queue'
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err });
  }
});

router.get('/receiveOrder', validateRequest, async (req, res) => {
  console.log('Start receiving order execution');
  try {
    await handleOrderProcessing();
    return res.status(200).json({
      success: false,
      data: null,
      message: 'Function processed'
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err });
  }
});

router.get('/getUserOrders', validateRequest, async (req, res) => {
  console.log('Start of get user order execution');
  try {
    const { userId } = req.params;
    const status = req.query.status ? req.query.status : null;
    const pageNumber = req.query.pageNumber ? Number(req.query.pageNumber) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 10;
    const sort = req.query.sort ? req.query.sort : constants.USER_CONSTANTS.SORTING[0];
    const sortBy = req.query.sortBy ? req.query.sortBy : constants.PRODUCT_SORTBY[0];

    const match = {
      userId: userId
    };
    if (status) {
      match['orderStatus'] = status;
    }
    const searchQuery = getPaginationAggregateQuery(
      pageNumber,
      pageSize,
      sortBy,
      sort,
      match
    );

    const orders = await orderCollection.aggregate(searchQuery).toArray();

    if (orders[0].data.length) {
      return res.status(200).json({
        success: true,
        data: orders[0],
        message: 'User orders data'
      });
    } else {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'User orders not found'
      });
    }
  } catch (err) {
    return res.status(400).json({ status: false, message: err });
  }
});

router.put('/updateOrderStatus', validateRequest, async (req, res) => {
  console.log('Start of update order status execution');
  try {
    const { orderId } = req.params;
    const status = req.query.status;
    const tokenUserId = req.body.tokenUserId;

    const filter = {
      orderId: orderId
    };
    if (tokenUserId) {
      filter['userId'] = tokenUserId;
    }
    const order = await orderCollection.findOne(filter);
    if (!order) {
      res.status(400).json({
        success: false,
        data: null,
        message: 'Order data not found'
      });
    }

    await orderCollection.findOneAndUpdate(
      { orderId: orderId },
      { $set: { orderStatus: status } }
    );

    return res.status(200).json({
      success: true,
      data: null,
      message: `Order status updated successfully`
    });
  } catch (err) {
    return res.status(400).json({ status: false, message: err });
  }
});

router.post('/initiateOrderPayment', validateRequest, async (req, res) => {
  console.log('Start of initiate order payment execution');
  try {
    const { orderId } = req.params;
    const { orderAmount } = req.body;
    const tokenUserId = req.body.tokenUserId;

    const filter = {
      orderId: orderId
    };
    if (tokenUserId) {
      filter['userId'] = tokenUserId;
    }
    const order = await orderCollection.findOne(filter);
    if (!order) {
      res.status(400).json({
        success: false,
        data: null,
        message: 'Order not found'
      });
    }

    if (order.totalAmount !== orderAmount) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Amount is not matching with the order amount'
      });
    }

    await orderCollection.findOneAndUpdate(
      { orderId: orderId },
      {
        $set: {
          orderStatus: constants.ORDER_PAYMENT_PROCESSING
        }
      }
    );

    return res.status(200).json({
      success: true,
      data: null,
      message: `Order have moved to payment processing state`
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err
    });
  }
});

router.post('/proceedOrderPayment', validateRequest, async (req, res) => {
  console.log('Start of proceed order payment execution');
  try {
    const { orderId } = req.params;
    const { paymentTransactionId, paymentTransactionStatus } = req.body;
    const tokenUserId = req.body.tokenUserId;

    const filter = {
      orderId: orderId
    };
    if (tokenUserId) {
      filter['userId'] = tokenUserId;
    }

    const order = await orderCollection.findOne(filter);
    if (!order) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Order data not found'
      });
    }

    if (
      ![
        constants.USER_CONSTANTS.ORDER_PAYMENT_PROCESSING,
        constants.USER_CONSTANTS.ORDER_PAYMENT_FAILED
      ].includes(order.orderStatus)
    ) {
      return res.status(400).json({
        success: false,
        data: null,
        message:
          'Order payment cannot be proceeded as order is not in payment state'
      });
    }
    const promises = [];
    const session = connectDb.startSession();
    session.startTransaction();
    try {
      const orderPaymentTransaction = await orderPaymentTransactionCollection.findOneAndUpdate(
        { orderId: orderId },
        {
          $set: {
            paymentTransactionId: paymentTransactionId,
            paymentStatus: paymentTransactionStatus,
            transactionDateTime: new Date()
          }
        },
        { session }
      );

      if (!orderPaymentTransaction) {
        promises.push(
          orderPaymentTransactionCollection.insertOne(
            {
              orderId: orderId,
              paymentTransactionId: paymentTransactionId,
              paymentStatus: paymentTransactionStatus,
              transactionDateTime: new Date()
            },
            { session }
          )
        );
      }

      promises.push(
        orderPaymentTransactionLogsCollection.insertOne(
          {
            paymentTransactionLogId: v4(),
            paymentTransactionId: paymentTransactionId,
            orderId: orderId,
            paymentStatus: paymentTransactionStatus,
            transactionLogDateTime: new Date()
          },
          { session }
        )
      );

      if (
        paymentTransactionStatus === constants.ORDER_PAYMENT_TRANSACTION_SUCCESS
      ) {
        promises.push(
          orderCollection.findOneAndUpdate(
            { orderId: orderId },
            {
              $set: {
                orderStatus: constants.USER_CONSTANTS.ORDER_PAYMENT_COMPLETE
              }
            },
            { session }
          )
        );
      } else if (
        paymentTransactionStatus === constants.ORDER_PAYMENT_TRANSACTION_FAILURE
      ) {
        promises.push(
          orderCollection.findOneAndUpdate(
            { orderId: orderId },
            {
              $set: {
                orderStatus: constants.ORDER_PAYMENT_FAILED
              }
            },
            { session }
          )
        );
      }
      await Promise.all(promises);
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();

      res.status(200).json({
        success: true,
        data: null,
        message: 'Order payment proceeded'
      });
    }
  } catch (err) {
    return res.status(400).json({ success: false, message: err });
  }
});

router.post('/cancelOrder', validateRequest, async (req, res) => {
  console.log('Start of cancel order execution');
  const { orderId } = req.params;
  const tokenUserId = req.body.tokenUserId;
  let isError = false;

  const filter = {
    orderId: orderId
  };
  if (tokenUserId) {
    filter['userId'] = tokenUserId;
  }

  try {
    const order = await orderCollection.findOne(filter);
    if (!order) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Order not found'
      });
    }

    if ([constants.ORDER_CANCELLED].includes(order.orderStatus)) {
      return res.status(200).json({
        success: false,
        data: null,
        message: 'You already cancelled the order'
      });
    }

    if (
      [
        constants.ORDER_COMPLETE,
        constants.ORDER_PAYMENT_PROCESSING,
        constants.ORDER_PAYMENT_COMPLETE,
        constants.ORDER_PAYMENT_FAILED,
        constants.ORDER_SHIPPING
      ].includes(order.orderStatus)
    ) {
      return res.status(200).json({
        success: false,
        data: null,
        message:
          'Order cannot be cancelled now as it is in advance stage of processing'
      });
    }

    const session = connectDb.startSession();
    try {
      session.startTransaction();
      await orderCollection.findOneAndUpdate(
        { orderId: orderId },
        {
          $set: { orderStatus: constants.ORDER_CANCELLED }
        },
        { session }
      );

      for (const orderItem of order.orderItems) {
        const product = await productCollection.findOne(
          { productId: orderItem.productId },
          { session }
        );
        if (product) {
          await productCollection.findOneAndUpdate(
            { productId: orderItem.productId },
            {
              $set: {
                currentQuantity:
                  product.currentQuantity + orderItem.totalQuantity
              }
            },
            { session }
          );
        }
      }
      await session.commitTransaction();
    } catch (err) {
      isError = true;
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
      if (!isError) {
        res.status(200).json({
          success: true,
          data: null,
          message: 'order cancelled'
        });
      }
    }
  } catch (err) {
    return res.status(400).json({ status: false, message: err });
  }
});

module.exports = router;
