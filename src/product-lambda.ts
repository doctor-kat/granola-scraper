import * as SPAScraper from './spa-scraper';
import { overviewConfig } from './config/gxp-overview';
import { Offer } from './config/Offer';
import * as AWSLambda from 'aws-lambda';
import { Config } from './config/config';
import { createTable, batchPutProducts, batchPutOffers } from './aws';
import * as fs from 'fs';

/**
 * lambda to be activated only by ddb stream events
 * to scrape product offer data
 */
exports.handler = async (events: AWSLambda.DynamoDBStreamEvent, context: AWSLambda.Context) => {
    console.log(`got batch of ${events.Records.length} entries`);
    console.log(JSON.stringify(events, null, 4));

    let browser: import('puppeteer').Browser;
    let offersBatch: Offer[] = [];
    let products: any = [];

    for (let record of events.Records) {
        if (record.eventName == 'REMOVE') {
            console.log(`ignoring REMOVE event`);
        } else {
            console.log(`processing ${record.dynamodb.NewImage.url.S}...`);
            if (!browser) { browser = await SPAScraper.launchBrowser(); }
            const url = record.dynamodb.NewImage.url.S;
            // console.log(`scraping product overview...`);
            const mainConfig: Config = {
                name: 'main offer',
                browser,
                url,
                selector: 'gx-product-overview',
                fields: {
                    description: { selector: '.title' },
                    price: { selector: '.effectivePrice' },
                    merchant: {
                        selector: '.soldBy',
                        post: '.text().substring(9).trim()'
                    },
                }
            }
            const additionalConfig: Config = {
                name: 'additional offers',
                browser,
                url,
                selector: '.competitiveOfferListItem',
                fields: {
                    price: { selector: '.offerPrice' },
                    merchant: { selector: '.offerMerchantName' }
                }
            }
            const offers = await SPAScraper.scrape(browser, mainConfig, additionalConfig);
            
            if (offers[0] && offers[0].price) {
                for (let offer of offers) {
                    offer.url = url;
                    offer.date = record.dynamodb.NewImage.date.S;
                    // console.log(offer);
                    offersBatch.push(offer);
                }
                
                products.push({
                    url: offers[0].url,
                    description: offers[0].description,
                    new: true
                });
                delete offers[0].description;
    
                // TODO: make synchronous
                await batchPutProducts(process.env.productsTableName, products);
            
                // TODO: make synchronous
                await batchPutOffers(process.env.dataTableName, offersBatch);
            } else {
                await browser.close();
                context.fail(`scrape for mainOffers failed...exiting (retrying)`);
            }
        } // if
    } // for
    console.log(`closing browser...`);
    await browser.close();
    const files = fs.readdirSync('/tmp');
    // console.log(files);
    for (let file of files) {
        if (file.includes('core')) {
            console.log(`deleting ${file}`);
            fs.unlinkSync(`/tmp/${file}`);
        }
    }
    // context.done();
}

// const event = require('../data/ddb-update-event.json');
// this.handler(event);