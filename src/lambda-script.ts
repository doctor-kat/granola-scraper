import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import { scrapePrice } from './spa-crawler';
import { config } from './config/gxp';
import { Offer } from './config/Offer';
import { GetItemInput } from 'aws-sdk/clients/dynamodb';

// @ts-ignore: allow json import
// import * as offers from './offers.json';

AWS.config.update({region: 'us-east-1'});
const ddb = new AWS.DynamoDB({endpoint: 'http://localhost:8000'});
const docClient = new AWS.DynamoDB.DocumentClient({endpoint: 'http://localhost:8000'});

const year = new Date().getFullYear();
const table = year + '-W1_' + year + '-W52';
console.debug(`TableName: ${table}`);

(async() => {
    await ddb
        .describeTable({TableName: table})
        .promise()
        .then((data) => console.debug(`Table already exists.`))
        .catch((err) => {
            if (err && err.code === 'ResourceNotFoundException') {
                const params = require('./aws/create-table.js')(table);
                ddb.createTable(params, (err, data) => {
                    if (err) {
                        console.error('Error:', err);
                    } else {
                        console.debug(`Created Table: ${params.TableName}.`);
                    }
                });
            }
        });
    console.debug(`Finished checking if table exists.`);

    let offers: Offer[];
    offers = await scrapePrice(config);
    // fs.writeFileSync(`./data/${table}.json`, JSON.stringify(offers));

    offers.forEach(async (offer) => {
        const info = offer.data;
        if (info instanceof Array) {
            await docClient.get({
                TableName: 'productInfo',
                Key: { url: info[0].url }
            }, async (err, data) => {
                if (err) {
                    console.debug('Error:', err);
                } else if (!data.Item) {
                    const item = info[0];
                    if (typeof item.description === 'string') {
                        // TODO: primary key sharding
                        const params:any = {
                            TableName: 'productInfo',
                            Item: {
                                isNew: true,
                                url: item.url
                            }
                        };
                            
                        const brand = item.description.substring(0, item.description.indexOf(','));
                        const flavor = item.description.substring(item.description.indexOf(',')+1, item.description.indexOf('-')).trim();
                        const size = item.description.substring(item.description.indexOf('-')+1).trim();

                        if (brand && flavor && size) {
                            params.Item.brand = brand;
                            params.Item.flavor = flavor;
                            params.Item.size = size;
                        } else {
                            params.Item.description = item.description;
                        }

                        await docClient.put((params), (err, data) => {
                            if (err) {
                                console.error('Error:', err);
                            } else {
                                console.debug(`${item.description} created.`);
                            }
                        });
                    } else {
                        console.warn(`item.description failed typeguard.`);
                        console.debug('item:', item);
                    }
                } else {
                    console.debug(`Item already exist.`);
                }
            });
        } else {
            console.warn(`offers failed typeguard.`);
            console.debug('info:', info);
        }
    });
})();
