FROM mhart/alpine-node:latest

# Cached npm packages layer
ADD package.json /src/package.json
RUN cd /src && npm install
RUN mkdir -p /srv/www/resonate-s3-track-server
RUN cp -a /src/node_modules /srv/www/resonate-s3-track-server/

WORKDIR /srv/www/resonate-s3-track-server
ADD . /srv/www/resonate-s3-track-server

# Build
RUN ["npm","run","build"]

CMD ["npm", "start"]
