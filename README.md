# granola-scraper

> granola-scraper is an aws-lambda node.js script to scrape granola-related data from google express and put it in a dynamoDB server.  It will work in conjunction with aws-api to provide a graphql endpoint.

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