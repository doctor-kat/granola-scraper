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
        default: {
            executablePath: `./node_modules/puppeteer/.local-chromium/linux-549031/chrome-linux/chrome`,
        },
        debug: {
            headless: false,
            slowMo: 100,
        },
    };

    let browser: puppeteer.Browser;
    let isInstance: boolean = false;
    if (config.browser !== undefined) {
        console.log(`Existing browser instance found.`)
        isInstance = true;
        browser = config.browser;
    } else {
        console.log(`Starting browser...`);
        browser = await puppeteer.launch(options.default);
    }
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
        waitUntil: "domcontentloaded",
    });
    await page.waitForSelector(config.onLoad);
    console.log(`Page loaded.`);
    let html = await page.content();

    const products = [];

    let $ = cheerio.load(html);
    let nodes = $(config.container);
    console.log(`Found ${nodes.length} nodes.`);

    if ((config.pagination) && (config.pagination.type === "infinite")) {
        console.log(`Resolving infinite scroll...`);
        let prevNodes: Cheerio;
        do {
            console.log(`Now have ${nodes.length} nodes.`);
            prevNodes = nodes;
            await config.pagination.action(page);
            try {
                await page.waitForSelector(
                    config.pagination.loader, {
                        timeout: 5000,
                    }
                );
            } catch (error) {
                console.log(`Finished scrolling (probably).`);
            }
            await page.waitForSelector(
                config.pagination.loader,
                {hidden: true}
            );
            html = await page.content();
            $ = cheerio.load(html);
            nodes = $(config.container);
        } while (nodes.length > prevNodes.length);
        console.log(`Finished scrolling.`);
    }

    if (nodes.length > 0) {
        const batchSize = 10;
        for (let i = 0; i < nodes.length; i++) {
            console.log(`Parsing node ${i+1} of ${nodes.length}`);
            const node = nodes[i];
            const product: {[field: string]: string} = {};
            for (const field in config.fields) {
                if ({}.hasOwnProperty.call(config.fields, field)) {
                    // @ts-ignore: scrapePrice 'Index signature is missing'
                    let value = config.fields[field](node, $, scrapePrice, browser);
                    // if (value !== "") {
                        product[field] = value;
                    //     console.log(field, product[field]);
                    // }
                }
            }
            products.push(product);
            if ((i % batchSize) == 0) {
                console.log(`Waiting for all products to resolve...`)
                await Promise.all(products.map(product => product.data));
            }
        }
    }

    console.log(`Got all products:`, products);
    await Promise.all(products.map(product => product.data));
    if (isInstance) {
        console.log(`Closing page...`)
        page.close();
    } else {
        console.log(`Closing browser...`)
        browser.close();
    }
    return products;
}
