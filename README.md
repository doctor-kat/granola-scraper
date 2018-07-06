# granola-scraper

> granola-scraper is an aws-lambda node.js script to scrape granola-related data from google express and put it in a dynamoDB server.  It will work in conjunction with aws-api to provide a graphql endpoint.

## Local Testing
- install serverless `npm install serverless -g`.
- install local dynamo-db `serverless dynamodb install`.
- start local server in a separate command prompt `serverless dynamodb start --migrate` (pulls table settings from serverless.yaml).
- run `serverless invoke local -f granolaScraper`.

## Use Cases
```
    What            When        Where                       View Type
1.  All Granola     today       everywhere                  List of many items
2.  Bear Naked      today       walmart, shoprite, target   List of many items
3.  Specific item   today       walmart                     Product page
4.  Specific item   all month   everywhere                  Product page
5.  Chocolate       all month   everywhere                  Detailed list of many items
```

## Table Design
### 2018-W1_2018-W52 (data range)
- date (primary)
- url (secondary)
- vendor
- description
- price
- regPrice
- value

### productInfo
- url (primary)
- brand
- name
- flavor
- size
- isNew?

## TODO
### Optimization
- reduce timeout (most wasted time)
- move binary to s3 bucket

### Readability
- refactor into lifecycle phases (setup, scrape, cleanup)
- use winston/loggly

### Documentation
- find out why tar/headless_shell works