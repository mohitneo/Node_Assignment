const AWS = require('aws-sdk');
const constants = require('../utils/userConstants');
const { connectDb } = require('../utils/db');
const { v4 } = require('uuid');
require('dotenv').config();
const userCollection = require('../models/users.model');
const productCollection = require('../models/products.model');
const orderCollection = require('../models/orders.model');

// Delete a message from the queue
const deleteMessageFromQueue = receiptHandle => {
  const sqs = AWS.SQS;
  const deleteParams = {
    QueueUrl: process.env.QueueUrl,
    ReceiptHandle: receiptHandle
  };

  sqs.deleteMessage(deleteParams, function(err, data) {
    if (err) {
      console.error('Error deleting message:', err);
      return;
    }
    console.log('Message deleted from queue');
  });
};

const getOrderDataFromQueue = async () => {
  AWS.config.update({ region: process.env.AWS_REGION });

  // Create an SQS service object
  const sqs = new AWS.SQS({});

  const params = {
    QueueUrl: process.env.QueueUrl,
    MaxNumberOfMessages: 3,
    WaitTimeSeconds: 0
  };

  const sqsMessages = await sqs.receiveMessage(params).promise();
  const orderData = sqsMessages.Messages;
  const orders = [];

  console.log('Received data from queue : ', sqsMessages.Messages);
  orderData.map(orderMessage => {
    deleteMessageFromQueue(orderMessage.ReceiptHandle);
    orders.push(JSON.parse(orderMessage.Body));
  });

  return orders;
};

const getUserDetails = async userId => {
  const userDetails = await userCollection.findOne({ userId: userId });
  if (!userDetails) {
    return null;
  }
  return userDetails;
};

const validateShippingAndContactDetails = async (user, order) => {
  console.log('Start of validating shipping and contact details');
  const userAddressDetails = user.addressDetails;
  const userContactDetails = user.contactDetails;
  const { shippingAddress, contactDetails } = order;

  let addressFound = false;
  let contactFound = false;

  for (const userAddress of userAddressDetails) {
    if (
      userAddress.addressId === shippingAddress.addressId &&
      userAddress.isActive
    ) {
      addressFound = true;
      break;
    }
  }

  for (const userContact of userContactDetails) {
    if (
      userContact.contactId === contactDetails.contactId &&
      userContact.isActive
    ) {
      contactFound = true;
      break;
    }
  }

  return addressFound && contactFound;
};

const checkStock = async orderItems => {
  console.log('Start of checking stock of item');
  if (!orderItems.length) {
    return null;
  }

  const orderProducts = orderItems.map(item => item.productId);

  const dbProductDetails = await productCollection
    .find({
      productId: { $in: orderProducts }
    })
    .toArray();

  let isStockPresent = true;
  const matchedProductsFromDB = [];
  for (const orderItemDetails of orderItems) {
    const { productId, totalQuantity } = orderItemDetails;

    for (const dbProduct of dbProductDetails) {
      if (dbProduct.productId === productId) {
        if (!dbProduct.isActive || dbProduct.isDeleted) {
          isStockPresent = false;
          break;
        }
        if (dbProduct.currentQuantity < totalQuantity) {
          isStockPresent = false;
          break;
        }
        matchedProductsFromDB.push(dbProduct);
      }
    }
    if (!isStockPresent) {
      break;
    }
  }

  if (orderItems.length !== matchedProductsFromDB.length) {
    return null;
  }
  if (!isStockPresent) {
    return null;
  }

  return {
    dbProductDetails
  };
};

const validateTotalOrderAmount = async (
  dbProducts,
  orderItems,
  totalOrderAmount
) => {
  let calculatedTotalAmount = 0;
  for (const orderItem of orderItems) {
    const { productId, totalQuantity } = orderItem;

    const matchedDbProduct = dbProducts.filter(
      dbProduct => dbProduct.productId === productId
    )[0];
    const calculatedProductAmount = matchedDbProduct.price * totalQuantity;
    calculatedTotalAmount += calculatedProductAmount;
  }

  if (calculatedTotalAmount !== totalOrderAmount) {
    return false;
  }
  return true;
};

const handleOrder = async order => {
  const {
    userId,
    orderItems,
    totalOrderAmount,
    shippingAddress,
    contactDetails
  } = order;

  // check if the user details exist in our database
  const user = await getUserDetails(userId);
  if (!user) {
    return { isError: true, message: 'User not found' };
  }

  const areAddressContactDetailsVaild = await validateShippingAndContactDetails(
    user,
    order
  );

  if (!areAddressContactDetailsVaild) {
    return {
      isError: true,
      message: 'Failed while validating address and contact details'
    };
  }

  // check if the order items are in stock
  const areOrderItemsInStock = await checkStock(orderItems);

  if (!areOrderItemsInStock) {
    return { isError: true, message: 'Order items are not in stock' };
  }

  const { dbProductDetails } = areOrderItemsInStock;
  // check if the order calculation is proper (frontend == backend)
  const isTotalAmountCorrect = await validateTotalOrderAmount(
    dbProductDetails,
    orderItems,
    totalOrderAmount
  );

  if (!isTotalAmountCorrect) {
    return {
      isError: true,
      message: 'Failed while validating order total amount'
    };
  }

  // place the order with status - created
  const orderData = {
    orderId: v4(),
    userId: userId,
    orderStatus: constants.ORDER_CREATED,
    shippingAddress: shippingAddress,
    contactDetails: contactDetails,
    orderItems: orderItems.map(item => ({
      ...item,
      orderItemId: v4()
    })),
    totalAmount: totalOrderAmount,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  let orderRecord;
  const session = connectDb.startSession();
  try {
    session.startTransaction();
    orderRecord = await orderCollection.insertOne(orderData, { session });

    // deduct the order quantity from the stock
    const promises = [];
    for (const dbProduct of dbProductDetails) {
      const matchedDbProduct = orderItems.filter(
        item => item.productId === dbProduct.productId
      )[0];
      const updatedProductCurrentQuantity =
        dbProduct.currentQuantity - matchedDbProduct.totalQuantity;
      promises.push(
        productCollection.findOneAndUpdate(
          { productId: dbProduct.productId },
          {
            $set: {
              ...dbProduct,
              currentQuantity: updatedProductCurrentQuantity
            }
          },
          { session }
        )
      );
    }
    await Promise.all(promises);
    await session.commitTransaction();
  } catch (err) {
    console.log(err);
    await session.abortTransaction();
    return {
      isError: true,
      message: 'Failed while inserting order details and updating DB'
    };
  } finally {
    await session.endSession();
  }
  return { insertedOrderId: orderRecord.insertedId };
};

const sendCronResponse = (cronName, status, message) => {
  const response = {
    cronName: cronName,
    statusCode: status,
    message: message
  };
  console.log('Cronjob Response : ', response);
  return response;
};

module.exports = { getOrderDataFromQueue, handleOrder, sendCronResponse };
