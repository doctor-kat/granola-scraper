import * as puppeteer from 'puppeteer';

export class Config {
    url: string;
    onLoad: string;
    container: string;
    pagination?: {
        type: string,
        loader: string,
        action: (page: puppeteer.Page) => void
    };
    fields?: {
        [field: string]: ((
            node: CheerioElement,
            $: CheerioStatic,
            scraperFn: (config: Config) => any // tslint:disable-line
        ) => any) | string // tslint:disable-line
    };
}