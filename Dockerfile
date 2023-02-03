FROM node:18-alpine3.17
WORKDIR /usr/src/app
COPY package.json /usr/src/app
COPY yarn.lock /usr/src/app
RUN apk update \
    && apk add --no-cache --virtual .gyp \
    python3 \
    make \
    g++ \
    git \
    && yarn install --check-files \
    && apk del .gyp
COPY . /usr/src/app 
EXPOSE 3000 5678 