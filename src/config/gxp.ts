import * as puppeteer from 'puppeteer';
import {Config} from './config';

export const config:Config = {
    url: 'https://express.google.com/u/0/search?cat=B.528895',
    onLoad: 'gx-product-card',
    container: "gx-product-card",
    pagination: {
        type: "infinite",
        loader: "mat-spinner",
        action: (page: puppeteer.Page) => page.keyboard.press("End"),
    },
    fields: {
        data: async (node, $, scrapePrice, browser) => {
            const url =
                "https://express.google.com" +
                $('[gxvelog="ProductCard"]', node).attr("href");

            type mainInfo = Promise<{
                name: Promise<string>,
                price: Promise<string>,
                regPrice: Promise<string>,
                merchant: Promise<string>,
            }>;

            const mainData = await scrapePrice({
                browser,
                url,
                onLoad: "gx-product-page",
                container: "gx-product-overview",
                fields: {
                    name: (node, $, scrapePrice) =>
                        $(".title", node).text().trim(),
                    price: (node, $, scrapePrice) =>
                        $(".effectivePrice", node).text().trim(),
                    // regPrice: (node, $, scrapePrice) =>
                    //     $(".originalPrice", node)
                    //     .text()
                    //     .substring(14)
                    //     .trim(),
                    merchant: (node, $, scrapePrice) =>
                        $(".soldBy", node)
                        .text()
                        .substring(9)
                        .trim(),
                },
            });

            const additionalMerchants = await scrapePrice({
                browser,
                url,
                onLoad: "gx-product-page",
                container: ".competitiveOfferListItem",
                fields: {
                    price: (node, $, scrapePrice) =>
                        $(".offerPrice", node).text().trim(),
                    regPrice: (node, $, scrapePrice) =>
                        $(".offerOriginalPrice", node).text().trim(),
                    merchant: (node, $, scrapePrice) =>
                        $(".offerMerchantName", node).text().trim(),
                },
            });

            type Offer = {
                date: string,
                url: string,
                merchant: string,
                description: string,
                price: string,
                regPrice?: string,
                value?: string,
            };

            const offers: Offer[] = [];

            offers[0] = {
                date: `${new Date().getFullYear()}-${new Date().getMonth()}-${new Date().getDate()}`,
                url,
                merchant: mainData[0].merchant,
                description: mainData[0].name,
                price: mainData[0].price
            };

            if (mainData[0].regPrice) {
                offers[0].regPrice = mainData[0].regPrice;
            }

            offers.forEach((offer: Offer) => {
                offer.date = `${new Date().getFullYear()}-${new Date().getMonth()}-${new Date().getDate()}`;
                offer.url = url;
                offers.push(offer);
            });

            console.log("Returning product...", offers);
            return offers;
        },
    },
};
