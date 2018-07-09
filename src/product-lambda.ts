import * as SPAScraper from './spa-scraper';
import { overviewConfig } from './config/gxp-overview';
import { Offer } from './config/offer';
import * as AWSLambda from 'aws-lambda';
import { Config } from './config/config';
import { createTable, batchPutProducts, batchPutOffers } from './aws';
import * as fs from 'fs';

/**
 * lambda to be activated only by ddb stream events
 * to scrape product offer data
 */
exports.handler = async (events: AWSLambda.DynamoDBStreamEvent, context: AWSLambda.Context) => {
    // console.log(`got batch of ${events.Records.length} entries`);
    console.log(`Got Event:\n${JSON.stringify(events, null, 4)}`);

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
            
            if (offers[0] && offers[0].description) {
                if (offers[0].price) {
                    for (let offer of offers) {
                        offer.url = url;
                        offer.date = record.dynamodb.NewImage.date.S;
                        // console.log(offer);
                        offersBatch.push(offer);
                    }
                    
                    const description = offers[0].description;
                    if (typeof description == 'string') {
                        try {
                            products.push({
                                url: offers[0].url,
                                name: description.split(',')[0],
                                flavor: description.split(/,|-/)[1].trim(),
                                size: description.split(/,|-/)[2].substring(1, description.split(/,|-/)[2].indexOf('oz')+2),
                                package: description.split('oz')[1].trim(),
                                new: true
                            });
                        } catch {
                            products.push({
                                url: offers[0].url,
                                description,
                                new: true
                            });
                        } finally { delete offers[0].description; }
                    }
        
                    // TODO: make synchronous
                    await batchPutProducts(process.env.productsTableName, products);
                
                    // TODO: make synchronous
                    await batchPutOffers(process.env.dataTableName, offersBatch);
                } else {
                    console.log(`Item not available in area...exiting`);
                    await cleanup(browser);
                    context.done();
                } // if offer.price
            } else {
                console.log(offers);
                await cleanup(browser);
                context.fail(`scrape for mainOffers failed...exiting (retrying)`);
            } // if offers
        } // if != REMOVE
    } // for
    console.log(`closing browser...`);
    await cleanup(browser);
    context.succeed(`Completed request in ${90*1000 - context.getRemainingTimeInMillis()}ms`);
}

async function cleanup(browser?: import('puppeteer').Browser) {
    if (browser) { await browser.close(); }
    const files = fs.readdirSync('/tmp');
    for (let file of files) {
        if (file.includes('core')) {
            console.log(`deleting ${file}`);
            fs.unlinkSync(`/tmp/${file}`);
        }
    }
}

// const event = require('../data/ddb-update-event.json');
// this.handler(event);