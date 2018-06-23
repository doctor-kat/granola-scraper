import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import fs from 'fs';
import { Config } from './config/config';
import { Offer } from './config/Offer';
import { Object } from 'aws-sdk/clients/s3';
import path from 'path';
import decompress from 'decompress';
import child_process from 'child_process';

/**
 * Uses puppeteer to scrape page return an object
 * with specified parameters.  Function takes a config
 * object.
 * @param {Object} config - config file
 * @return {Object} Returns object based on config.
 */
export async function scrapePrice(config: Config): Promise<Offer[]> {
    process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'];
    const chromeZipPath = path.join(__dirname, '../chrome/stable-headless-chromium-amazonlinux-2017-03.zip');
    const chromeDirPath = path.join(path.sep, 'tmp');
    const chromePath = path.join(chromeDirPath, 'headless_shell');
    
    // // const launchPath = '/var/task/node_modules/puppeteer/lib/Launcher.js';

    await decompress(chromeZipPath, chromePath);
    
    // // console.log(`\n${child_process.execSync(`chmod -x ${chromePath}`)}`);
    // // fs.chmodSync(chromePath, 0o755);
        
    console.log(`Unzipped chrome to ${chromePath}`);

    console.log(`chrome exists? ${fs.existsSync(chromePath)}`);

    try {
        fs.accessSync(chromePath, fs.constants.R_OK);
        console.log(`read access to chrome OK`);
    } catch (err) {
        console.log(`no read access to chrome`);
    }
        
    try {
        fs.accessSync(chromePath, fs.constants.X_OK);
        console.log(`execute access to chrome OK`);
    } catch (err) {
        console.log(`no execute access to chrome`);
    }

    // console.log(`\n${child_process.execSync(`chmod -x ${launchPath}`)}`);
    
    console.log(`node version: ${child_process.execSync('npm -v npm')}`);
    
    console.log(`/ folder contents: ${fs.readdirSync(path.resolve('/'))}`);
    console.log(`\n${child_process.execSync('ls -l /')}`);
    console.log(`/tmp folder contents: ${fs.readdirSync(path.resolve('/tmp'))}`);
    console.log(`\n${child_process.execSync('ls -l /tmp')}`);
    console.log(`/var/task folder contents: ${fs.readdirSync(path.resolve('/var/task'))}`);
    console.log(`\n${child_process.execSync('ls -l /var/task')}`);

    // child_process.execFile(chromePath);

    const options: {[option: string]: puppeteer.LaunchOptions} = {
        default: {
            executablePath: chromePath,
            args: [
                '--disable-gpu',
                '--no-sandbox',
                '--homedir=/tmp',
                '--single-process',
                '--data-path=/tmp/data-path',
                '--disk-cache-dir=/tmp/cache-dir',
                '--disable-setuid-sandbox'
            ]
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
        console.log(`Launching from ${options.default.executablePath}`);
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
        const batchSize = 2;
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
