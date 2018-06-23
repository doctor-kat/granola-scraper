"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const AWS = __importStar(require("aws-sdk"));
const spa_crawler_1 = require("./spa-crawler");
const gxp_1 = require("./config/gxp");
// @ts-ignore: allow json import
// import * as offers from './offers.json';
exports.handler = () => __awaiter(this, void 0, void 0, function* () {
    AWS.config.update({ region: 'us-east-1' });
    const ddb = new AWS.DynamoDB({ endpoint: 'http://localhost:8000' });
    const docClient = new AWS.DynamoDB.DocumentClient({ endpoint: 'http://localhost:8000' });
    const year = new Date().getFullYear();
    const table = year + '-W1_' + year + '-W52';
    console.log(`TableName: ${table}`);
    yield ddb
        .describeTable({ TableName: table })
        .promise()
        .then((data) => console.log(`Table ${table} already exists.`))
        .catch((err) => {
        if (err && err.code === 'ResourceNotFoundException') {
            const params = {
                TableName: table,
                KeySchema: [
                    {
                        AttributeName: 'date',
                        KeyType: 'HASH',
                    },
                    {
                        AttributeName: 'url',
                        KeyType: 'RANGE',
                    },
                ],
                AttributeDefinitions: [
                    {
                        AttributeName: 'date',
                        AttributeType: 'S',
                    },
                    {
                        AttributeName: 'url',
                        AttributeType: 'S',
                    },
                ],
                ProvisionedThroughput: {
                    ReadCapacityUnits: 4,
                    WriteCapacityUnits: 4,
                }
            };
            ddb.createTable(params, (err, data) => {
                if (err) {
                    console.error('Error:', err);
                }
                else {
                    console.log(`Created Table: ${params.TableName}.`);
                }
            });
        }
        else {
            console.warn(`dynamoDB not found?`);
        }
    });
    console.log(`Finished checking if table exists.`);
    let offers;
    offers = yield spa_crawler_1.scrapePrice(gxp_1.config);
    // fs.writeFileSync(`./data/${table}.json`, JSON.stringify(offers));
    offers.forEach((offer) => __awaiter(this, void 0, void 0, function* () {
        const info = offer.data;
        if (info instanceof Array) {
            yield docClient.get({
                TableName: 'productInfo',
                Key: { url: info[0].url }
            }, (err, data) => __awaiter(this, void 0, void 0, function* () {
                if (err) {
                    console.log('Error:', err);
                }
                else if (!data.Item) {
                    const item = info[0];
                    if (typeof item.description === 'string') {
                        // TODO: primary key sharding
                        const params = {
                            TableName: 'productInfo',
                            Item: {
                                isNew: true,
                                url: item.url
                            }
                        };
                        const brand = item.description.substring(0, item.description.indexOf(','));
                        const flavor = item.description.substring(item.description.indexOf(',') + 1, item.description.indexOf('-')).trim();
                        const size = item.description.substring(item.description.indexOf('-') + 1).trim();
                        if (brand && flavor && size) {
                            params.Item.brand = brand;
                            params.Item.flavor = flavor;
                            params.Item.size = size;
                        }
                        else {
                            params.Item.description = item.description;
                        }
                        yield docClient.put((params), (err, data) => {
                            if (err) {
                                console.error('Error:', err);
                            }
                            else {
                                console.log(`${item.description} created.`);
                            }
                        });
                    }
                    else {
                        console.warn(`item.description failed typeguard.`);
                        console.log('item:', item);
                    }
                }
                else {
                    console.log(`Item already exist.`);
                }
            }));
        }
        else {
            console.warn(`offers failed typeguard.`);
            console.log('info:', info);
        }
    }));
});
