import { PgClient } from "../../../database/postgres/postgresDAO";
import { toPascalCase } from "../../../helpers/helperFunctions";
import { RNG, randomSample } from "../../../helpers/NumberGenerators";
import { SQLMetaDataParser } from "./SQLParser";
import { attachRuntimes, getFunctionRuntimes } from "./benchmark";
import {
    IMetaData,
    IParsedTable,
    AggregateType, 
    SubJoinType,
    IJoinables,
    IOptions,
    IStructuredQuery,
    IJoinInstruction,
    IOrderByColumns,
    IOrderByColumn,
    IColumns,
    IHavingClause,
    IColumn,
    ConstraintConjunction,
    IConstraint,
    IConstraintColumns,
    IConstraintColumn,
    IDestructuredColumns,
    Paths,
    Path,
    IEdge,
} from "./types";

export class QueryGenerator {
    public aliasDictionary = {};
    private numericOperators = ["BETWEEN", "<>", "<", ">", "<=", ">=", "="];
    private textOperators = ["LIKE", "NOT LIKE", "<>", "="];
    private aggregateTypes: Array<AggregateType> = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
    private joinTypes: Array<SubJoinType> = ["INNER JOIN"]; //"RIGHT OUTER JOIN", "LEFT OUTER JOIN",
    private metaData: ReturnType<SQLMetaDataParser["parseMetaData"]>;
    private pathsPerTable: IJoinables;

    constructor(
        private parsedMetaData: ReturnType<SQLMetaDataParser["parseMetaData"]>,
        private options: IOptions,
        private dbClient: PgClient,
        private schema: string,
        private rng: RNG = new RNG()
    ) {
        const { tables } = parsedMetaData;
        this.metaData = parsedMetaData;
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

        this.pathsPerTable = this.findAllPaths();
    }

    // @attachRuntimes("generateQuery")
    public async generateQuery(): Promise<IStructuredQuery> {
        const { joinRange, columnRange, constraintRange, allowAggregates, forceHavingClause, forceOrderBy } = this.options;

        const selectedJoin = this.selectJoin(joinRange);

        // let { sampledColumns, columnAmount } = this.selectColumns(selectedJoin, columnRange);
        let { sampledColumns } = this.selectColumns(selectedJoin, columnRange);

        let aggregationColumns: Array<{ table: string; column: string }> = [];
        if (allowAggregates) {
            const aggregationResult = this.setAggregateColumns(sampledColumns);
            ({ columns: sampledColumns, aggregationColumns } = aggregationResult);
        }

        // const adjustedConstraintRange = this.adjustRange(constraintRange, columnAmount);
        // eligibleColumns instead of sampledColumns as constraints can apply to non SELECT-columns
        const eligibleColumns = this.joinInstructionToColumns(selectedJoin);
        const whereClause = await this.generateWhereClause(eligibleColumns, constraintRange);

        let orderBy = {};
        if (forceOrderBy) {
            orderBy = this.generateOrderBy(selectedJoin);
        }

        let havingClause = {};
        if (forceHavingClause && aggregationColumns.length) {
            havingClause = await this.generateHavingClause(selectedJoin, sampledColumns, aggregationColumns);
        }
        let groupBy = {};
        if (forceHavingClause && aggregationColumns.length) {
            groupBy = this.generateGroupBy(sampledColumns, havingClause, orderBy);
        }

        // force use of joined queries

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
    
    // @attachRuntimes("generateOrderBy")
    private generateOrderBy(joinInstruction: IJoinInstruction): IOrderByColumns {
        const columnsPerTable = this.joinInstructionToColumns(joinInstruction);
        const { tables, columns } = this.destructureColumnsPerTable(columnsPerTable);

        const sampledColumn: IOrderByColumn = randomSample(columns, 1, true, this.rng)[0] as unknown as IOrderByColumn;

        sampledColumn["orderBy"] = this.rng.coinFlip() ? "ASC" : "DESC";

        const sampledColumnsPerTable = this.restructureColumnsPerTable({ tables, columns: [sampledColumn] }) as IOrderByColumns;

        return sampledColumnsPerTable;
    }

    // @attachRuntimes("generateGroupBy")
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
        if (havingClause) {
            const [[table, columns]] = Object.entries(havingClause);
            if (groupByColumns.hasOwnProperty(table)) groupByColumns[table] = [...groupByColumns[table], ...columns];
            else groupByColumns[table] = columns;
        }

        return groupByColumns;
    }

    // @attachRuntimes("generateHavingClause")
    private async generateHavingClause(
        joinInstruction: IJoinInstruction,
        columns: IColumns,
        aggregationColumns: Array<{ table: string; column: string }>
    ): Promise<IHavingClause> {
        // !TODO!
        //  REWORK AT THE END;
        //  DONT FETCH COLUMNRESULTS; BUT AGGREGATE-RESULT WITH REMAINING QUERY TO ESTIMATE ELIGIBLE VALUES FOR NUMERIC CONSTRAINT
        // REBUILD COLUMN TO IHavingClause

        // const [aggregateType] = randomSample(this.aggregateTypes, 1, true, this.rng);
        const columnsPerTable = this.joinInstructionToColumns(joinInstruction);

        const { tables } = this.destructureColumnsPerTable(columnsPerTable);
        // const numberColumns = columns.filter((column) => column.type === "number");
        // if (!numberColumns.length) return null;

        // const sampledColumns: Array<IDestructuredColumn> = randomSample(numberColumns, 1, true, this.rng).map((column) => ({
        //     ...column,
        //     aggregation: aggregateType,
        // }));

        const { table: aggregationTable, column: aggregationColumn } = randomSample(aggregationColumns, 1, true, this.rng)[0];
        const sampledAggregationColumn: IColumn = {
            ...columns[aggregationTable].filter((column) => column.name === aggregationColumn)[0],
        };

        const { name } = sampledAggregationColumn;
        const result = (await this.fetchColumnResults(aggregationTable, name)).map((row) => Object.values(row)[0]);
        const filteredResult = result.filter((value) => value !== null);
        // if (!filteredResult.length) {
        //     return 
        // }
        const constraint = this.generateConstraint("number", filteredResult);
        const constraintColumn = { ...sampledAggregationColumn, constraint, table: aggregationTable };
        const sampledColumnsPerTable = this.restructureColumnsPerTable({ tables, columns: [constraintColumn] }) as IHavingClause;

        return sampledColumnsPerTable;
    }

    private adjustRange(range: Array<number>, max: number) {
        if (range[0] > max) range[0] = 1;
        if (range[1] > max - 1) range[1] = max - 1;
        return range;
    }

    // @attachRuntimes("generateConstraints")
    private generateWhereClause(columns: IColumns, constraintRange: Array<number>) {
        let constraintAmount = this.rng.intBetween(constraintRange[0], constraintRange[1]);

        const sampledConstraintColumns = this.sampleColumns(columns, constraintAmount);

        const constraintColumns = Object.entries(sampledConstraintColumns).reduce(async (constraintColumns, [table, columns]) => {
            const constraints = await columns.reduce(async (constraints, column) => {
                let constraintColumn = undefined;
                const conjunction: ConstraintConjunction = this.rng.coinFlip() ? "AND" : "OR";
                const result = (await this.fetchColumnResults(table, column.name)).map((row) => Object.values(row)[0]);
                const filteredResult = result.filter((value) => value !== null);
                if (!filteredResult.length) return constraints;
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

    // @attachRuntimes("generateConstraint")
    private generateConstraint(columnType: string, valueList: Array<any>): IConstraint {
        // TODO: implement other types if deemed necessary, POSSIBLE ERRORS ON DATE DUE TO DATE TO NUMBER CONVERSION (MISSING RIGHT NOW)
        const constraintMap: { [key: string]: Function } = {
            number: this.numericConstraint.bind(this),
            currency: this.numericConstraint.bind(this),
            string: this.stringConstraint.bind(this),
            date: this.numericConstraint.bind(this),
            boolean: this.booleanConstraint.bind(this),
            uuid: () => {},
            binary: () => {},
            unknown: () => {},
        };

        const constraint: IConstraint = constraintMap[columnType](valueList);
        return constraint;
    }

    private booleanConstraint(): IConstraint {
        const value = this.rng.coinFlip() ? "true" : "false";
        return { operator: "=", values: [value] };
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
            const sortedValues = values.sort((a,b) => a-b)
            return { values: sortedValues, operator };
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
        const columnResult = await this.dbClient.queryDB(`SELECT "${column}" FROM ${this.schema}."${table}" LIMIT 500;`);
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

    // @attachRuntimes("setColumns")
    private selectColumns(
        joinInstruction: IJoinInstruction,
        columnRange: Array<number>
    ): { sampledColumns: IColumns; columnAmount: number } {
        const filterDuplicateKeys = (columns: IColumns, metaData: IMetaData) => {
            const { junctionTables, attributeTables, primaryKeys } = metaData;

            Object.entries(columns).reduce((filteredColumns, [table, columns]) => {
                if (table in junctionTables || table in attributeTables) {
                    filteredColumns[table] = columns.filter((column) => !primaryKeys[table].keyColumns.includes(column.name));
                }
                return filteredColumns;
            }, {} as IColumns);

            return columns;
        };

        let columnAmount = this.rng.intBetween(columnRange[0], columnRange[1]);
        const columnsEligibleByJoinInstruction = this.joinInstructionToColumns(joinInstruction);

        const eligibleColumns = filterDuplicateKeys(columnsEligibleByJoinInstruction, this.metaData);
        const sampledColumns = this.sampleColumns(eligibleColumns, columnAmount);
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

    // @attachRuntimes("setAggregates")
    private setAggregateColumns(columns: IColumns): { columns: IColumns; aggregationColumns: Array<{ table: string; column: string }> } {
        let aggregationColumns: Array<{ table: string; column: string }> = [];

        const aggregationConditions = {
            isNumericAttribute: (columnType: string) => columnType === "number",
            isNonKeyAttribute: (columnName: string) => !columnName.includes("id"),
            isEligibleForCount: (rng: RNG) => rng.coinFlip(),
        };

        const setAggregationColumnsPerTable = (table: string, columnsPerTable: Array<IColumn>) => {
            return columnsPerTable.map((column) => {
                let aggregation = null;
                if (
                    aggregationConditions.isNumericAttribute(column.type) &&
                    aggregationConditions.isNonKeyAttribute(column.name) &&
                    this.rng.coinFlip()
                ) {
                    const aggregationIndex = this.rng.intBetween(0, this.aggregateTypes.length - 1);
                    aggregation = this.aggregateTypes[aggregationIndex];
                    aggregationColumns.push({ table, column: column.name });
                } else if (aggregationConditions.isEligibleForCount(this.rng)) {
                    const countAggregation = this.aggregateTypes[3];
                    aggregation = countAggregation;
                    aggregationColumns.push({ table, column: column.name });
                }
                return { ...column, aggregation };
            });
        };

        const setAggregationColumns = (columns: IColumns) => {
            return Object.entries(columns).reduce((columns, [table, columnsPerTable]) => {
                const aggregatedColumns = setAggregationColumnsPerTable(table, columnsPerTable);
                columns = { ...columns, [table]: aggregatedColumns };
                return columns;
            }, {} as IColumns);
        };

        return { columns: setAggregationColumns(columns), aggregationColumns };
    }

    // @attachRuntimes("setJoin")
    private selectJoin(joinRange: Array<number>): IJoinInstruction {
        const primaryTables = this.metaData.primaryTables;
        const junctionTables = this.metaData.junctionTables;
        const findEligiblePaths = (joinRange: Array<number>) => {
            const joinAmount = this.rng.intBetween(joinRange[0], joinRange[1]);
            const pathsPerTable = Object.assign({}, this.pathsPerTable);

            const eligiblePaths = Object.entries(pathsPerTable).reduce((eligiblePaths, [table, paths]) => {
                if (primaryTables.includes(table)) {
                    const validPathsByLength = paths.filter((path) => path.length === joinAmount);
                    // filter paths that end on a junction table
                    const validPathsByCardinality = validPathsByLength.filter((path) => {
                        return !junctionTables.includes(path[path.length - 1].table as string);
                    });

                    if (validPathsByCardinality.length) eligiblePaths[table] = validPathsByCardinality;
                }
                return eligiblePaths;
            }, {} as IJoinables);
            return eligiblePaths;
        };

        const eligiblePaths = findEligiblePaths(joinRange);
        const tableList = Object.entries(eligiblePaths);

        if (!tableList.length) {
            const path: Array<IEdge> = [];
            const table = randomSample(primaryTables, 1, true, this.rng)[0];
            return { table, path };
        } else {
            const tableNames = Object.keys(eligiblePaths);
            const startTable = randomSample(tableNames, 1, true, this.rng)[0];
            const tableIndex = tableList.reduce((index, [tableName, paths], i) => {
                if (tableName === startTable) {
                    index = i;
                }
                return index;
            }, 0);

            const [table, paths] = tableList[tableIndex];
            const pathIndex = this.rng.intBetween(0, paths.length - 1);
            const path = paths[pathIndex].map((edge) => {
                const joinType = randomSample(this.joinTypes as Array<SubJoinType>, 1, true, this.rng)[0];
                return { ...edge, type: joinType };
            });
            return { table, path };
        }
    }

    // @attachRuntimes("pathsOfTable")
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

    // @attachRuntimes("paths")
    private findAllPaths(): IJoinables {
        const { tables } = this.parsedMetaData;
        const pathsPerTable = Object.keys(tables).reduce((pathsPerTable, table, i) => {
            const paths = this.findAllPathsFromTable(tables, table, [table], [], []);
            return { ...pathsPerTable, [table]: paths };
        }, {});
        return pathsPerTable;
    }
}

