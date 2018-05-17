import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { Config } from './config/config';
import { Offer } from './config/Offer';
import { Object } from 'aws-sdk/clients/s3';


/**
 * Uses puppeteer to scrape page return an object
 * with specified parameters.  Function takes a config
 * object.
 * @param {Object} config - config file
 * @return {Object} Returns object based on config.
 */
export async function scrapePrice(config: Config): Promise<Offer[]> {
    const options: {[option: string]: puppeteer.LaunchOptions} = {
        default: {},
        debug: {
            headless: false,
            slowMo: 100,
        },
    };

    console.debug(`Starting browser...`);
    const browser = await puppeteer.launch(options.default);
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", (request) => {
        if (request.resourceType() === "image") {
            request.abort();
        } else {
            request.continue();
        }
    });
    await page.goto(config.url, {
        waitUntil: "networkidle0",
    });
    await page.waitForSelector(config.onLoad);
    console.debug(`Page loaded.`);
    let html = await page.content();

    const products = [];

    let $ = cheerio.load(html);
    let nodes = $(config.container);
    console.debug(`Found ${nodes.length} nodes.`);

    if ((config.pagination) && (config.pagination.type === "infinite")) {
        console.debug(`Resolving infinite scroll...`);
        let prevNodes: Cheerio;
        do {
            console.debug(`Now have ${nodes.length} nodes.`);
            prevNodes = nodes;
            await config.pagination.action(page);
            try {
                await page.waitForSelector(
                    config.pagination.loader, {
                        timeout: 5000,
                    }
                );
            } catch (error) {
                console.debug(`Finished scrolling (probably).`);
            }
            await page.waitForSelector(
                config.pagination.loader,
                {hidden: true}
            );
            html = await page.content();
            $ = cheerio.load(html);
            nodes = $(config.container);
        } while (nodes.length > prevNodes.length);
        console.debug(`Finished scrolling.`);
    }

    for (let i = 0; i < nodes.length; i++) {
        console.debug(`Parsing node ${i+1} of ${nodes.length}`);
        const node = nodes[i];
        const product: {[field: string]: string} = {};
        for (const field in config.fields) {
            if ({}.hasOwnProperty.call(config.fields, field)) {
                // @ts-ignore: scrapePrice 'Index signature is missing'
                const value = await config.fields[field](node, $, scrapePrice);
                if (value !== "") {
                    product[field] = value;
                    // console.log(field, product[field]);
                }
            }
        }
        products.push(product);
    }

    console.debug(`Got all products:`, products);
    browser.close();
    return products;
}
