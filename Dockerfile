FROM mhart/alpine-node:latest

# Checks file must be in /app
ADD CHECKS /app/

# Cached npm packages layer
RUN cd /tmp; npm install
ADD package.json /tmp/package.json
RUN mkdir -p /srv/www/resonate-s3-track-server
RUN cp -a /tmp/node_modules /srv/www/resonate-s3-track-server/

WORKDIR /srv/www/resonate-s3-track-server
ADD . /srv/www/resonate-s3-track-server

# Build
RUN ["npm","run","build"]

CMD ["npm", "start"]
