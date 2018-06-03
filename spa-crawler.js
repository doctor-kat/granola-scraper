"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = __importDefault(require("puppeteer"));
const cheerio = __importStar(require("cheerio"));
/**
 * Uses puppeteer to scrape page return an object
 * with specified parameters.  Function takes a config
 * object.
 * @param {Object} config - config file
 * @return {Object} Returns object based on config.
 */
function scrapePrice(config) {
    return __awaiter(this, void 0, void 0, function* () {
        const options = {
            default: {
                executablePath: `./node_modules/puppeteer/.local-chromium/linux-549031/chrome-linux/chrome`,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            },
            debug: {
                headless: false,
                slowMo: 100,
            },
        };
        let browser;
        let isInstance = false;
        if (config.browser !== undefined) {
            console.log(`Existing browser instance found.`);
            isInstance = true;
            browser = config.browser;
        }
        else {
            console.log(`Starting browser...`);
            browser = yield puppeteer_1.default.launch(options.default);
        }
        const page = yield browser.newPage();
        yield page.setRequestInterception(true);
        page.on("request", (request) => {
            if (request.resourceType() === "image") {
                request.abort();
            }
            else {
                request.continue();
            }
        });
        yield page.goto(config.url, {
            waitUntil: "domcontentloaded",
        });
        yield page.waitForSelector(config.onLoad);
        console.log(`Page loaded.`);
        let html = yield page.content();
        const products = [];
        let $ = cheerio.load(html);
        let nodes = $(config.container);
        console.log(`Found ${nodes.length} nodes.`);
        if ((config.pagination) && (config.pagination.type === "infinite")) {
            console.log(`Resolving infinite scroll...`);
            let prevNodes;
            do {
                console.log(`Now have ${nodes.length} nodes.`);
                prevNodes = nodes;
                yield config.pagination.action(page);
                try {
                    yield page.waitForSelector(config.pagination.loader, {
                        timeout: 5000,
                    });
                }
                catch (error) {
                    console.log(`Finished scrolling (probably).`);
                }
                yield page.waitForSelector(config.pagination.loader, { hidden: true });
                html = yield page.content();
                $ = cheerio.load(html);
                nodes = $(config.container);
            } while (nodes.length > prevNodes.length);
            console.log(`Finished scrolling.`);
        }
        if (nodes.length > 0) {
            const batchSize = 10;
            for (let i = 0; i < nodes.length; i++) {
                console.log(`Parsing node ${i + 1} of ${nodes.length}`);
                const node = nodes[i];
                const product = {};
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
                    console.log(`Waiting for all products to resolve...`);
                    yield Promise.all(products.map(product => product.data));
                }
            }
        }
        console.log(`Got all products:`, products);
        yield Promise.all(products.map(product => product.data));
        if (isInstance) {
            console.log(`Closing page...`);
            page.close();
        }
        else {
            console.log(`Closing browser...`);
            browser.close();
        }
        return products;
    });
}
exports.scrapePrice = scrapePrice;
