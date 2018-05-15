let AWS = require('aws-sdk');

AWS.config.update({
    region: 'us-east-1',
    endpoint: 'http://localhost:8000',
});

let ddb = new AWS.DynamoDB();
let table = 'productInfo';

(async () => {
    await ddb.deleteTable({TableName: table}, (err, data) => {
        if (err) {
            console.error(`Unable to delete table ${table}.`);
            console.error('Error:', err);
        } else {
            console.debug(`Deleted table ${table}.`);
        }
    });

    await ddb.describeTable({
        TableName: table,
    },
    (err, data) => {
        if (err && err.code === 'ResourceNotFoundException') {
            let params = {
                TableName: table,
                KeySchema: [{
                    AttributeName: 'url',
                    KeyType: 'HASH',
                // }, {
                //     AttributeName: 'url',
                //     KeyType: 'RANGE',
                }],
                AttributeDefinitions: [{
                    AttributeName: 'url',
                    AttributeType: 'S',
                // }, {
                //     AttributeName: 'url',
                //     AttributeType: 'S',
                }],
                ProvisionedThroughput: {
                    ReadCapacityUnits: 1,
                    WriteCapacityUnits: 1,
                },
            };
            ddb.createTable(params, (err, data) => {
                if (err) {
                    console.error('Error:', err);
                } else {
                    console.debug(`Created Table: ${params.TableName}.`);
                }
            });
        } else {
            console.debug(`Table already exists.`);
        }
    });
})();
