const aggregates = ["MAX", "MIN", "AVG", "COUNT", "SUM"] as const;
export const subJoins = ["RIGHT OUTER JOIN", "LEFT OUTER JOIN", "INNER JOIN" ] as const;
const joins = [...subJoins, "CROSS JOIN", "FULL OUTER JOIN"] as const;
const constraints = ["numericRange", "numericComparison", "stringFuzzyComparison", "stringComparison", "nullComparison"] as const;
const clauses = ["selectList", "tableList", "whereClause", "havingClause", "groupBy", "orderBy"] as const;
const cardinalities = ["1-n", "1-n?", "1?-n", "n-m", "n?-m", "n?-m?"] as const;
export const queryConstituents: Array<string> = [...aggregates, ...subJoins, ...constraints, ...clauses, "groupBy", "orderBy", "aggregates", ];

export type AggregateType = (typeof aggregates)[number] | null;
export type JoinType = (typeof joins)[number];
export type SubJoinType = (typeof subJoins)[number];
export type CardinalityType = (typeof cardinalities)[number];
export type ConstraintType = (typeof constraints)[number];
export type ClauseType = (typeof clauses)[number];

export type SQLConstituentType = AggregateType | SubJoinType | AggregateType | ConstraintType | ClauseType;

export type SubConstituentCounts = {
    [key in SQLConstituentType]: number;
}

export interface ConstituentCounts extends SubConstituentCounts {
    JOINS: number;
    TABLES: number;
    COLUMNS: number;
}

export const isQueryConstituent = (queryConstituent: string): queryConstituent is SQLConstituentType => {
    return queryConstituents.includes(queryConstituent);
}

export const isInTypeArray = <T, A extends T>(
    item: T,
    array: ReadonlyArray<A>
  ): item is A => (array as ReadonlyArray<unknown>).includes(item as A);

export interface IOptions {
    joinRange: Array<number>;
    joinType: Array<JoinType>;
    cardinalityType: Array<CardinalityType>;
    columnRange: Array<number>;
    constraintRange: Array<number>;
    constraintType: Array<ConstraintType>;
    allowAggregates: boolean;
    aggregateType: Array<AggregateType>;
    forceHavingClause: boolean;
    forceOrderBy: boolean;
    schema: string;
    seed: string;
}

export type Await<T> = T extends {
    then(onfulfilled?: (value: infer U) => unknown): unknown;
}
    ? U
    : T;

export interface IReference {
    columns: { target: string; source: string };
    table: string;
    selfJoin?: boolean;
}

export type numberType = "real" | "int" | "decimal" | "numeric" | "double" | "precision" | "serial";
export type stringType = "char"| "text";
export type dateType = "date" | "time" | "interval";
export type booleanType =  "boolean";
export type uuidType = "uuid";
export type binaryType = "bytea";
export type currencyType = "money";

export interface ITypeMap {
    number: Array<numberType>
    string: Array<stringType>
    date:Array<dateType>
    boolean: Array<booleanType>;
    uuid: Array<uuidType>;
    binary: Array<binaryType>;
    currency: Array<currencyType>;
};

export interface IParsedTable {
    [tableName: string]: {
        references: Array<IReference>;
        columns: {
            [columnName: string]: {
                type: keyof ITypeMap | "unknown";
            };
        };
    };
}

export interface IParsedForeignKeys {
    source: {
        table: any;
        columns: {
            source: any;
            target: any;
        };
    };
    target: {
        table: any;
        columns: {
            source: any;
            target: any;
        };
    };
}

export interface IParsedPrimaryKey {
    [tableName: string]: {
        keyColumns: Array<string>;
    };
}

export interface IMetaData {
    tables: IParsedTable;
    foreignKeys: Array<IParsedForeignKeys>;
    primaryKeys: IParsedPrimaryKey;
    primaryTables?: Array<string>;
    junctionTables?: Array<string>;
    attributeTables?: Array<string>;
}

export interface IEdge {
    table: keyof IParsedTable;
    columns: { source: string; target: string };
    type?: SubJoinType;
    selfJoin?: boolean;
}
export type Path = Array<IEdge>;
export type Paths = Array<Path>;
export interface IJoinables {
    [tableName: string]: Paths;
}

export interface IJoinInstruction {
    table: string;
    path: Path;
}

export interface IColumn {
    name: string;
    type: string;
    aggregation?: AggregateType;
}

export interface IColumns {
    [tableName: string]: Array<IColumn>;
}

export type ConstraintConjunction = "AND" | "OR";
export interface IConstraint {
    operator: string | null;
    values: Array<string | number | null>;
}

export interface IConstraintColumn extends IColumn {
    constraint: IConstraint;
    conjunction?: ConstraintConjunction | null;
}

export interface IConstraintColumns extends IColumns {
    [tableName: string]: Array<IConstraintColumn>;
}

export interface IDestructuredColumn extends IColumn {
    table: string;
    constraint?: IConstraint;
    aggregation?: AggregateType;
}

export interface IDestructuredColumns {
    tables: { [key: string]: [] };
    columns: Array<IDestructuredColumn>;
}

export interface IHavingClauseColumn extends IColumn {
    constraint: IConstraint;
    aggregation: AggregateType;
}

export interface IHavingClause extends IColumns {
    [tableName: string]: Array<IHavingClauseColumn>;
}

export interface IAliasDictionary {
    [tableName: string]: string;
}

export interface IOrderByColumn extends IColumn {
    orderBy: string;
    table: string;
}

export interface IOrderByColumns extends IColumns {
    [tableName: string]: Array<IOrderByColumn>;
}

export interface IStructuredQuery {
    columns: IColumns;
    join: IJoinInstruction;
    whereClause: IConstraintColumns;
    groupBy: IColumns;
    havingClause: IHavingClause;
    orderBy: IOrderByColumns;
    aliasDictionary: IAliasDictionary;
}
