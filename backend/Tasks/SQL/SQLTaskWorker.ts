import { MinioClientWrapper } from "../../database/minio/minioDAO";
import { PgClient } from "../../database/postgres/postgresDAO";
import { templateString, toPascalCase } from "../../helpers/helperFunctions";
import { RNG, randomSample } from "../../helpers/NumberGenerators";
import { errorCodes } from "./pgErrorCodes";

const minioClient = new MinioClientWrapper();
const SQL_TASK_DB = "test";

const reflectionQueries = {
    tables: `SELECT columns.table_name,
                    columns.column_name,
                    columns.data_type
            FROM information_schema.columns
            WHERE table_name in 
                    (SELECT tables.table_name
                    FROM information_schema.tables
                    WHERE tables.table_schema = '\${schema}' 
                    AND tables.table_name != 'schema_version' 
                    AND tables.table_type = 'BASE TABLE');`,
    foreignKeys: `SELECT m.relname AS source_table,
                        (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = m.oid AND a.attnum = o.conkey[1] AND a.attisdropped = false) AS source_column,
                        f.relname AS target_table,
                        (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = f.oid AND a.attnum = o.confkey[1] AND a.attisdropped = false) AS target_column
                FROM pg_constraint o LEFT JOIN pg_class f ON f.oid = o.confrelid LEFT JOIN pg_class m ON m.oid = o.conrelid
                WHERE o.contype = 'f' AND o.conrelid IN (SELECT oid FROM pg_class c WHERE c.relkind = 'r')
                and o.connamespace::regnamespace::text = '\${schema}';`,
};

class SQLDBReflection {
    constructor(private schema: Array<string>, private dbClient: PgClient) {}

    public async reflectDB() {
        return { foreignKeys: await this.reflectForeignKeys(), tables: await this.reflectTables() };
    }
    public async reflectForeignKeys() {
        return await this.dbClient.queryDB(templateString(reflectionQueries.foreignKeys, { schema: this.schema }));
    }
    public async reflectTables() {
        return await this.dbClient.queryDB(templateString(reflectionQueries.tables, { schema: this.schema }));
    }
}

type Await<T> = T extends {
    then(onfulfilled?: (value: infer U) => unknown): unknown;
}
    ? U
    : T;

interface IReference {
    columns: { target: string; source: string };
    table: string;
    selfJoin?: boolean;
}

interface IParsedTable {
    [tableName: string]: {
        references: Array<IReference>;
        columns: {
            [columnName: string]: {
                type: keyof SQLMetaDataParser["typeMap"] | "unknown";
            };
        };
    };
}

class SQLMetaDataParser {
    private typeMap = {
        number: ["real", "int", "decimal", "numeric", "double", "precision", "serial"],
        string: ["char", "text"],
        date: ["date", "time", "interval"],
        boolean: ["boolean"],
        uuid: ["uuid"],
        binary: ["bytea"],
        currency: ["money"],
    };

    constructor(private metadata: Await<ReturnType<SQLDBReflection["reflectDB"]>>) {}

    public parseMetaData() {
        const tables = this.parseTables();
        const foreignKeys = this.parseForeignKeys(tables);
        return { tables, foreignKeys };
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

    private parseForeignKeys(tables: ReturnType<SQLMetaDataParser["parseTables"]>) {
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
}

interface IOptions {
    joinRange: Array<number>;
    columnRange: Array<number>;
    constraintRange: Array<number>;
    allowAggregates: boolean;
    forceHavingClause: boolean;
    forceOrderBy: boolean;
    schema: string;
    seed: string;
}

type JoinType = "LEFT JOIN" | "LEFT OUTER JOIN" | "CROSS JOIN" | "INNER JOIN";

interface IEdge {
    table: keyof IParsedTable;
    columns: { source: string; target: string };
    type?: JoinType;
    selfJoin?: boolean;
}
type Path = Array<IEdge>;
type Paths = Array<Path>;
interface IJoinables {
    [tableName: string]: Paths;
}

interface IJoinInstruction {
    table: string;
    path: Path;
}

interface IColumn {
    name: string;
    type: string;
    aggregation?: aggregateType;
}

interface IColumns {
    [tableName: string]: Array<IColumn>;
}

type ConstraintConjunction = "AND" | "OR";
interface IConstraint {
    operator: string | null;
    values: Array<string | number | null>;
}

interface IConstraintColumn extends IColumn {
    constraint: IConstraint;
    conjunction?: ConstraintConjunction | null;
}

interface IConstraintColumns extends IColumns {
    [tableName: string]: Array<IConstraintColumn>;
}

interface IDestructuredColumn extends IColumn {
    table: string;
    constraint?: IConstraint;
    aggregation?: aggregateType;
}

interface IDestructuredColumns {
    tables: { [key: string]: [] };
    columns: Array<IDestructuredColumn>;
}

interface IHavingClauseColumn extends IColumn {
    constraint: IConstraint;
    aggregation: aggregateType;
}

interface IHavingClause extends IColumns {
    [tableName: string]: Array<IHavingClauseColumn>;
}

interface IAliasDictionary {
    [tableName: string]: string;
}

interface IOrderByColumn extends IColumn {
    orderBy: string;
    table: string;
}

interface IOrderByColumns extends IColumns {
    [tableName: string]: Array<IOrderByColumn>;
}

interface IStructuredQuery {
    columns: IColumns;
    join: IJoinInstruction;
    whereClause: IConstraintColumns;
    groupBy: IColumns;
    havingClause: IHavingClause;
    orderBy: IOrderByColumns;
    aliasDictionary: IAliasDictionary;
}

type aggregateType = "MAX" | "MIN" | "AVG" | "COUNT" | "SUM" | null;

class QueryGenerator {
    public aliasDictionary = {};
    private numericOperators = ["BETWEEN", "<>", "<", ">", "<=", ">=", "="];
    private textOperators = ["LIKE", "NOT LIKE", "<>", "="];
    private aggregateTypes: Array<aggregateType> = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
    private joinTypes = ["LEFT JOIN", "LEFT OUTER JOIN", "CROSS JOIN", "INNER JOIN"];

    constructor(
        private parsedMetaData: ReturnType<SQLMetaDataParser["parseMetaData"]>,
        private options: IOptions,
        private dbClient: PgClient,
        private schema: string,
        private rng: RNG = new RNG()
    ) {
        const { tables } = parsedMetaData;
        this.aliasDictionary = Object.keys(tables).reduce((aliasDictionary, table) => {
            let alias = toPascalCase(table).match(/[A-Z]/g).join("").toLowerCase();
            let bandWidth = 1;
            while (Object.values(aliasDictionary).filter((a) => a === alias).length) {
                const regex = new RegExp(`[A-Z][a-z]{1,${bandWidth}}`, "g");
                alias = toPascalCase(table).match(regex).join("").toLowerCase();
                bandWidth++;
            }
            aliasDictionary[table] = alias;
            return aliasDictionary;
        }, {} as { [key: string]: string });
    }

    public async generateQuery(): Promise<IStructuredQuery> {
        const { joinRange, columnRange, constraintRange, allowAggregates, forceHavingClause, forceOrderBy } = this.options;
        const pathsPerTable = this.findAllPaths();
        const possibleTables = this.findPossibleTables(pathsPerTable, joinRange);

        const selectedJoin = this.selectJoin(possibleTables);

        let { sampledColumns, columnAmount } = this.selectColumns(selectedJoin, columnRange);
        if (allowAggregates) {
            sampledColumns = this.setAggregateColumns(sampledColumns);
        }
        let havingClause = {};
        if (forceHavingClause) {
            havingClause = await this.generateHavingClause(selectedJoin);
            // if no aggregatable column is available, rerun the query generation
            if (!havingClause) return this.generateQuery();
        }

        const adjustedConstraintRange = this.adjustRange(constraintRange, columnAmount);
        const whereClause = await this.generateWhereClause(sampledColumns, adjustedConstraintRange);

        let orderBy = {};
        if (forceOrderBy) {
            orderBy = this.generateOrderBy(selectedJoin);
        }

        const groupBy = this.generateGroupBy(sampledColumns, havingClause, orderBy);

        return {
            columns: sampledColumns,
            join: selectedJoin,
            whereClause,
            groupBy,
            havingClause,
            orderBy,
            aliasDictionary: this.aliasDictionary,
        };
    }

    private generateOrderBy(joinInstruction: IJoinInstruction): IOrderByColumns {
        const columnsPerTable = this.joinInstructionToColumns(joinInstruction);
        const { tables, columns } = this.destructureColumnsPerTable(columnsPerTable);

        const sampledColumn: IOrderByColumn = randomSample(columns, 1, true, this.rng)[0] as unknown as IOrderByColumn;

        sampledColumn["orderBy"] = this.rng.coinFlip() ? "ASC" : "DESC";

        const sampledColumnsPerTable = this.restructureColumnsPerTable({ tables, columns: [sampledColumn] }) as IOrderByColumns;

        return sampledColumnsPerTable;
    }

    private generateGroupBy(columnsPerTable: IColumns, havingClause: IColumns, orderBy: IOrderByColumns): IColumns {
        const groupByColumns = Object.entries(columnsPerTable).reduce((groupByColumns, [table, columns]) => {
            const nonAggregationColumns = columns.filter((column) => !column.aggregation);
            if (nonAggregationColumns.length) groupByColumns[table] = nonAggregationColumns;
            return groupByColumns;
        }, {} as IColumns);

        Object.entries(orderBy).forEach(([table, columns]) => {
            const missingColumn = (column: IOrderByColumn) => {
                const duplicates = Object.entries(groupByColumns).filter(([table, columns]) => {
                    return columns.some((groupByColumn) => groupByColumn.name === column.name);
                });
                return !duplicates.length;
            };
            columns.forEach((column) => {
                if (missingColumn(column)) {
                    if (groupByColumns.hasOwnProperty(table)) {
                        groupByColumns[table] = [...groupByColumns[table], column];
                    } else {
                        groupByColumns[table] = [column];
                    }
                }
            });
            return groupByColumns;
        });

        // TODO havingClause not needed ?
        // if (havingClause) {
        //     const [[table, columns]] = Object.entries(havingClause);
        //     if (groupByColumns.hasOwnProperty(table)) groupByColumns[table] = [...groupByColumns[table], ...columns];
        //     else groupByColumns[table] = columns;
        // }

        return groupByColumns;
    }

    private async generateHavingClause(joinInstruction: IJoinInstruction): Promise<IHavingClause> {
        const [aggregateType] = randomSample(this.aggregateTypes, 1, true, this.rng);
        const columnsPerTable = this.joinInstructionToColumns(joinInstruction);

        const { tables, columns } = this.destructureColumnsPerTable(columnsPerTable);
        const numberColumns = columns.filter((column) => column.type === "number");
        if (!numberColumns.length) return null;

        const sampledColumns: Array<IDestructuredColumn> = randomSample(numberColumns, 1, true, this.rng).map((column) => ({
            ...column,
            aggregation: aggregateType,
        }));
        const [sampledColumn] = sampledColumns;
        const { table, name } = sampledColumn;
        const result = (await this.fetchColumnResults(table, name)).map((row) => Object.values(row)[0]);
        const filteredResult = result.filter((value) => value !== null);
        const constraint = this.generateConstraint("number", filteredResult);
        const constraintColumn = { ...sampledColumn, constraint };
        const sampledColumnsPerTable = this.restructureColumnsPerTable({ tables, columns: [constraintColumn] }) as IHavingClause;

        return sampledColumnsPerTable;
    }

    private adjustRange(range: Array<number>, max: number) {
        if (range[0] > max) range[0] = 1;
        if (range[1] > max - 1) range[1] = max - 1;
        return range;
    }

    private generateWhereClause(columns: IColumns, constraintRange: Array<number>) {
        let constraintAmount = this.rng.intBetween(constraintRange[0], constraintRange[1]);

        const sampledConstraintColumns = this.sampleColumns(columns, constraintAmount);

        const constraintColumns = Object.entries(sampledConstraintColumns).reduce(async (constraintColumns, [table, columns]) => {
            const constraints = await columns.reduce(async (constraints, column) => {
                let constraintColumn = undefined;
                const conjunction: ConstraintConjunction = this.rng.coinFlip() ? "AND" : "OR";
                const result = (await this.fetchColumnResults(table, column.name)).map((row) => Object.values(row)[0]);
                const filteredResult = result.filter((value) => value !== null);
                if (!result.length) return constraints;
                if (filteredResult.length != result.length && this.rng.coinFlip()) {
                    const constraint = this.nullConstraint();
                    constraintColumn = { constraint, conjunction, ...column };
                } else {
                    const columnType = column.type;
                    const constraint = this.generateConstraint(columnType, filteredResult);
                    constraintColumn = { constraint, conjunction, ...column };
                }
                // TODO: implement other types if deemed necessary, POSSIBLE ERRORS ON DATE DUE TO DATE TO NUMBER CONVERSION (MISSING RIGHT NOW)
                if (constraintColumn) (await constraints).push(constraintColumn);
                return constraints;
            }, Promise.resolve([] as Array<IConstraintColumn>));
            if (constraints.length) (await constraintColumns)[table] = constraints;
            return constraintColumns;
        }, Promise.resolve({} as IConstraintColumns));

        return constraintColumns;
    }

    private generateConstraint(columnType: string, valueList: Array<any>): IConstraint {
        // TODO: implement other types if deemed necessary, POSSIBLE ERRORS ON DATE DUE TO DATE TO NUMBER CONVERSION (MISSING RIGHT NOW)
        const constraintMap: { [key: string]: Function } = {
            number: this.numericConstraint.bind(this),
            currency: this.numericConstraint.bind(this),
            string: this.stringConstraint.bind(this),
            date: this.numericConstraint.bind(this),
            boolean: () => {},
            uuid: () => {},
            binary: () => {},
            unknown: () => {},
        };

        const constraint: IConstraint = constraintMap[columnType](valueList);
        return constraint;
    }

    private nullConstraint(): IConstraint {
        const nullDirection = this.rng.coinFlip() ? "IS NULL" : "IS NOT NULL";
        return { operator: nullDirection, values: [null] };
    }

    private stringConstraint(valueList: Array<string>): IConstraint {
        const [operator] = randomSample(this.textOperators, 1, true, this.rng);
        let [value] = randomSample(valueList, 1, true, this.rng);

        if (/LIKE/.test(operator)) {
            let start = this.rng.intBetween(0, value.length - 1);
            let end = this.rng.intBetween(0, value.length - 1);

            if (start > end) [start, end] = [end, start];
            if (start === end && value.length > 2) {
                if (end === 0) end++;
                if (start === value.length - 1) start--;
            }

            let substring = value.substring(start, end);
            if (end !== value.length - 1) substring += "%";
            if (start !== 0) substring = "%" + substring;
            value = substring;
        }
        return { operator, values: [value] };
    }

    private numericConstraint(valueList: Array<number>): IConstraint {
        let [operator] = randomSample(this.numericOperators, 1, true, this.rng);
        const min = Math.min(...valueList);
        const max = Math.max(...valueList);
        const uniqueValues = [...new Set(valueList)];

        if (operator === "BETWEEN" && uniqueValues.length < 2) {
            [operator] = randomSample(
                this.numericOperators.filter((operator) => operator != "BETWEEN"),
                1,
                true,
                this.rng
            );
        } else if (operator === "BETWEEN") {
            const values = randomSample(uniqueValues, 2, true, this.rng);
            return { values, operator };
        }

        const values = randomSample(uniqueValues, 1, true, this.rng);
        if ((operator === "<" || ">") && (values[0] === min || values[0] === max || min === max)) {
            [operator] = randomSample(
                this.numericOperators.filter((operator) => operator != "<" && operator != ">"),
                1,
                true,
                this.rng
            );
        }
        return { values, operator };
    }

    private async fetchColumnResults(table: string, column: string): Promise<Array<any>> {
        const columnResult = await this.dbClient.queryDB(`SELECT ${column} FROM ${this.schema}.${table};`);
        return columnResult;
    }

    private sampleColumns(columnsPerTable: IColumns, n: number): IColumns {
        const { tables, columns } = this.destructureColumnsPerTable(columnsPerTable);

        if (n > columns.length - 1) n = columns.length - 1;
        const sampledColumns = randomSample(columns, n, true, this.rng);

        const sampledColumnsPerTable = this.restructureColumnsPerTable({ tables, columns: sampledColumns });
        return sampledColumnsPerTable;
    }

    private destructureColumnsPerTable(columnsPerTable: IColumns) {
        return Object.entries(columnsPerTable).reduce(
            (destructuredColumnsPerTable, [table, columns]) => {
                const destructuredColumns = columns.map((column) => ({ ...column, table }));
                destructuredColumnsPerTable.columns = [...destructuredColumnsPerTable.columns, ...destructuredColumns];
                destructuredColumnsPerTable.tables[table] = [];
                return destructuredColumnsPerTable;
            },
            // TODO workaround conversion to shut the compiler up - fix with proper type assertion
            { columns: [], tables: [] as unknown } as IDestructuredColumns
        );
    }

    private restructureColumnsPerTable(destructuredColumnsPerTable: IDestructuredColumns): IColumns | IHavingClause {
        const { tables, columns } = destructuredColumnsPerTable;
        const columnsPerTable = columns.reduce((columnsPerTable, column, i) => {
            const { table, ...columnWithoutTableAttribute } = column;
            columnsPerTable[table].push(columnWithoutTableAttribute);
            if (i === columns.length - 1) {
                for (const t in columnsPerTable) {
                    const c = columnsPerTable[t];
                    if (c.length === 0) delete columnsPerTable[t];
                }
            }
            return columnsPerTable;
        }, tables as IColumns);
        return columnsPerTable;
    }

    private selectColumns(
        joinInstruction: IJoinInstruction,
        columnRange: Array<number>
    ): { sampledColumns: IColumns; columnAmount: number } {
        let columnAmount = this.rng.intBetween(columnRange[0], columnRange[1]);
        const columns = this.joinInstructionToColumns(joinInstruction);
        const sampledColumns = this.sampleColumns(columns, columnAmount);
        return { sampledColumns, columnAmount };
    }

    private joinInstructionToColumns(joinInstruction: IJoinInstruction) {
        const { table, path } = joinInstruction;
        const selectedTables = path.reduce((tables, join) => [...tables, join.table], [table]);
        const { tables } = this.parsedMetaData;
        const columns = selectedTables.reduce((columns, selectedTable) => {
            const columnsPerTable = Object.entries(tables[selectedTable].columns).map(([name, columnType]) => ({ name, ...columnType }));
            columns[selectedTable] = columnsPerTable;
            return columns;
        }, {} as IColumns);

        return columns;
    }

    private setAggregateColumns(columns: IColumns, force: boolean = false): IColumns {
        return Object.entries(columns).reduce((columns, [table, columnsPerTable]) => {
            const aggregatedColumns = columnsPerTable.map((column) => {
                let aggregation = null;
                if ((column.type === "number" && this.rng.coinFlip()) || force) {
                    const aggregationIndex = this.rng.intBetween(0, this.aggregateTypes.length - 1);
                    aggregation = this.aggregateTypes[aggregationIndex];
                }
                return { ...column, aggregation };
            });
            columns = { ...columns, [table]: aggregatedColumns };
            return columns;
        }, {} as IColumns);
    }

    private selectJoin(tables: IJoinables): IJoinInstruction {
        const tableList = Object.entries(tables);
        const tableAmount = tableList.length - 1;
        const tableIndex = this.rng.intBetween(0, tableAmount);
        if (!tableList.length) {
            const path: Array<IEdge> = [];
            const tableNames = Object.keys(this.parsedMetaData.tables);
            const table = randomSample(tableNames, 1, true, this.rng)[0];
            return { table, path };
        } else {
            const [table, paths] = tableList[tableIndex];
            const pathIndex = this.rng.intBetween(0, paths.length - 1);
            const path = paths[pathIndex].map((edge) => {
                const joinType = randomSample(this.joinTypes as Array<JoinType>, 1, true, this.rng)[0];
                return { ...edge, type: joinType };
            });
            return { table, path };
        }
    }

    private findPossibleTables(pathsPerTable: IJoinables, joinRange: Array<number>) {
        const joinAmount = this.rng.intBetween(joinRange[0], joinRange[1]);
        const possibleTables = Object.entries(pathsPerTable).reduce((possibleTables, [table, paths]) => {
            const validPaths = paths.filter((path) => path.length === joinAmount);
            if (validPaths.length) possibleTables[table] = validPaths;
            return possibleTables;
        }, {} as IJoinables);
        return possibleTables;
    }

    private findAllPathsFromTable(
        tables: IParsedTable,
        node: keyof IParsedTable,
        visited: [keyof IParsedTable],
        path: Path,
        paths: Paths
    ): Paths {
        const currentTable = tables[node];
        for (const { table, columns, selfJoin } of currentTable.references) {
            const isValidSelfJoin = selfJoin && visited.filter((visitedTable) => visitedTable === table).length < 2;
            const isFirstVisit = !visited.includes(table);
            if (isValidSelfJoin || isFirstVisit) {
                visited.push(node);
                path = [...path, { table, columns, selfJoin }];
                paths = [path, ...this.findAllPathsFromTable(tables, table, visited, path, paths)];
                // remove last element from path since the next path in the for loop does not contain this branching node
                path = path.filter((e, i) => i !== path.length - 1);
            }
        }
        return paths;
    }

    private findAllPaths(): IJoinables {
        const { tables } = this.parsedMetaData;
        const pathsPerTable = Object.keys(tables).reduce((pathsPerTable, table, i) => {
            const paths = this.findAllPathsFromTable(tables, table, [table], [], []);
            return { ...pathsPerTable, [table]: paths };
        }, {});
        return pathsPerTable;
    }
}

class SQLParser {
    public parse({ columns, join, whereClause, groupBy, havingClause, orderBy, aliasDictionary }: IStructuredQuery, schema: string) {
        const selectStatement = this.parseColumns(columns, aliasDictionary);
        const joinStatement = this.parseJoin(join, schema, aliasDictionary);
        const whereStatement = this.parseWhereClause(whereClause, aliasDictionary);
        const groupByStatement = this.parseGroupBy(groupBy, aliasDictionary);
        const havingStatement = this.parseHavingClause(havingClause, aliasDictionary);
        const orderByStatement = this.parseOrderBy(orderBy, aliasDictionary);

        return [selectStatement, joinStatement, whereStatement, groupByStatement, havingStatement, orderByStatement]
            .filter((statement) => !!statement)
            .join("\n");

        // return `${selectStatement} ${joinStatement} ${whereStatement} ${groupByStatement} ${havingStatement} ${orderByStatement};`;
    }

    private parseColumns(columns: IColumns, aliasDictionary: IAliasDictionary) {
        const flattenedColumns = Object.entries(columns).reduce((flattened, [table, columns]) => {
            const alias = aliasDictionary[table];
            const columnsPerTable = columns.map((column) => {
                const { name, aggregation } = column;
                if (aggregation) return `${aggregation}(${alias}.${name})`;
                return `${alias}.${name}`;
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

            let statement = `${type} ${schema}.${table} as ${secondAlias}\nON ${firstAlias}.${target} = ${secondAlias}.${source}`;
            if (type === "CROSS JOIN") {
                statement = `${type} ${schema}.${table} as ${secondAlias}`;
            }

            if (seenAlias.includes(secondAlias)) {
                statement = `${type} ${schema}.${table}\nON ${firstAlias}.${target} = ${secondAlias}.${source}`;
                if (type === "CROSS JOIN") {
                    statement = `${type} ${schema}.${table}`;
                }
            }

            firstAlias = secondAlias;
            seenAlias.push(secondAlias);
            return statement;
        });
        return `FROM ${schema}.${table} as ${alias}\n${joins.join("\n")}`;
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

                const statement = `${alias}.${name} ${operatorStatement} ${conjunction}`;
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
            const columns = columnsPerTable.map((column) => `${alias}.${column.name}`);

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

                const statement = `${aggregation}(${alias}.${name}) ${operatorStatement}`;
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
            const columns = columnsPerTable.map((column) => `${alias}.${column.name} ${column.orderBy}`);

            return [...flattened, ...columns];
        }, []);

        if (!flattened.length) return "";

        const orderByColumns = flattened.join(", ");

        return `ORDER BY ${orderByColumns}`;
    }
}

interface ITemplates {
    [countryCode: string]: INLTemplate;
}

interface IConjunctions {
    "&": string;
    "|": string;
}

interface INLTemplate {
    conjunctions: IConjunctions;
    joinTemplate: IJoinTemplate;
    operatorTemplate: IOperatorTemplate;
    aggregationTemplate: IAggregationTemplate;
    columnTemplate: IColumnTemplate;
    constraintTemplate: IConstraintTemplate;
    havingTemplate: IHavingTemplate;
    groupByTemplate: IGroupByTemplate;
    orderByTemplate: IOrderByTemplate;
}

interface IJoinTemplate {
    nonJoinStartingPhrase: string;
    joinStartingPhrase: string;
    joinTypes: {
        [key in JoinType]: string;
    };
}

interface IOperatorTemplate {
    BETWEEN: string;
    "<>": string;
    "<": string;
    ">": string;
    "<=": string;
    ">=": string;
    "=": string;
    LIKE: ILIKEConstraint;
    "NOT LIKE": ILIKEConstraint;
    NULL: string;
    "NOT NULL": string;
}

interface IAggregationTemplate {
    SUM: string;
    AVG: string;
    MAX: string;
    MIN: string;
    COUNT: string;
}

interface IColumnTemplate {
    columnStartingPhrasePlural: string;
    columnStartingPhraseSingular: string;
    columnEndingPhrase: string;
}

interface IConstraintTemplate {
    startingPhrase: string;
    endingPhrase: string;
    LIKEOperatorFallback: { include: string; exclude: string };
}

interface ILIKEConstraint {
    [key: number]: string;
}

interface IHavingTemplate {
    startingPhrase: string;
    endingPhrase: string;
}

interface IGroupByTemplate {
    startingPhrase: string;
    endingPhrase: string;
}

interface IOrderByTemplate {
    startingPhrase: string;
    endingPhrase: string;
    direction: {
        DESC: string;
        ASC: string;
    };
}

const templatesPerLanguage: ITemplates = {
    de: {
        conjunctions: {
            "&": " und ",
            "|": " oder ",
        },
        joinTemplate: {
            nonJoinStartingPhrase: "Verwende die Tabelle ${table}.",
            joinStartingPhrase: "Bilde",
            joinTypes: {
                "LEFT JOIN": "die Schnittmenge, welche die korrespondierenden Einträge der beiden Tabellen ${source} und ${target} enthält",
                "LEFT OUTER JOIN":
                    "die Schnittmenge, welche alle Einträge von ${source} und die korrespondierenden Einträge von ${target} enthält",
                "CROSS JOIN": "das kartesische Produkt der Tabellen ${source} und ${target}",
                "INNER JOIN":
                    "die Schnittmenge, welche die korrespondierenden Einträge der beiden Tabellen ${source} und ${target} enthält",
            },
        },
        aggregationTemplate: {
            SUM: "die Summe von ${column}",
            AVG: "den Durchschnitt von ${column}",
            MAX: "das Maximum von ${column}",
            MIN: "das Minimum von ${column}",
            COUNT: "die Anzahl von ${column}",
        },
        operatorTemplate: {
            BETWEEN: "zwischen ${value1} und ${value2} liegt",
            "<>": "ungleich",
            "<": "kleiner",
            ">": "größer",
            "<=": "kleiner oder gleich",
            ">=": "größer oder gleich",
            "=": "gleich",
            LIKE: {
                0: "'${value}' enthält",
                1: "mit '${value}' endet",
                2: "mit '${value}' beginnt",
            },
            "NOT LIKE": {
                0: "nicht '${value}' enthält",
                1: "nicht mit '${value}' endet",
                2: "nicht mit '${value}' beginnt",
            },
            NULL: "NULL",
            "NOT NULL": "nicht NULL",
        },
        columnTemplate: {
            columnStartingPhrasePlural: "Gib die Spalten",
            columnStartingPhraseSingular: "Gib die Spalte",
            columnEndingPhrase: "aus",
        },
        constraintTemplate: {
            startingPhrase: "Es sollen nur Daten ausgegeben werden für die",
            endingPhrase: "gilt",
            LIKEOperatorFallback: { exclude: "eine beliebige Zeichenkette enthält", include: "eine leere Zeichenkette enthält" },
        },
        groupByTemplate: {
            startingPhrase: "Gruppiere das Ergebnis nach",
            endingPhrase: "",
        },
        havingTemplate: {
            startingPhrase: "Zudem muss gelten, dass",
            endingPhrase: "",
        },
        orderByTemplate: {
            startingPhrase: "Sortiere das Ergebnis",
            endingPhrase: "",
            direction: {
                ASC: "aufsteigend nach",
                DESC: "absteigend nach",
            },
        },
    },
};

class NLParser {
    constructor(private template: INLTemplate) {}

    public parse({ columns, join, whereClause, havingClause, groupBy, orderBy }: IStructuredQuery) {
        const {
            joinTemplate,
            conjunctions,
            aggregationTemplate,
            operatorTemplate,
            columnTemplate,
            constraintTemplate,
            groupByTemplate,
            havingTemplate,
            orderByTemplate,
        } = this.template;
        const parsedJoin = this.parseJoin(join, joinTemplate, conjunctions);
        const parsedColumns = this.parseColumns(columns, columnTemplate, aggregationTemplate, conjunctions);
        const parsedWhereClause = this.parseWhereClause(whereClause, constraintTemplate, operatorTemplate, conjunctions);
        const parsedGroupBy = this.parseGroupBy(groupBy, groupByTemplate, conjunctions);
        const parsedHavingClause = this.parseHavingClause(havingClause, havingTemplate, aggregationTemplate, operatorTemplate);
        const parsedOrderBy = this.parseOrderBy(orderBy, orderByTemplate, conjunctions);

        const nlQuery = `${parsedJoin} ${parsedColumns} ${parsedWhereClause} ${parsedHavingClause} ${parsedGroupBy} ${parsedOrderBy}`;
        return nlQuery;
    }

    private handleConjunction(parsedColumns: string, conjunctions: IConjunctions) {
        const conjunctionInsertionIndex = parsedColumns.lastIndexOf(", ");
        if (~conjunctionInsertionIndex) {
            parsedColumns =
                parsedColumns.substring(0, conjunctionInsertionIndex) +
                conjunctions["&"] +
                parsedColumns.substring(conjunctionInsertionIndex + 2);
        }
        return parsedColumns;
    }

    private parseJoin(joinInstruction: IJoinInstruction, joinTemplate: IJoinTemplate, conjunctions: IConjunctions) {
        const { table, path } = joinInstruction;
        let source = table;
        const joins = path.map((edge) => {
            const target = edge.table as string;
            const joinType = joinTemplate.joinTypes[edge.type];
            const join = templateString(joinType, { source: [source], target: [target] });
            source = target;
            return join;
        });

        let joinStatement = templateString(joinTemplate.nonJoinStartingPhrase, { table: [table] });
        if (joins.length) {
            joinStatement = `${joinTemplate.joinStartingPhrase} ${joins.join(conjunctions["&"])}.`;
        }

        return joinStatement;
    }

    private parseColumns(
        columnsPerTable: IColumns,
        columnTemplate: IColumnTemplate,
        aggregationTemplate: IAggregationTemplate,
        conjunctions: IConjunctions
    ) {
        const flattened = Object.entries(columnsPerTable).reduce((flattened, [table, columns]) => {
            const parsedColumns = columns.map((column) => {
                const { aggregation, name } = column;
                let parsedColumn = name;
                if (aggregation) {
                    parsedColumn = templateString(aggregationTemplate[aggregation], { column: [name] });
                }
                return parsedColumn;
            });
            return [...flattened, ...parsedColumns];
        }, []);

        const startingPhrase =
            flattened.length > 1 ? columnTemplate.columnStartingPhrasePlural : columnTemplate.columnStartingPhraseSingular;

        let parsedColumns = this.handleConjunction(flattened.join(", "), conjunctions);

        return `${startingPhrase} ${parsedColumns} ${columnTemplate.columnEndingPhrase}.`;
    }

    // TODO cleanup this messy code
    private parseWhereClause(
        columnsPerTable: IConstraintColumns,
        constraintTemplate: IConstraintTemplate,
        operatorTemplate: IOperatorTemplate,
        conjunctions: IConjunctions
    ) {
        const likeConstraints: Array<string> = [];
        const flattened = Object.entries(columnsPerTable).reduce((flattened, [table, columns]) => {
            const parsedColumns = columns.reduce((parsedConstraints, column) => {
                const { constraint, name } = column;
                const operator = constraint.operator as keyof IOperatorTemplate;
                const values = constraint.values as Array<string>;

                let parsedConstraint = `${name} ${operatorTemplate[operator]} '${values[0]}'`;
                if (operator === "BETWEEN") {
                    const [value1, value2] = values;
                    parsedConstraint = templateString(operatorTemplate["BETWEEN"], { value1: [value1], value2: [value2] });
                } else if (/LIKE/i.test(operator)) {
                    let likeConstraint;
                    const [value] = values;
                    const cleanedValue = value.replace(/%/g, "");
                    if (!value) {
                        const exclude = /NOT/i.test(operator);
                        if (exclude) {
                            likeConstraint = `${name} ${constraintTemplate.LIKEOperatorFallback.exclude}`;
                        } else {
                            likeConstraint = `${name} ${constraintTemplate.LIKEOperatorFallback.include}`;
                        }
                    } else {
                        let option;
                        if (/%\w+/i.test(value)) option = 2;
                        else if (/\w+%/i.test(value)) option = 1;
                        else option = 0;
                        const constraint = templateString(operatorTemplate[operator][option], { value: [cleanedValue] });
                        likeConstraint = `${name} ${constraint}`;
                    }
                    likeConstraints.push(likeConstraint);
                    parsedConstraint = "";
                } else if (/NULL/i.test(operator)) {
                    parsedConstraint = `${name} ${operatorTemplate[operator]}`;
                }

                if (parsedConstraint) parsedConstraints.push(parsedConstraint);
                return parsedConstraints;
            }, []);
            return [...flattened, ...parsedColumns];
        }, []);

        const constraints = flattened.join(", ");
        const joinedLikeConstraints = likeConstraints.join(", ");
        if (!flattened.length && !likeConstraints.length) return "";
        else if (!flattened.length) {
            return `${constraintTemplate.startingPhrase} ${joinedLikeConstraints}.`;
        } else if (!likeConstraints.length) {
            return `${constraintTemplate.startingPhrase} ${constraints} ${constraintTemplate.endingPhrase}.`;
        }

        return `${constraintTemplate.startingPhrase} ${constraints} ${constraintTemplate.endingPhrase} ${conjunctions[
            "&"
        ].trim()} ${joinedLikeConstraints}.`;
    }

    private parseGroupBy(groupBy: IColumns, groupByTemplate: IGroupByTemplate, conjunctions: IConjunctions) {
        const flattened = Object.entries(groupBy).reduce((flattened, [table, columns]) => {
            const parsedColumns = columns.map((column) => {
                const { name } = column;
                return name;
            });

            return [...flattened, ...parsedColumns];
        }, []);

        if (!flattened.length) return "";

        let parsedColumns = this.handleConjunction(flattened.join(", "), conjunctions);

        return `${groupByTemplate.startingPhrase} ${parsedColumns}${groupByTemplate.endingPhrase}.`;
    }

    private parseHavingClause(
        havingClause: IHavingClause,
        havingTemplate: IHavingTemplate,
        aggregationTemplate: IAggregationTemplate,
        operatorTemplate: IOperatorTemplate
    ) {
        const flattened = Object.entries(havingClause).reduce((flattened, [table, columnsPerTable]) => {
            const parsedColumns = columnsPerTable.map((column) => {
                const { aggregation, name, constraint } = column;
                const operator = constraint.operator as keyof IOperatorTemplate;
                const values = constraint.values as Array<string>;
                const aggregationString = templateString(aggregationTemplate[aggregation], { column: [name] });

                let parsedConstraint = `${operatorTemplate[operator]} '${values[0]}'`;
                if (operator === "BETWEEN") {
                    const [value1, value2] = values;
                    parsedConstraint = templateString(operatorTemplate["BETWEEN"], { value1: [value1], value2: [value2] });
                }
                return `${aggregationString} ${parsedConstraint}`;
            });

            return [...flattened, ...parsedColumns];
        }, []);

        if (!flattened.length) return "";

        const constraint = flattened.join(", ");

        return `${havingTemplate.startingPhrase} ${constraint} ${havingTemplate.endingPhrase}.`;
    }

    private parseOrderBy(orderBy: IOrderByColumns, orderByTemplate: IOrderByTemplate, conjunctions: IConjunctions) {
        const flattened = Object.entries(orderBy).reduce((flattened, [table, columns]) => {
            const parsedColumns = columns.map((column) => {
                const { name } = column;
                const orderBy = column.orderBy as keyof IOrderByTemplate["direction"];
                return `${orderByTemplate.direction[orderBy]} ${name}`;
            });

            return [...flattened, ...parsedColumns];
        }, []);

        if (!flattened.length) return "";

        let parsedColumns = this.handleConjunction(flattened.join(", "), conjunctions);

        return `${orderByTemplate.startingPhrase} ${parsedColumns}${orderByTemplate.endingPhrase}.`;
    }
}

interface SQLTaskDescription {
    language: string;
    parameters: IOptions;
}

export const sqlQueryGenerator = async (taskDescription: SQLTaskDescription) => {
    const { language, parameters } = taskDescription;
    const { schema, seed } = parameters;

    const sqlTaskClient = new PgClient(SQL_TASK_DB);
    const reflector = new SQLDBReflection([schema], sqlTaskClient);
    const reflection = await reflector.reflectDB();
    const parser = new SQLMetaDataParser(reflection);
    const parsedMetaData = parser.parseMetaData();

    const qb = new QueryGenerator(parsedMetaData, parameters, sqlTaskClient, schema, new RNG(seed));
    const sqlParser = new SQLParser();
    const nlParser = new NLParser(templatesPerLanguage[language]);

    let result = [];
    let query;
    let parsedQuery;
    while (!result.length) {
        try {
            query = await qb.generateQuery();
            parsedQuery = sqlParser.parse(query, schema);
            result = await sqlTaskClient.queryDB(parsedQuery);
        } catch (error) {
            console.log("rewind");
        }
    }
    const nlQuery = nlParser.parse(query);

    const dotDescription = await minioClient.getFile("erd", `${schema}.dot`);
    return { query: parsedQuery, description: nlQuery, result, dotDescription };
};

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

export const sqlQueryValidator = async (taskDescription: SQLTaskValidationDescription) => {
    const { schema, query, expectedResult } = taskDescription.parameters;
    const parsedExpectedResult = expectedResult;

    const allowedDeviation = 8;

    const sqlTaskClient = new PgClient(SQL_TASK_DB);
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

export const importDatabase = async (taskDescription: {}) => {
    minioClient;
};

export const fetchERD = async (taskDescription: { parameters: { schema: string } }) => {
    const { schema } = taskDescription.parameters;
    const dotDescription = await minioClient.getFile("erd", `${schema}.dot`);
    return { dotDescription };
};
