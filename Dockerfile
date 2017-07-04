FROM node:6-alpine

ADD common /app/common
ADD seed /app/seed
ADD server /app/server

ADD package.json /app
ADD tracker.js /app

RUN cd /app; npm install

ENV NODE_ENV production
ENV PORT 8080
EXPOSE 8080

WORKDIR "/app"
CMD [ "npm", "start" ]
