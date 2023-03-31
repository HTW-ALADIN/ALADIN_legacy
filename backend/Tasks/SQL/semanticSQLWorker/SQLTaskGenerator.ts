
import fs from "fs";
import { SQLDBReflection } from "./SQLDBReflection";
import { SQLParser, SQLMetaDataParser } from "./SQLParser";
import { NLGPipeline } from "./NLGPipeline";
import { IOptions } from "./types";
import { PgClient } from "../../../database/postgres/postgresDAO";
import { RNG } from "../../../helpers/NumberGenerators";
import { QueryGenerator } from "./SemanticSQLGenerator";
import { performance } from 'perf_hooks';

// const minioClient = new MinioClientWrapper();
const SQL_TASK_DB = "imdb";

interface SQLTaskDescription {
    language: string;
    parameters: IOptions;
}

const semanticSqlQueryGenerator = async (taskDescription: SQLTaskDescription) => {
    const start = performance.now();
    const { language, parameters } = taskDescription;
    const { schema, seed } = parameters;

    const sqlTaskClient = new PgClient(SQL_TASK_DB, "postgresql://admin:admin@localhost:5432/");
    const reflector = new SQLDBReflection([schema], sqlTaskClient);
    const reflection = await reflector.reflectDB();
    const parser = new SQLMetaDataParser(reflection);
    const parsedMetaData = parser.parseMetaData();
    parsedMetaData.primaryTables = ["title", "person"];
    parsedMetaData.junctionTables = ["person_profession", "title_genre", "person_title"];
    parsedMetaData.attributeTables = ["localization", "format", "name", "region", "title_name", "year", "genre", "profession"];

    const qb = new QueryGenerator(parsedMetaData, parameters, sqlTaskClient, schema, new RNG(seed));
    const query = await qb.generateQuery();

    const sqlParser = new SQLParser();
    const parsedQuery = sqlParser.parse(query, schema);

    const nlgPipeline = new NLGPipeline(language);
    const { baselineNlQuery, unMaskedNlQuery } = await nlgPipeline.translateQuery(query);
    const done = performance.now();

    return {
        query,
        parsedQuery,
        nlQuery: unMaskedNlQuery,
        baselineNlQuery,
        executionTime: done - start
    };
};


function escape(value: string): string {
    if (!['"', "\r", "\n", ","].some((e) => value.indexOf(e) !== -1)) {
        return value;
    }
    return '"' + value.replace(/"/g, '""') + '"';
}

const randomSeed = (length: number): string => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// (async () => {
//     const stream = fs.createWriteStream("queries.json", { flags: "a" });
//     // stream.write(`query, baselineQuery, nlQuery, mlQuery\n`);
//     const rng = new RNG();

//     for (let i = 0; i < 10000; i++) {
//         const parameters: IOptions = {
//             joinRange: rng.intPairBetween(0,6),
//             joinType: ["INNER JOIN"],
//             columnRange: rng.intPairBetween(1,5),
//             cardinalityType: ["1-n", "1-n?", "1?-n", "n-m", "n?-m", "n?-m?"],
//             constraintRange: rng.intPairBetween(0,5),
//             constraintType: ["numericRange", "numericComparison", "nullComparison", "stringComparison", "stringFuzzyComparison"],
//             allowAggregates: rng.trueByChanceOf(0.3),
//             aggregateType: ["AVG", "COUNT", "MAX", "MIN", "SUM"],
//             forceHavingClause: rng.trueByChanceOf(0.3),
//             forceOrderBy: rng.coinFlip(),
//             schema: "imdb2",
//             seed: randomSeed(10),
//         };
//         console.log("generatedParameters");

//         const { query, parsedQuery, nlQuery, baselineNlQuery, executionTime } = await semanticSqlQueryGenerator({
//             language: "de",
//             parameters,
//         });
//         console.log("generatedQuery");

        
//         const sqlTaskClient = new PgClient(SQL_TASK_DB, "postgresql://admin:admin@localhost:5432/");
//         let result = [];
//         try {
//             result = await sqlTaskClient.queryDB(parsedQuery.replace(";", " limit 10;"));
//         } catch (error) {
//             console.log("error");
//         }
//         console.log("fetchedResult");
    
//         if (result.length) {
//             // stream.write(`${escape(parsedQuery.replace(/\n/g, " "))},${escape(baselineNlQuery)},${escape(nlQuery)},\n`);
//             stream.write(JSON.stringify({parsedQuery, nlQuery, baselineNlQuery, parameters, executionTime, result: result.slice(0, 10)}) + "\n");
//             console.log("successful");
//         }
//         console.log(i)
//         console.log("\n");

//         // console.log(parsedQuery);
//         // console.log(nlQuery);
//         // console.log(baselineNlQuery);
//         // console.log(executionTime);
//     }
// })();