FROM node:12.19-buster

WORKDIR /server
RUN ls -l
RUN npm i

CMD npm run dev