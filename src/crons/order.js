const {
  getOrderDataFromQueue,
  handleOrder,
  sendCronResponse
} = require('../utils/order');

const handleOrderProcessing = async () => {
  console.log('Started order processing cronjob execution');

  try {
    // get order details from the queue
    const orders = await getOrderDataFromQueue();

    if (orders.isError) {
      return sendCronResponse('OrderProcessing', 500, orders.message);
    }
    if (!orders) {
      return sendCronResponse(
        'OrderProcessing',
        400,
        'Orders not found from the queue'
      );
    }
    // for every order
    for (const order of orders) {
      const orderResult = await handleOrder(order);
      if (orderResult.isError) {
        console.log('Error ocuured while processing order : ', orderResult);
      } else {
        console.log(
          'Order created successfully : order DB Id : ',
          orderResult.insertedOrderId
        );
      }
    }
    return;
  } catch (err) {
    console.log('err occured while processing orders ', err);
  }
};

module.exports = handleOrderProcessing;
