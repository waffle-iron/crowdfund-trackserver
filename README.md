[![Stories in Ready](https://badge.waffle.io/resonatecoop/crowdfund-trackserver.png?label=ready&title=Ready)](https://waffle.io/resonatecoop/crowdfund-trackserver)
# S3 Track Server for the Resonate Crowdfunding Player

Basic server that fetches uploaded tracks from our S3 backend, and outputs them in the correct format for the [crowdfund player](https://github.com/resonatecoop/resonate-crowdfund-player).

It uses koa@next, webpack, babel and pm2 for the basics. Both the aws-sdk and knox packages for handling S3 access.


### Development

* Run `npm install`
* Run `npm run build` to build the dist folder
* Run `npm start` or `pm2 start dist/app-bundle.js`
* Open or `curl -v -H 'X-Requested-With: XMLHttpRequest'` the following: `http://localhost:5000/tracklist`
* Hope to see some results

### Environmental Variables

Make sure the environmental variables are correctly loaded. A sample for an `.env` file is provided, this will be automatically read if not set otherwise.

* `AWS_ACCESS_KEY_ID`
* `AWS_SECRET_ACCESS_KEY`
* `AWS_S3_REGION`
* `AWS_S3_BUCKET_NAME`

For local development, override allowed origin:

* `ALLOWED_ORIGIN=*`


### Docker

A Dockerfile is provided for easy setup.

[![JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)
