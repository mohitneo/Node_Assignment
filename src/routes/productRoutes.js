const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const productCollection = require('../models/products.model');
const constants = require('../utils/userConstants');
const { getPaginationAggregateQuery } = require('../utils/db');
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

router.post('/addProduct', validateRequest, async (req, res) => {
  console.log('Start of add product execution');
  try {
    const payload = req.body.map(prod => ({
      ...prod,
      isActive: prod.isActive ? true : false,
      isDelete: prod.isDelete ? true : false,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const products = await productCollection.insertMany(payload);
    if (products.insertedCount > 0) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Product added'
      });
    }
    return res.status(200).json({
      success: false,
      data: null,
      message: 'Product not added'
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err });
  }
});

router.get('/listProducts', validateRequest, async (req, res) => {
  console.log('Start of products list execution');
  try {
    const isActive = req.query.active
      ? req.query.active === 'true'
        ? true
        : false
      : true;
    const isDelete = req.query.delete
      ? req.query.delete === 'true'
        ? true
        : false
      : false;
    const pageNumber = req.query.pageNumber ? Number(req.query.pageNumber) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 2;
    const sort = req.query.sort ? req.query.sort : constants.SORTING[0];
    const sortBy = req.query.sortBy ? req.query.sortBy : constants.PRODUCT_SORTBY[0];

    const match = {
      isActive: isActive,
      isDelete: isDelete
    };
    const searchQuery = getPaginationAggregateQuery(
      pageNumber,
      pageSize,
      sortBy,
      sort,
      match
    );
    const products = await productCollection.aggregate(searchQuery).toArray();

    if (!products[0].data.length) {
      return res.status(200).json({
        success: false,
        data: null,
        message: 'No products found'
      });
    }
    return res.status(200).json({
      success: true,
      data: products[0],
      message: 'Products found'
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err });
  }
});

router.get('/getProduct', validateRequest, async (req, res) => {
  console.log('Start of get product execution');
  try {
    const productId = req.params.productId;
    const product = await productCollection.findOne({ productId: productId });
    if (!product) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Product with the provided id not found'
      });
    }
    const productWithoutObjectId = JSON.parse(JSON.stringify(product));
    delete productWithoutObjectId._id;

    return res.status(200).json({
      success: true,
      data: productWithoutObjectId,
      message: 'Product details found'
    });
  } catch (err) {
    return res.status(400).json({ status: false, message: err });
  }
});

router.put('/updateProduct', validateRequest, async (req, res) => {
  console.log('Start of update product execution');
  try {
    const { productId } = req.params;
    const payload = req.body;
    const updatedProduct = await productCollection.findOneAndUpdate(
      { productId: productId },
      { $set: payload },
      { returnDocument: 'after' }
    );
    if (!updatedProduct) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Product with provided id not found'
      });
    }

    const productWithoutObjectId = JSON.parse(JSON.stringify(updatedProduct));
    delete productWithoutObjectId._id;

    return res.status(200).json({
      success: true,
      data: productWithoutObjectId,
      message: 'Product data updated successfully'
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err });
  }
});

router.delete('/deleteProduct', validateRequest, async (req, res) => {
  console.log('Start of delete product execution');
  try {
    const { productId } = req.params;
    const deleteResult = await productCollection.findOneAndDelete({
      productId: productId
    });

    if (!deleteResult) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Product with provided id not found'
      });
    }
    return res.status(200).json({
      success: true,
      data: null,
      message: 'Product deleted'
    });
  } catch (err) {
    return res.status(400).json({ status: false, message: err });
  }
});

module.exports = router;
