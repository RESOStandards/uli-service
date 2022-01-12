FROM node:15.0.1-alpine
WORKDIR /usr/src/app
COPY package.json /usr/src/app
COPY yarn.lock /usr/src/app
RUN apk update \
    && apk add --no-cache --virtual .gyp \
        python \
        make \
        g++ \
    && yarn install \
    && apk del .gyp
COPY . /usr/src/app 
EXPOSE 3000 5678 
