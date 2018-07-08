import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

import { createS3Request } from './aws';
import fs from 'fs';
import tar from 'tar';
import path from 'path';
import child_process from 'child_process';

import { Config } from './config/config';
import { Offer } from './config/offer';
import { AnalysisOptions } from 'aws-sdk/clients/cloudsearch';

/**
 * uses puppeteer to scrape page return an array of maps.
 * @param {puppeteer.Browser} b existing browser instance to reuse
 * @param {Config[]} configs array of config files with selector details
 * @return {Offer[]} returns array of maps based on configuration
 */
export async function scrape(b?: puppeteer.Browser, ...configs: Config[]): Promise<Offer[]> {
    let browser = await launchBrowser(b);
    let existingBrowser = browser ? true : false;

    const page = await browser.newPage();
    await blockImageLoading(page);
    await page.goto(configs[0].url, {
        waitUntil: 'networkidle2',
    });
    let title = await page.title();
    console.log(`Page loaded: (${title})`);
    
    const products = [];
    
    for (let config of configs) {
        try {
            console.log(`scraping ${config.name}...`);
            await page.waitForSelector(config.selector);
            let html = await page.content();

            let $: CheerioStatic, nodes: Cheerio;
    
            if ((config.pagination) && (config.pagination.type === "infinite")) {
                console.log(`resolving infinite scroll...`);
                let prevNodes: Cheerio;
        
                do {
                    prevNodes = nodes ? nodes : cheerio.load(html)('body');
                    html = await page.content();
                    $ = cheerio.load(html);
                    nodes = $(config.selector);
                    console.log(`found ${nodes.length} nodes...`);
    
                    await config.pagination.action(page);
                    try {
                        await page.waitForSelector(
                            config.pagination.loader, {
                                timeout: 5000,
                            }
                        );
                    } catch (error) {
                        // console.log(`finished scrolling`);
                    }
                    await page.waitForSelector(
                        config.pagination.loader,
                        {hidden: true}
                    );
                } while (nodes.length > prevNodes.length);
                // } while (false);
                console.log(`finished scrolling`);
            } else {
                $ = cheerio.load(html);
                nodes = $(config.selector);
                console.log(`found ${nodes.length} nodes...`);
            
                if (nodes.length == 0) {
                    console.error(`no nodes...exiting...`);
                    process.exit(-1);
                }    
            }
        
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                // console.log('node:', node);
                const product: {[field: string]: string} = {};
                
                // find the data in the fields, then push to 'product'
                const fields = config.fields;
                for (const field in fields) {
                    let value:any = $(fields[field].selector, node);
                    if (fields[field].href) {
                        product[field] = fields[field].href.baseUrl + value.attr(fields[field].href.attr);
                    } else if (fields[field].post) {
                        product[field] = eval(`value${fields[field].post}`);
                    } else {
                        product[field] = value.text().trim();
                    }
                }
                console.log(product);
                products.push(product);
            }
        } catch (err) {
            console.log(`selector didn't return anything`);
        }        
    }
    
    if (existingBrowser) {
        console.log(`closing page...`);
        await page.close();
    } else {
        console.log(`closing browser...`)
        await browser.close();
        const files = fs.readdirSync('/tmp');
        for (let file in files) {
            if (file != 'headless_shell') {
                console.log(`deleting ${file}`);
                fs.unlinkSync(`/tmp/${file}`);
            }
        }
    }
    return products;
} 

export async function launchBrowser(browser?: puppeteer.Browser): Promise<puppeteer.Browser> {
    if (browser) {
        const pages = await browser.pages();
        const version = await browser.version();
        console.log(`reusing browser ${version} with ${pages.length} pages open`);
        return browser;
    } else if (process.platform === "win32") {
        console.log(`windows environment detected...`);
        return puppeteer.launch({headless: false, slowMo: 100});
    } else {
        // const chromeZipPath = path.join(__dirname, '../chrome/headless_shell.tar.gz');
        const chromeDirPath = path.join(path.sep, 'tmp');
        const chromePath = path.join(chromeDirPath, 'headless_shell');
        const options: {[option: string]: puppeteer.LaunchOptions} = {
            default: {
                headless: true,
                executablePath: chromePath,
                args: [
                    '--disable-gpu',
                    '--no-sandbox',
                    '--single-process',
                    '--disable-dev-shm-usage',
                ]
            },
            debug: {
                headless: false,
                slowMo: 100,
            },
        };

        if (!fs.existsSync(chromePath)) {
            await setupS3Chrome(chromeDirPath);
            console.log(`/tmp folder contents:\n${child_process.execSync('ls -l /tmp')}`);
        } else {
            console.log(`browser already unzipped`);
        }
       
        console.log(`launching browser...`);
        return puppeteer.launch(options.default);
    }
}

async function blockImageLoading(page: puppeteer.Page) {
    await page.setRequestInterception(true);
    page.on("request", (request) => {
        if (request.resourceType() === "image") {
            request.abort();
        } else {
            request.continue();
        }
    });
}

// https://github.com/sambaiz/puppeteer-lambda-starter-kit/blob/master/src/starter-kit/setup.js
function setupS3Chrome(destination: string) {
    const chromeBucketName: string = process.env.chromeBucketName;
    const chromeFileName: string = process.env.chromeFileName;

    return new Promise((resolve, reject) => {
        createS3Request(chromeBucketName, chromeFileName)
            .createReadStream()
            .on('error', (err) => reject(err))
            .pipe(tar.x({
                C: destination,
            }))
            .on('error', (err) => reject(err))
            .on('end', () => {
                console.log(`extracted chrome to ${destination}`);
                resolve();
            });
    });
} // function

// import { overviewConfig } from './config/gxp-main';
// spaScraper(overviewConfig);