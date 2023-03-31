import { parse, Statement, astVisitor, toSql, SelectedColumn, SelectFromStatement, Expr, ExprCall } from 'pgsql-ast-parser';
import { SQLDBReflection } from "./SQLDBReflection";
import {
    ITypeMap,
    IMetaData,
    Await,
    IParsedTable,
    IParsedForeignKeys,
    IParsedPrimaryKey,
    IStructuredQuery,
    IJoinInstruction,
    IOrderByColumns,
    IColumns,
    IHavingClause,
    IConstraintColumns,
    IAliasDictionary,
    ConstituentCounts,
    queryConstituents,
    isQueryConstituent,
    SubJoinType,
    subJoins,
    isInTypeArray,
    AggregateType
} from "./types";

export interface ParseOptions {
    /**
     *  [Advanced usage only] This allows to parse sub-expressions, not necessarily full valid statements.
     *  For instance, `parse('2+2', {entry: 'expr'})`  will return the AST of the given expression (which is not a valid statement)
     */
    entry?: string;
    /** If true, then a detailed location will be available on each node */
    locationTracking?: boolean;
}

export interface SQLConstituents {
    SELECT: {
        COL: Array<SelectedColumn>
    }
}

/**
 * Parses SQL statements into AST representation and vice versa.
 * Allows for Traversal of the AST.
 * Specifically parsing SQL statements in the Postgres dialect.
 */
export class SQLParser {
    constructor () {}
    /**
     * Parses multiple SQL-statements into, and returns, their AST representations.
     * Each SQL-string must be terminated by a ";".
     * @param sqlStatements Array<string>
     * @returns Array<Statement>
     */
    public parseSQLToAST(sqlStatements: Array<string>, parseOptions: ParseOptions = {}): Array<Statement> {
        const concatenatedStatements = sqlStatements.join("\n")
        return parse(concatenatedStatements, parseOptions);
    }

    public retrieveConstituentCounts(ast: Statement): ConstituentCounts {
        const constituentCounts: ConstituentCounts = queryConstituents.reduce((constituentCounts, queryConstituent) => {
            if (isQueryConstituent(queryConstituent)) {
                constituentCounts[queryConstituent] = 0;
            }
            return constituentCounts;
        }, {} as ConstituentCounts)

        const tables = new Set();

        const visitor = astVisitor(map => ({
            // implement here AST parts you want to hook
            statement: (s) => {
                console.dir(s, {depth: null});

                const constituents = [
                    "groupBy",
                    "orderBy",
                    "where",
                    "having"
                ] as unknown as Array<keyof SelectFromStatement>;

                const Is = s as SelectFromStatement;
                constituents.forEach((constituent) => {
                    if (Is.hasOwnProperty(constituent)) {
                        Is[constituent]
                    }
                });
            },
        
            selectionColumn: t => {
                constituentCounts["COLUMNS"]++;
                if (Object.keys(t.expr).includes("function")) {
                    const column = t.expr as ExprCall;
                    constituentCounts[column.function.name.toUpperCase() as AggregateType]++;
                }
            },
            tableRef: t => tables.add(t.name),
            join: t => {
                constituentCounts[t.type as SubJoinType]++;
                constituentCounts["JOINS"]++;
                // call the default implementation of 'join'
                // this will ensure that the subtree is also traversed.
                map.super().join(t);
            },

        }));

        visitor.statement(ast);
        // console.log(joins,tables);
        constituentCounts["TABLES"] = tables.size;
        
        return constituentCounts;
    }

    public parseASTToSQL(sqlStatements: Array<Statement>): Array<string> {
        return sqlStatements.map(sqlStatement => toSql.statement(sqlStatement));
    }

    /**
     * Parse internal generation format (IStructuredQuery) to SQL query string.
     * @param IStructuredQuery IStructuredQuery
     * @param schema string
     * @returns 
     */
    public parse({ columns, join, whereClause, groupBy, havingClause, orderBy, aliasDictionary }: IStructuredQuery, schema: string) {
        const selectStatement = this.parseColumns(columns, aliasDictionary);
        const joinStatement = this.parseJoin(join, schema, aliasDictionary);
        const whereStatement = this.parseWhereClause(whereClause, aliasDictionary);
        const groupByStatement = this.parseGroupBy(groupBy, aliasDictionary);
        const havingStatement = this.parseHavingClause(havingClause, aliasDictionary);
        const orderByStatement = this.parseOrderBy(orderBy, aliasDictionary);

        return `${[selectStatement, joinStatement, whereStatement, groupByStatement, havingStatement, orderByStatement]
            .filter((statement) => !!statement)
            .join("\n")
            .replace("/^s*\n/gm", "")};`;

        // return `${selectStatement} ${joinStatement} ${whereStatement} ${groupByStatement} ${havingStatement} ${orderByStatement};`;
    }

    private parseColumns(columns: IColumns, aliasDictionary: IAliasDictionary) {
        const flattenedColumns = Object.entries(columns).reduce((flattened, [table, columns]) => {
            const alias = aliasDictionary[table];
            const columnsPerTable = columns.map((column) => {
                const { name, aggregation } = column;
                if (aggregation) return `${aggregation}(${alias}."${name}")`;
                return `${alias}."${name}"`;
            });
            return [...flattened, ...columnsPerTable];
        }, []);
        return "SELECT " + flattenedColumns.join(", ");
    }

    private parseJoin({ table, path }: IJoinInstruction, schema: string, aliasDictionary: IAliasDictionary) {
        const alias = aliasDictionary[table];
        let firstAlias = alias;
        const seenAlias = [firstAlias];
        const joins = path.map((edge) => {
            const { table, columns, type } = edge;
            const secondAlias = aliasDictionary[table];
            const { source, target } = columns;

            let statement = `${type} ${schema}."${table}" as ${secondAlias}\nON ${firstAlias}."${target}" = ${secondAlias}."${source}"`;
            // if (type === "CROSS JOIN") {
            //     statement = `${type} ${schema}.${table} as ${secondAlias}`;
            // }

            if (seenAlias.includes(secondAlias)) {
                statement = `${type} ${schema}."${table}"\nON ${firstAlias}."${target}" = ${secondAlias}."${source}"`;
                // if (type === "CROSS JOIN") {
                //     statement = `${type} ${schema}.${table}`;
                // }
            }

            firstAlias = secondAlias;
            seenAlias.push(secondAlias);
            return statement;
        });
        return `FROM ${schema}."${table}" as ${alias}\n${joins.join("\n")}`;
    }

    private parseWhereClause(columns: IConstraintColumns, aliasDictionary: IAliasDictionary) {
        const flattened = Object.entries(columns).reduce((flattened, [table, columnsPerTable]) => {
            const alias = aliasDictionary[table];
            const columns = columnsPerTable.map((column) => {
                const { constraint, conjunction, name } = column;
                const { operator, values } = constraint;

                let operatorStatement = `${operator} '${values[0]}'`;
                if (operator === "BETWEEN") {
                    operatorStatement = `BETWEEN '${values[0]}' AND '${values[1]}'`;
                } else if (/NULL/i.test(operator)) {
                    operatorStatement = `${operator}`;
                }

                const statement = `${alias}."${name}" ${operatorStatement} ${conjunction}`;
                return statement;
            });

            return [...flattened, ...columns];
        }, []);

        if (!flattened.length) return "";

        const joined = flattened.join(" ");
        const dispensableConjunctionIndex = joined.lastIndexOf(" ");
        const constraints = joined.substring(0, dispensableConjunctionIndex);

        return `WHERE ${constraints}`;
    }

    private parseGroupBy(groupBy: IColumns, aliasDictionary: IAliasDictionary) {
        const flattened = Object.entries(groupBy).reduce((flattened, [table, columnsPerTable]) => {
            const alias = aliasDictionary[table];
            const columns = columnsPerTable.map((column) => `${alias}."${column.name}"`);

            return [...flattened, ...columns];
        }, []);

        if (!flattened.length) return "";

        const groupByColumns = flattened.join(", ");

        return `GROUP BY ${groupByColumns}`;
    }

    private parseHavingClause(havingClause: IHavingClause, aliasDictionary: IAliasDictionary) {
        const flattened = Object.entries(havingClause).reduce((flattened, [table, constraints]) => {
            const alias = aliasDictionary[table];
            const columns = constraints.map((column) => {
                // TODO, possibly add conjunction for multiple constraints
                const { constraint, aggregation, name } = column;
                const { operator, values } = constraint;

                let operatorStatement = `${operator} '${values[0]}'`;
                if (operator === "BETWEEN") {
                    operatorStatement = `BETWEEN '${values[0]}' AND '${values[1]}'`;
                }

                const statement = `${aggregation}(${alias}."${name}") ${operatorStatement}`;
                return statement;
            });

            return [...flattened, ...columns];
        }, []);

        if (!flattened.length) return "";

        const joined = flattened.join(" ");
        // TODO, possibly add conjunction for multiple constraints
        // const dispensableConjunctionIndex = joined.lastIndexOf(" ");
        // const constraints = joined.substring(0, dispensableConjunctionIndex);

        return `HAVING ${joined}`;
    }

    private parseOrderBy(orderBy: IOrderByColumns, aliasDictionary: IAliasDictionary) {
        const flattened = Object.entries(orderBy).reduce((flattened, [table, columnsPerTable]) => {
            const alias = aliasDictionary[table];
            const columns = columnsPerTable.map((column) => `${alias}."${column.name}" ${column.orderBy}`);

            return [...flattened, ...columns];
        }, []);

        if (!flattened.length) return "";

        const orderByColumns = flattened.join(", ");

        return `ORDER BY ${orderByColumns}`;
    }
}

export class SQLMetaDataParser {
    private typeMap: ITypeMap = {
        number: ["real", "int", "decimal", "numeric", "double", "precision", "serial"],
        string: ["char", "text"],
        date: ["date", "time", "interval"],
        boolean: ["boolean"],
        uuid: ["uuid"],
        binary: ["bytea"],
        currency: ["money"],
    };

    constructor(private metadata: Await<ReturnType<SQLDBReflection["reflectDB"]>>) {}

    public parseMetaData(): IMetaData {
        const tables = this.parseTables();
        const foreignKeys = this.parseForeignKeys(tables);
        const primaryKeys = this.parsePrimaryKeys();
        return { tables, foreignKeys, primaryKeys };
    }

    private harmonizeType(dataType: string) {
        for (const [harmonizedType, patterns] of Object.entries(this.typeMap)) {
            for (const pattern of patterns) {
                const isHarmonizedType = new RegExp(pattern, "i").test(dataType.toLowerCase());
                if (isHarmonizedType) {
                    return harmonizedType;
                }
            }
        }
        return "unknown";
    }

    private parseTables(): IParsedTable {
        const { tables } = this.metadata;
        return tables.reduce((parsedTables, row) => {
            const { table_name, column_name, data_type } = row;
            const harmonizedType = this.harmonizeType(data_type);
            if (Object.keys(parsedTables).includes(table_name)) {
                parsedTables[table_name].columns[column_name] = { type: harmonizedType };
            } else {
                parsedTables[table_name] = { columns: { [column_name]: { type: harmonizedType } }, references: [] };
            }
            return parsedTables;
        }, {});
    }

    private parseForeignKeys(tables: ReturnType<SQLMetaDataParser["parseTables"]>): Array<IParsedForeignKeys> {
        const { foreignKeys } = this.metadata;
        const edges = foreignKeys.map((foreignKey) => {
            const { source_table, source_column, target_column, target_table } = foreignKey;
            const edge = {
                source: { table: source_table, columns: { source: source_column, target: target_column } },
                target: { table: target_table, columns: { source: target_column, target: source_column } },
            };

            // add edges to tables
            const { source, target } = edge;
            if (source.table != target.table) {
                tables[source.table].references.push(target);
                tables[target.table].references.push(source);
            } else {
                tables[source.table].references.push({ ...target, selfJoin: true });
            }

            return edge;
        });
        return edges;
    }

    private parsePrimaryKeys(): IParsedPrimaryKey {
        const { primaryKeys } = this.metadata;
        const parsedPrimaryKeys = primaryKeys.reduce((parsedPrimaryKeys, primaryKey) => {
            const { table_name, key_column } = primaryKey;
            if (table_name in parsedPrimaryKeys) {
                parsedPrimaryKeys[table_name].push(key_column);
            } else {
                parsedPrimaryKeys[table_name] = [key_column];
            }
            return parsedPrimaryKeys;
        }, {});
        return parsedPrimaryKeys;
    }
}

// parse a single statement
const query = `SELECT p."deathhyear_id", p."person_id", p."name_id", COUNT(y."year_id"), y."year"
FROM imdb2."person" as p
INNER JOIN imdb2."year" as y
ON p."birthyear_id" = y."year_id"
INNER JOIN imdb2."year" as y
ON p."birthyear_id" = y."year_id"
WHERE p."deathhyear_id" IS NOT NULL
AND p."deathhyear_id" > 5
OR p."deathhyear_id" = 1
GROUP BY p."deathhyear_id", p."person_id", p."name_id", y."year"

ORDER BY p."person_id" DESC;`;

// HAVING COUNT(y."year_id") > 5

const parser = new SQLParser();
const ast = parser.parseSQLToAST([query])[0]

const constituents = parser.retrieveConstituentCounts(ast)

// console.dir(ast, {depth: null})
console.dir(constituents, {depth: null})
