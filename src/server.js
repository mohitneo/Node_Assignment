const express = require('express');
const { json, urlencoded } = require('body-parser');
const morgan = require('morgan');
const config = require('./config');
const cors = require('cors');
const cron = require('node-cron');
const handleOrderProcessing = require('./crons/order');

const { connectDb } = require('./utils/db');
const ordersRouter = require('./routes/orderRoutes');
const usersRouter = require('./routes/userRoutes');
const productsRouter = require('./routes/productRoutes');

const app = express();

app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/api', usersRouter, ordersRouter, productsRouter);

cron.schedule('*/20 * * * * *', handleOrderProcessing);

const start = async () => {
  try {
    await connectDb();
    app.listen(config.port, () => {
      console.log(`Order API on http://localhost:${config.port}`);
    });
  } catch (e) {
    console.error('====', e);
  }
};

module.exports = { app, start };
