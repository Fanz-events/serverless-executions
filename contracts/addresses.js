const dotenv = require('dotenv');
let localConfig = dotenv.config().parsed
  
const addresses = {
  Admin: process.env.ADMIN_ADDRESS || localConfig.ADMIN_ADDRESS,
};

module.exports = addresses;