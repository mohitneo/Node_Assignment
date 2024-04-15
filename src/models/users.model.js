const mongoose = require('mongoose');

const usersSchema = new mongoose.Schema({
  userName: {
    type: String
  },
  email: {
    type: String
  },
  password: {
    type: String
  },
  firtName: {
    type: String
  },
  lastName: {
    type: String
  },
  age: {
    type: Number
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  address: {
    type: Array
  },
  isActive: {
    type: Boolean
  },
  isDelete: {
    type: Boolean
  },
  role: {
    type: String,
    enum: ['user', 'admin']
  },
  createdAt: {
    type: Date
  },
  updateAt: {
    type: String,
    default: Date.now()
  }
});

const Users = mongoose.model('users', usersSchema);

module.exports = Users;
