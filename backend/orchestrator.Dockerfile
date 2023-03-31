FROM node:12.19-buster

RUN mkdir /backend
WORKDIR /backend
ADD package.json /backend/
# RUN npm i
# RUN npm i -g ts-node
RUN npm i -g ts-node-dev
RUN npm i -g typescript
CMD ts-node-dev --transpile-only --poll --respawn orchestrator.ts