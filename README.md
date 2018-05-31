# granola-scraper

> granola-scraper is an aws-lambda node.js script to scrape granola-related data from google express and put it in a dynamoDB server.  It will work in conjunction with aws-api to provide a graphql endpoint.

## Local Testing
- local dynamoDB
-- [java](http://www.oracle.com/technetwork/java/javase/downloads/jre8-downloads-2133155.html)
- ts-node -g
- typescript -g

## Test in AWS Environment
### Dependencies
- Docker
-- Windows 10 Pro/Enterprise
-- [lambci docker images](https://hub.docker.com/r/lambci/lambda/) ([github](https://github.com/lambci/docker-lambda) might be latest)
- aws-sam-cli
-- python27

1. Compile code with typescript (`npm run build`) into `build` directory.
- Compile with tsc
- Copy `template.yaml` to `build` folder
2. Create hard link to `node_modules` in build directory.  This is to recreate application structure inside of `build` without polluting working directory.
3. Run `.js` files in docker instance (`npm run test`)
- Runs `sam local invoke` which uses a scheduled event.  This can be generated or piped with `sam local generate-event schedule`.
4. If everything has succeeded, docker instance will be created and output START in green text to console.


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