let AWS = require('aws-sdk');

AWS.config.update({
    region: 'us-east-1',
    endpoint: 'http://localhost:8000',
});

let ddb = new AWS.DynamoDB();
let table = 'productInfo';

ddb.scan({TableName: table}, (err, data) => {
    if (err) {
        console.error(`Unable to scan table ${table}.`);
    } else {
        console.debug(data.Items);
    }
});