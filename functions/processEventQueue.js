const axios = require('axios');

exports.handler = async function() {
    console.log('Starting processing queue...');

    return axios.get('https://protocol-api-jobs-dev.fanz.events/process-sqs-messages');
}