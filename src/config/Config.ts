import * as puppeteer from 'puppeteer';
import { AttributeValue } from 'aws-sdk/clients/dynamodbstreams';

export class Config {
    name: string;
    browser?: puppeteer.Browser;
    url: string;
    selector: string;
    pagination?: {
        type: string,
        loader: string,
        action: (page: puppeteer.Page) => void
    };
    fields: {
        [field: string]: {
            selector: string,
            href?: {
                attr: string,
                baseUrl: string
            },
            post?: string
        }
    };
}