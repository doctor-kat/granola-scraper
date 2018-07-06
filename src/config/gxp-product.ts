import { Config } from "./config";

export const mainConfig: Config = {
    name: 'main offer',
    url: null,
    selector: 'gx-product-overview',
    fields: {
        // name: { selector: '.title' },
        price: { selector: '.effectivePrice' },
        merchant: {
            selector: '.soldBy',
            post: '.text().substring(9).trim()'
        },
    }
}

export const additionalConfig: Config = {
    name: 'additional offers',
    url: null,
    selector: '.competitiveOfferListItem',
    fields: {
        price: { selector: '.offerPrice' },
        merchant: { selector: '.offerMerchantName' }
    } 
}