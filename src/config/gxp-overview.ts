import * as puppeteer from 'puppeteer';
import { Config } from './config';

/* 
takes:
    target table
    target url
    target onLoad
    target container
    pagination type
    target fields

gives:
    data for the table

*/
export const overviewConfig:Config = {
    name: 'granola overview',
    url: 'https://express.google.com/u/0/search?cat=B.528895',
    selector: "gx-product-card",
    pagination: {
        type: "infinite",
        loader: "mat-spinner",
        action: (page: puppeteer.Page) => page.keyboard.press("End"),
    },
    fields: {
        url: {
            selector: '[gxvelog="ProductCard"]',
            href: {
                attr: 'href',
                baseUrl: 'https://express.google.com'
            }
        },
        name: { selector: '.productTitle' }
    } // fields
} // export
