const { http } = require("./packages/follow-redirects");

exports.handler = async function() {
    console.log('Starting processing queue...');
    var options = {
        host: 'https://protocol-api-jobs-dev.fanz.events',
        port: 80,
        path: '/process-sqs-messages',
        method: 'GET'
    }

    return http.request(options, function(res) {
        console.log('STATUS: ' + res.statusCode)
        if(!res.statusCode || res.statusCode >= 300) {
            throw new Error("Not expected finished")
        }
    }).end()
}