let AWS = require('aws-sdk');
AWS.config.update({
    region: 'us-east-1',
    endpoint: 'http://localhost:8000',
});

let docClient = new AWS.DynamoDB.DocumentClient();
const table = 'productInfo';

const brand = '';
const name = '';
const flavor = '';
const brandKey = `${brand}#${name}#${flavor}`;

let params = {
    TableName: table,
    Item: {
        brandKey: brandKey,
        flavor: flavor,
        brand: brand,
        name: name,
    }
};