# !! NOTE !! This is the legacy ALADIN application, the code has been transfered to their respective repositories. See CARPET and LOOM for the frontend code and ALADIN for the backend code.

# Setup for development

## Requirements

- Node.js >= v.12.19.0
- npm >= 6.14.11
- docker

## Setup environment variables

Enter folder 'backend' and create a file `.env` with the following content:

```bash
brokerConnection=amqp://guest:guest@rabbitmq:5672
mongooseConnection=mongodb://admin:admin@localhost:27017/?authSource=admin
postgresConnection=postgresql://admin:admin@postgres:5432
MINIO_ACCESS_KEY=minio_access_key
MINIO_SECRED_KEY=minio_secret_key

HUGGINGFACE_TOKEN=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
```

Enter folder 'server' and create a file `.env` with the following content:

```bash
AMQP_BROKER=amqp://guest:guest@rabbitmq:5672
MONGODBCONNECTION=user:user@mongodb:27017
APIHOST=reverse-proxy:80
PORT=8000

DB_HOST=localhost
DB_NAME=ltidb
DB_USER=aladin
DB_PASS=aladin
LTI_KEY=opaladin
```

## Install dependencies

Enter the folders `/backend`, `/server`, `/frontend` and each execute the following command:

```
npm i
```

## Run application

In the root folder `/` execute the command

```
docker-compose up
```

This handles the entire backend including all required services, as well as the webserver and reverse-proxy.

Enter the folder `/frontend` and run the command

```
npm run serve
```

This starts the frontend application as a development server. This is not intended for production use.

## Import database for SQL Task

Dumps are available under [Google Drive]().

### copy sql-dump to container

```
docker cp airport.sql cfef5a3c93b1:airport.sql
```

### ssh to container

```
docker exec -it cfef5a3c93b1 bash
```

### import dump via cli

```
psql -d test -U admin -f airport.sql
```

### create schema

```
java -jar schemaspy-6.1.0.jar -vizjs -t pgsql -s sports -db test -u admin -p admin -host localhost -o ./temp -dp postgresql-42.2.18.jar
```

#### postprocess pregenerated schemas

- remove img tag: `<IMG.*/>`
- remove URLs: `URL.*$`
- replace watermark with bgcolor: `^.*SchemaSpy.*$` `bgcolor="transparent"`
