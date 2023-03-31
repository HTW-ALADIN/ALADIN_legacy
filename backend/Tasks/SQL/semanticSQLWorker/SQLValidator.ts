import { PgClient } from "../../../database/postgres/postgresDAO";
import { errorCodes } from "../pgErrorCodes";

const SQL_TASK_DB = "imdb";

interface SQLTaskValidationDescription {
    parameters: {
        schema: string;
        query: string;
        expectedResult: object;
    };
}

const levenshtein = (a: string, b: string) => {
    let alen = a.length;
    let blen = b.length;
    if (alen === 0) return blen;
    if (blen === 0) return alen;
    let tmp, i, j, prev, val, row, ma, mb, mc, md, bprev;
    if (alen > blen) {
        tmp = a;
        a = b;
        b = tmp;
    }
    row = new Int8Array(alen + 1);
    // init the row
    for (i = 0; i <= alen; i++) {
        row[i] = i;
    }
    // fill in the rest
    for (i = 1; i <= blen; i++) {
        prev = i;
        bprev = b[i - 1];
        for (j = 1; j <= alen; j++) {
            if (bprev === a[j - 1]) {
                val = row[j - 1];
            } else {
                ma = prev + 1;
                mb = row[j] + 1;
                mc = ma - ((ma - mb) & ((mb - ma) >> 7));
                md = row[j - 1] + 1;
                val = mc - ((mc - md) & ((md - mc) >> 7));
            }
            row[j - 1] = prev;
            prev = val;
        }
        row[alen] = prev;
    }
    return row[alen];
};

const fuzzyEqual = (a: { [key: string]: any }, b: { [key: string]: any }, maxDifference: number): boolean => {
    const keys = Object.keys,
        ta = typeof a,
        tb = typeof b;
    const truth =
        a && b && ta === "object" && ta === tb
            ? keys(a).length === keys(b).length &&
              keys(a).every(
                  (aKey, index) =>
                      levenshtein(aKey.toLowerCase(), keys(b)[index].toLowerCase()) <= maxDifference &&
                      fuzzyEqual(a[aKey], b[keys(b)[index]], maxDifference)
              )
            : a === b;
    return truth;
};


export const semanticSqlQueryValidator = async (taskDescription: SQLTaskValidationDescription) => {
    const { schema, query, expectedResult } = taskDescription.parameters;
    const parsedExpectedResult = expectedResult;

    const allowedDeviation = 8;

    const sqlTaskClient = new PgClient(SQL_TASK_DB, "postgresql://admin:admin@localhost:5432/");
    let userResult;
    let isMatchingResult: boolean = false;
    try {
        // setting schema to be able to access the proper tables - postgres-specific, default is 'public'
        // avoids having to prefix every table with the schema as a user
        await sqlTaskClient.queryDB(`SET search_path TO '${schema}';`);
        userResult = await sqlTaskClient.queryDB(query);
        isMatchingResult = fuzzyEqual(parsedExpectedResult, userResult, allowedDeviation);
    } catch (error) {
        const { code, position, severity } = error as { code: string; position: string; severity: string };
        userResult = `${severity} @ position ${position}: ${errorCodes[code]}`;
    } finally {
        return { isMatchingResult, userResult };
    }
};

class SQLQueryValidator {
    constructor () {}

    public validateResultSet() {}
}