const env = process.env.NODE_ENV || 'development';

const baseConfig = {
  env,
  isDev: env === 'development',
  port: 3001
};

let envConfig = {};

switch (env) {
  case 'dev':
  case 'development':
    envConfig = require('./dev');
    break;
  case 'prod':
  case 'production':
    envConfig = require('./prod');
    break;
  default:
    envConfig = require('./dev');
}

const mergeConfig = { ...baseConfig, ...envConfig };
module.exports = mergeConfig;
