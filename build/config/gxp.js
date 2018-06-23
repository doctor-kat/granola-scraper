"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = {
    url: 'https://express.google.com/u/0/search?cat=B.528895',
    onLoad: 'gx-product-card',
    container: "gx-product-card",
    pagination: {
        type: "infinite",
        loader: "mat-spinner",
        action: (page) => page.keyboard.press("End"),
    },
    fields: {
        data: (node, $, scrapePrice, browser) => __awaiter(this, void 0, void 0, function* () {
            const url = "https://express.google.com" +
                $('[gxvelog="ProductCard"]', node).attr("href");
            const mainData = yield scrapePrice({
                browser,
                url,
                onLoad: "gx-product-page",
                container: "gx-product-overview",
                fields: {
                    name: (node, $, scrapePrice) => $(".title", node).text().trim(),
                    price: (node, $, scrapePrice) => $(".effectivePrice", node).text().trim(),
                    // regPrice: (node, $, scrapePrice) =>
                    //     $(".originalPrice", node)
                    //     .text()
                    //     .substring(14)
                    //     .trim(),
                    merchant: (node, $, scrapePrice) => $(".soldBy", node)
                        .text()
                        .substring(9)
                        .trim(),
                },
            });
            const additionalMerchants = yield scrapePrice({
                browser,
                url,
                onLoad: "gx-product-page",
                container: ".competitiveOfferListItem",
                fields: {
                    price: (node, $, scrapePrice) => $(".offerPrice", node).text().trim(),
                    regPrice: (node, $, scrapePrice) => $(".offerOriginalPrice", node).text().trim(),
                    merchant: (node, $, scrapePrice) => $(".offerMerchantName", node).text().trim(),
                },
            });
            const offers = [];
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
            offers.forEach((offer) => {
                offer.date = `${new Date().getFullYear()}-${new Date().getMonth()}-${new Date().getDate()}`;
                offer.url = url;
                offers.push(offer);
            });
            console.log("Returning product...", offers);
            return offers;
        }),
    },
};
