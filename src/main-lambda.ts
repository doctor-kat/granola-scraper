import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import * as SPAScraper from './spa-scraper';
import { overviewConfig } from './config/gxp-overview';
// import { productConfig } from './config/gxp-product';
import { Offer } from './config/Offer';
import * as AWSLambda from 'aws-lambda';
import { Config } from './config/config';

const ddbConfig: AWS.DynamoDB.ClientConfiguration = {}; // {endpoint: 'http://localhost:8000'}

/**
 * create ddb table
 * @param {string} name table name
 * @param {string} hash primary key
 * @param {string} range secondary key
 * @param {number} throughput read/write capacity units
 */
async function createTable(name: string, hash: string, range: string, throughput: number) {
    const ddb = new AWS.DynamoDB(ddbConfig);

    ddb .describeTable({TableName: name})
        .promise()
        .then((data) => console.log(`Table ${name} already exists.`))
        .catch((err) => {
            if (err && err.code === 'ResourceNotFoundException') {
                const params = {
                    TableName: name,
                    KeySchema: [
                        {
                            AttributeName: hash,
                            KeyType: 'HASH',
                        },
                        {
                            AttributeName: range,
                            KeyType: 'RANGE',
                        },
                    ],
                    AttributeDefinitions: [
                        {
                            AttributeName: hash,
                            AttributeType: 'S',
                        },
                        {
                            AttributeName: range,
                            AttributeType: 'S',
                        },
                    ],
                    ProvisionedThroughput: {
                        ReadCapacityUnits: throughput,
                        WriteCapacityUnits: throughput,
                    }
                } // params

                ddb.createTable(params, (err, data) => {
                    if (err) {
                        console.error('Error:', err);
                    } else {
                        console.log(`Created Table: ${params.TableName}.`);
                    }
                });
            } // if
        }); // catch
    // ddb
} // function

/**
 * main lambda to be activated only by scheduled events
 */
exports.handler = async () => {
    AWS.config.update({ region: 'us-east-1' });
    const docClient = new AWS.DynamoDB.DocumentClient(ddbConfig);
    
    const tableName: string = process.env.queueTableName;

    let offers: Offer[];    
    offers = await SPAScraper.scrape(null, overviewConfig);

    // compose batchWrite params
    let params: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {RequestItems: {}};
    params.RequestItems[tableName] = [];
    const date = `${new Date().getFullYear()}-${new Date().getMonth()+1}-${new Date().getDate()}`;

    for (let offer of offers) {
        params.RequestItems[tableName].push({
            PutRequest: {
                Item: {
                    url: offer.url,
                    date,
                    name: offer.name,
                }
            }
        });

        if ((params.RequestItems[tableName].length >= 25) || (offer.url == offers.slice(-1)[0].url)) {
            try {
                await docClient.batchWrite(params).promise();
                console.log(`wrote ${params.RequestItems[tableName].length} items to dynamoDB`);
                // remove items from granola-queue
            } catch(err) {
                console.log(err);
                console.log(params.RequestItems[tableName].map(req => req.PutRequest.Item));
            } finally {
                params.RequestItems[tableName] = [];
            }
        }
    }
    // context.done();
}

// this.handler();