import * as AWS from 'aws-sdk';
import { Offer } from './config/offer';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

AWS.config.update({ region: 'us-east-1' });
const ddbConfig: AWS.DynamoDB.ClientConfiguration = {}; // {endpoint: 'http://localhost:8000'}
const docClient = new AWS.DynamoDB.DocumentClient();
const ddb = new AWS.DynamoDB(ddbConfig);

/**
 * create ddb table
 * @param {string} name table name
 * @param {string} hash primary key
 * @param {string} range secondary key
 * @param {number} throughput read/write capacity units
 */
export async function createTable(name: string, hash: string, range: string, throughput: number) {
    const params = {
        TableName: name,
        KeySchema: [
            {
                AttributeName: hash,
                KeyType: 'HASH',
            }
        ],
        AttributeDefinitions: [
            {
                AttributeName: hash,
                AttributeType: 'S',
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: throughput,
            WriteCapacityUnits: throughput,
        }
    } // params

    if (range) {
        params.KeySchema.push({
            AttributeName: range,
            KeyType: 'RANGE',
        });
        params.AttributeDefinitions.push({
            AttributeName: range,
            AttributeType: 'S',
        });
    }

    try {
        await ddb.describeTable({TableName: name}).promise();
        console.log(`Table ${name} already exists.`)
    } catch(err) {
        console.warn(err);
        try {
            await ddb.createTable(params).promise();
            console.log(`Created Table: ${params.TableName}`);
        } catch(err) {
            console.error(err);
            process.exit(1);
        }
    }
} // function

export async function batchPutProducts(tableName: string, products: any) {
    // compose batchWrite params
    let params: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {RequestItems: {}};
    let requests: AWS.DynamoDB.DocumentClient.WriteRequests = params.RequestItems[tableName] = [];

    for (let product of products) {
        let response: AWS.DynamoDB.GetItemOutput;
        await docClient.get({
            TableName: tableName,
            Key: { url: product.url }
        }).promise().then((r) => response = r);

        if (!response.Item) {
            requests.push({
                PutRequest: {
                    Item: {
                        url: product.url,
                        description: product.description,
                        new: product.new,
                    }
                }
            });
        } else {
            console.log(`${response.Item.description} already exists`);
        }

        if ((requests.length >= 25) || ((product.url == products.slice(-1)[0].url) && (requests.length > 0))) {
            await docClient.batchWrite(params).promise();
            console.log(`wrote ${params.RequestItems[tableName].length} items to ${tableName}`);
            params.RequestItems[tableName] = [];
        }
    } // for
} // function

export async function batchPutOffers(tableName: string, offers: Offer[]) {
    // compose batchWrite params
    let params: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {RequestItems: {}};
    params.RequestItems[tableName] = [];

    const date = new Date().toISOString().substring(0,10);
    for (let offer of offers) {
        const url = offer.url;
        params.RequestItems[tableName].push({
            PutRequest: {
                Item: {
                    key: `${url}#${date}`,
                    price: offer.price,
                }
            }
        });
        
        if ((params.RequestItems[tableName].length >= 25) || ((offer.key == offers.slice(-1)[0].key) && (offer.price == offers.slice(-1)[0].price))) {
            await docClient.batchWrite(params).promise();
            console.log(`wrote ${params.RequestItems[tableName].length} items to ${tableName}`);
            params.RequestItems[tableName] = [];
        }
    } // for
} // function

export function createS3Request(bucketName: string, fileName: string) {
    const s3 = new AWS.S3();
    const params = {
        Bucket: bucketName,
        Key: fileName
    }
    const object = s3.getObject(params);
    return object
} // function