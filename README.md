# Setup for development

## Requirements

-   Node.js >= v.12.19.0
-   npm >= 6.14.11
-   docker

## Setup environment variables

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

Enter the folder `/frontend` and run the command

```
npm run serve
```

## Import database for SQL Task

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

#### postprocess

-   remove img tag: `<IMG.*/>`
-   remove URLs: `URL.*$`
-   replace watermark with bgcolor: `^.*SchemaSpy.*$` `bgcolor="transparent"`
