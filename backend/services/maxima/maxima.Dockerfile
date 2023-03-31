FROM node:12

# install node as described here for a more modern version (https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-16-04)
# RUN curl -sL https://deb.nodesource.com/setup_8.x -o nodesource_setup.sh
# RUN bash nodesource_setup.sh
# RUN apt-get -y install nodejs
# RUN ln -s /usr/bin/nodejs /usr/bin/node
# RUN apt-get -y install npm

# helpfull links
# https://github.com/andrejv/maxima/blob/master/INSTALL
# https://github.com/maths/moodle-qtype_stack/blob/master/doc/en/Installation/Maxima.md
# https://translate.googleusercontent.com/translate_c?depth=1&hl=de&prev=search&pto=aue&rurl=translate.google.com&sl=en&sp=nmt4&u=https://github.com/hwborchers/rmaxima&usg=ALkJrhh-g32eFh6x0llvdonFEZ2TGJqQNA

# # download and compile lisp (sbcl) from source
# RUN wget http://downloads.sourceforge.net/project/sbcl/sbcl/1.3.1/sbcl-1.3.1-source.tar.bz2
# RUN tar -xf sbcl-1.3.1-source.tar.bz2
# WORKDIR /worker/sbcl-1.3.1
# RUN ./make-config.sh
# RUN ./make.sh
# RUN ./install.sh
# WORKDIR /worker

# update and install distro dependencies
RUN apt-get update
RUN apt-get -y install texinfo
RUN apt-get -y install curl
RUN apt-get -y install build-essential
RUN apt-get -y install libssl-dev
RUN apt-get -y install sbcl
RUN apt-get -y install wget bzip2 autotools-dev time
RUN apt-get -y install python3.3

# install npm dependencies
RUN mkdir /worker
WORKDIR /worker
RUN npm i -g ts-node typescript rabbitmq-rpc-wrapper amqplib @types/amqplib
RUN npm i ts-node typescript rabbitmq-rpc-wrapper amqplib @types/amqplib
COPY package.json package.json 
COPY tsconfig.json tsconfig.json
RUN npm i

# download and compile maxima from source
RUN wget https://sourceforge.net/projects/maxima/files/Maxima-source/5.44.0-source/maxima-5.44.0.tar.gz/download
RUN tar -xf download

WORKDIR /worker/maxima-5.44.0
RUN ./configure --with-scbl
RUN make
RUN make install
WORKDIR /worker

# CMD ts-node MaximaWorker.ts

# keep alive for debugging

CMD tail -f /dev/null