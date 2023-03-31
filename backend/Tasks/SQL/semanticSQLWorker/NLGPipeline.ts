import HuggingFace, { FillMaskReturn } from 'huggingface';
import { templateString } from "../../../helpers/helperFunctions";
import { knowledgeGraph, structuredKnowledgeGraph, IStructuredKnowledgeGraph } from "./knowledgeGraphReader";
import { attachRuntimes, getFunctionRuntimes } from "./benchmark";
import * as dotenv from "dotenv";
import path from "path";
import {
    SubJoinType,
    IStructuredQuery,
    IJoinInstruction,
    IOrderByColumns,
    IColumns,
    IHavingClause,
    IConstraintColumns,
    IAliasDictionary,
    AggregateType
} from "./types";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

export class NLGPipeline {
    private baselineNlParser: BaselineNLParser;
    private nlParser: NLParser;
    private maskfiller = new MaskFiller();
    constructor(language: string) {
        this.baselineNlParser = new BaselineNLParser(baselineTemplatesPerLanguage[language]);
        this.nlParser = new NLParser(templatesPerLanguage[language]);
    }

    // @attachRuntimes("translateQuery")
    public async translateQuery (query: IStructuredQuery) {
        const baselineNlQuery = this.baselineNlParser.parse(query);
        const nlQuery = this.nlParser.parse(query);

        const unMaskedNlQuery = await this.maskfiller.fillMasks(nlQuery);

        return {
            baselineNlQuery,
            unMaskedNlQuery
        }
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
    booleanTemplate: string;
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
        [key in SubJoinType]: string;
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

type IAggregationTemplate = {
    [key in AggregateType]: string
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

export const baselineTemplatesPerLanguage: ITemplates = {
    de: {
        conjunctions: {
            "&": " and ",
            "|": " or ",
        },
        joinTemplate: {
            nonJoinStartingPhrase: "Use table ${table}.",
            joinStartingPhrase: "Form",
            joinTypes: {
                "RIGHT OUTER JOIN": "the intersection that contains all entries of ${source} and the corresponding entries of ${target}",
                "LEFT OUTER JOIN": "the intersection that contains all entries of ${target} and the corresponding entries of ${source}",
                // "CROSS JOIN": "the cross product of the tables ${source} and ${target}",
                "INNER JOIN": "the intersection that contains the corresponding entries of the tables ${source} and ${target}",
            },
        },
        booleanTemplate: "",
        aggregationTemplate: {
            SUM: "the sum of ${column}",
            AVG: "the average of ${column}",
            MAX: "the maximum of ${column}",
            MIN: "the minimum of ${column}",
            COUNT: "the amount of ${column}",
        },
        operatorTemplate: {
            BETWEEN: "is between ${value1} and ${value2}",
            "<>": "doesn't equal",
            "<": "is smaller than",
            ">": "is greater than",
            "<=": "is smaller or equal than",
            ">=": "is greater or equal than",
            "=": "equals",
            LIKE: {
                0: "contains '${value}'",
                1: "ends with '${value}'",
                2: "starts with '${value}'",
            },
            "NOT LIKE": {
                0: "doesn't contain '${value}'",
                1: "doesn't end with '${value}'",
                2: "doesn't start with'${value}'",
            },
            NULL: "NULL",
            "NOT NULL": "not NULL",
        },
        columnTemplate: {
            columnStartingPhrasePlural: "Return the columns",
            columnStartingPhraseSingular: "Return the column",
            columnEndingPhrase: "",
        },
        constraintTemplate: {
            startingPhrase: "Only return the data for which",
            endingPhrase: "is true",
            LIKEOperatorFallback: { exclude: "contains any string", include: "contains an empty string" },
        },
        groupByTemplate: {
            startingPhrase: "Group the result by",
            endingPhrase: "",
        },
        havingTemplate: {
            startingPhrase: "A further constraint is",
            endingPhrase: "",
        },
        orderByTemplate: {
            startingPhrase: "Sort the result",
            endingPhrase: "",
            direction: {
                ASC: "ascending",
                DESC: "descending",
            },
        },
    },
};

class BaselineNLParser {
    constructor(private template: INLTemplate) {}

    // @attachRuntimes("parseBaseline")
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
            booleanTemplate,
            orderByTemplate,
        } = this.template;
        const parsedJoin = this.parseJoin(join, joinTemplate, conjunctions);
        const parsedColumns = this.parseColumns(columns, columnTemplate, aggregationTemplate, conjunctions);
        const parsedWhereClause = this.parseWhereClause(whereClause, constraintTemplate, operatorTemplate, conjunctions);
        const parsedGroupBy = this.parseGroupBy(groupBy, groupByTemplate, conjunctions);
        const parsedHavingClause = this.parseHavingClause(havingClause, havingTemplate, aggregationTemplate, operatorTemplate);
        const parsedOrderBy = this.parseOrderBy(orderBy, orderByTemplate, conjunctions, booleanTemplate);

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

        return `${startingPhrase} ${parsedColumns}${columnTemplate.columnEndingPhrase}.`;
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
                    parsedConstraint = `${name} is ` + templateString(operatorTemplate["BETWEEN"], { value1: [value1], value2: [value2] });
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
        ].trim()} ${joinedLikeConstraints}.`.replace(/, ([^,]*)$/, " and $1");
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

    private parseOrderBy(orderBy: IOrderByColumns, orderByTemplate: IOrderByTemplate, conjunctions: IConjunctions, booleanTemplate: string) {
        const flattened = Object.entries(orderBy).reduce((flattened, [table, columns]) => {
            const parsedColumns = columns.map((column) => {
                const { name } = column;
                const orderBy = column.orderBy as keyof IOrderByTemplate["direction"];
                return `${orderByTemplate.direction[orderBy]} by ${name}`;
            });

            return [...flattened, ...parsedColumns];
        }, []);

        if (!flattened.length) return "";

        let parsedColumns = this.handleConjunction(flattened.join(", "), conjunctions);

        return `${orderByTemplate.startingPhrase} ${parsedColumns}${orderByTemplate.endingPhrase}.`;
    }
}

export const templatesPerLanguage: ITemplates = {
    de: {
        conjunctions: {
            "&": " and ",
            "|": " or ",
        },
        joinTemplate: {
            nonJoinStartingPhrase: "",
            joinStartingPhrase: "",
            joinTypes: {
                "RIGHT OUTER JOIN": "${target} and [MASK] ${source}, even if [MASK] have no ${target}",
                "LEFT OUTER JOIN": "${source} and [MASK] ${target}, even if [MASK] have no ${source}",
                // "CROSS JOIN": "das kartesische Produkt der Tabellen ${source} und ${target}",
                "INNER JOIN": "${source} and [MASK] corresponding ${target}",
            },
        },
        booleanTemplate: "wether the ${table} is ${column} or not",
        aggregationTemplate: {
            SUM: "the sum of ${column}",
            AVG: "the average of ${column}",
            MAX: "the maximum of ${column}",
            MIN: "the minimum of ${column}",
            COUNT: "the count of ${column}",
        },
        operatorTemplate: {
            BETWEEN: "is between ${value1} and ${value2}",
            "<>": "is not",
            "<": "is smaller than",
            ">": "is larger than",
            "<=": "is smaller or the same as",
            ">=": "is greater or the same as",
            "=": "is",
            LIKE: {
                0: "contains '${value}'",
                1: "ends with '${value}'",
                2: "starts with  '${value}'",
            },
            "NOT LIKE": {
                0: "doesn't contain '${value}'",
                1: "doesn't end with '${value}'",
                2: "doesn't start with  '${value}'",
            },
            NULL: "NULL",
            "NOT NULL": "not NULL",
        },
        columnTemplate: {
            columnStartingPhrasePlural: "",
            columnStartingPhraseSingular: "",
            columnEndingPhrase: "",
        },
        constraintTemplate: {
            startingPhrase: "",
            endingPhrase: "",
            LIKEOperatorFallback: { exclude: "contains any string", include: "contains an empty string" },
        },
        groupByTemplate: {
            startingPhrase: "Group the result by",
            endingPhrase: "",
        },
        havingTemplate: {
            startingPhrase: "",
            endingPhrase: "",
        },
        orderByTemplate: {
            startingPhrase: "Sort the result by ",
            endingPhrase: "",
            direction: {
                ASC: "in ascending order",
                DESC: "in descending order",
            },
        },
    },
};

class NLParser {
    constructor(private template: INLTemplate) {}

    // @attachRuntimes("parseNL")
    public parse({ columns, join, whereClause, havingClause, groupBy, orderBy, aliasDictionary }: IStructuredQuery) {
        const {
            joinTemplate,
            conjunctions,
            aggregationTemplate,
            operatorTemplate,
            columnTemplate,
            constraintTemplate,
            booleanTemplate,
            groupByTemplate,
            havingTemplate,
            orderByTemplate,
        } = this.template;
        const parsedJoin = this.parseJoin(join, joinTemplate, conjunctions, aliasDictionary);
        const parsedColumns = this.parseColumns(columns, columnTemplate, aggregationTemplate, conjunctions, booleanTemplate);
        const parsedWhereClause = this.parseWhereClause(whereClause, constraintTemplate, operatorTemplate, conjunctions);
        const parsedHavingClause = this.parseHavingClause(havingClause, havingTemplate, aggregationTemplate, operatorTemplate);
        const parsedOrderBy = this.parseOrderBy(orderBy, orderByTemplate, conjunctions, booleanTemplate);

        const nlQuery = `Find ${parsedColumns} for all ${parsedJoin} [MASK]${parsedWhereClause} ${parsedHavingClause}${parsedOrderBy}`;
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

    private parseJoin(
        joinInstruction: IJoinInstruction,
        joinTemplate: IJoinTemplate,
        conjunctions: IConjunctions,
        aliasDictionary: IAliasDictionary
    ) {
        const junctionTables = ["person_title", "person_profession", "title_genre"];
        const { table, path } = joinInstruction;

        const tableTypeLookup = Object.entries(structuredKnowledgeGraph).reduce((tableTypeLookup, [tableType, tables]) => {
            Object.keys(tables).forEach((tableName) => (tableTypeLookup[tableName] = tableType));
            return tableTypeLookup;
        }, {} as { [key: string]: string });

        const tablesInJoin = [table, ...path.map((node) => node.table)];
        const { majorEntities, minorEntities, majorAttributes, minorAttributes, semanticEdges } = tablesInJoin.reduce(
            (mappedTables, table) => {
                const tableType = tableTypeLookup[table];

                if (tableType) {
                    if (!(tableType in mappedTables)) {
                        mappedTables[tableType] = {};
                    }
                    mappedTables[tableType][table] = structuredKnowledgeGraph[tableType][table];
                }

                return mappedTables;
            },
            {} as IStructuredKnowledgeGraph
        );

        if (Object.keys(majorEntities).length === 1) {
            const majorTable = Object.values(majorEntities)[0];
            const { sing, plur } = majorTable.alias[0];
            return `${plur}`;
        } else {
            const startTable = Object.keys(majorEntities)[0];
            if (startTable === "person") {
                return "persons and the titles they were involved with"
            } else {
                return "titles and the persons that were involved with them"
            }
        }

        // let source = table;
        // const joins = path.map((edge) => {
        //     const target = edge.table as string;
        //     const joinType = joinTemplate.joinTypes[edge.type];
        //     let join = "";
        //     if (junctionTables.includes(source)) {
        //         join = target;
        //     } else if (junctionTables.includes(target)) {
        //         join = source;
        //     } else {
        //         join = templateString(joinType, { source: [source], target: [target] });
        //     }
        //     source = target;
        //     return join;
        // });

        // let joinStatement = templateString(joinTemplate.nonJoinStartingPhrase, { table: [table] });
        // if (joins.length) {
        //     joinStatement = `${joins.join(conjunctions["&"])} [MASK]`;
        // }

        // return joinStatement;
    }

    private parseColumns(
        columnsPerTable: IColumns,
        columnTemplate: IColumnTemplate,
        aggregationTemplate: IAggregationTemplate,
        conjunctions: IConjunctions,
        booleanTemplate: string,
    ) {
        const { minorAttributes, majorEntities } = structuredKnowledgeGraph;

        const flattened = Object.entries(columnsPerTable).reduce((flattened, [table, columns]) => {
            const parsedColumns = columns.map((column) => {
                const { aggregation, name } = column;

                const semanticName = minorAttributes[name].alias[0].plur;

                const determiner = "the ";
                let parsedColumn = `${determiner}${semanticName}`;

                const booleanColumns = ["is_adult"];
                if (booleanColumns.includes(name)) {
                    const semanticTableName = majorEntities[table].alias[0].plur;
                    parsedColumn = templateString(booleanTemplate, { column: [semanticName], table: [semanticTableName] });
                }
                
                if (aggregation) {
                    parsedColumn = templateString(aggregationTemplate[aggregation], { column: [semanticName] });
                }
                return parsedColumn;
            });
            return [...flattened, ...parsedColumns];
        }, []);

        const startingPhrase =
            flattened.length > 1 ? columnTemplate.columnStartingPhrasePlural : columnTemplate.columnStartingPhraseSingular;

        let parsedColumns = this.handleConjunction(flattened.join(", "), conjunctions);

        return `${startingPhrase}${parsedColumns}`;
    }

    // TODO cleanup this messy code
    private parseWhereClause(
        columnsPerTable: IConstraintColumns,
        constraintTemplate: IConstraintTemplate,
        operatorTemplate: IOperatorTemplate,
        conjunctions: IConjunctions
    ) {
        const { minorAttributes } = structuredKnowledgeGraph;

        const likeConstraints: Array<string> = [];
        const flattened = Object.entries(columnsPerTable).reduce((flattened, [table, columns]) => {
            const parsedColumns = columns.reduce((parsedConstraints, column) => {
                const { constraint, name } = column;
                const operator = constraint.operator as keyof IOperatorTemplate;
                const values = constraint.values as Array<string>;
                const semanticName = minorAttributes[name].alias[0].sing;

                let parsedConstraint = `the ${semanticName} ${operatorTemplate[operator]} '${values[0]}'`;
                if (operator === "BETWEEN") {
                    const [value1, value2] = values;
                    parsedConstraint =
                        `the ${semanticName} ` + templateString(operatorTemplate["BETWEEN"], { value1: [value1], value2: [value2] });
                } else if (/LIKE/i.test(operator)) {
                    let likeConstraint;
                    const [value] = values;
                    const cleanedValue = value.replace(/%/g, "");
                    if (!value) {
                        const exclude = /NOT/i.test(operator);
                        if (exclude) {
                            likeConstraint = `the ${semanticName} ${constraintTemplate.LIKEOperatorFallback.exclude}`;
                        } else {
                            likeConstraint = `the ${semanticName} ${constraintTemplate.LIKEOperatorFallback.include}`;
                        }
                    } else {
                        let option;
                        if (/%\w+/i.test(value)) option = 2;
                        else if (/\w+%/i.test(value)) option = 1;
                        else option = 0;
                        const constraint = templateString(operatorTemplate[operator][option], { value: [cleanedValue] });
                        likeConstraint = `the ${semanticName} ${constraint}`;
                    }
                    likeConstraints.push(likeConstraint);
                    parsedConstraint = "";
                } else if (/NULL/i.test(operator)) {
                    parsedConstraint = `the ${semanticName} ${operatorTemplate[operator]}`;
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
            return `${constraintTemplate.startingPhrase} ${constraints}${constraintTemplate.endingPhrase}.`;
        }

        return `${constraintTemplate.startingPhrase}${constraints} ${constraintTemplate.endingPhrase} ${conjunctions[
            "&"
        ].trim()} ${joinedLikeConstraints}.`.replace(/, ([^,]*)$/, " and $1");
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

    private parseOrderBy(orderBy: IOrderByColumns, orderByTemplate: IOrderByTemplate, conjunctions: IConjunctions, booleanTemplate: string) {
        const { minorAttributes, majorEntities } = structuredKnowledgeGraph;
        const flattened = Object.entries(orderBy).reduce((flattened, [table, columns]) => {
            const parsedColumns = columns.map((column) => {
                const { name } = column;
                const semanticName = minorAttributes[name].alias[0].sing;

                const orderBy = column.orderBy as keyof IOrderByTemplate["direction"];

                const booleanColumns = ["is_adult"];
                const determiner = booleanColumns.includes(name) ? "" : "the ";
                let orderByStatement = `${determiner}${semanticName} ${orderByTemplate.direction[orderBy]}`;

                if (booleanColumns.includes(name)) {
                    const semanticTableName = majorEntities[table].alias[0].plur;
                    orderByStatement = templateString(booleanTemplate, { column: [name], table: [semanticTableName]  }) + ` ${orderByTemplate.direction[orderBy]}`;
                }

                return orderByStatement;
            });

            return [...flattened, ...parsedColumns];
        }, []);

        if (!flattened.length) return "";

        let parsedColumns = this.handleConjunction(flattened.join(", "), conjunctions);

        return `${orderByTemplate.startingPhrase}${parsedColumns}${orderByTemplate.endingPhrase}.`;
    }
}

/**
 * Ease-of-use implementation for replicability. Uses the existing free API and hardware of the Huggingface Transformer platform.
 * But without a proper API token, the rate limit may be reached relatively quickly.
 * 
 * Fills in [MASK]-tokens with suggested tokens by the BERT model.
 */
class MaskFiller {
    private hf: HuggingFace;
    private stopTokens: Array<string> = [
        ".",
        ",",
        ";",
        "?",
        "!",
        "|",
        ":"
    ]

    constructor() {
        this.hf = new HuggingFace(process.env.HUGGINGFACE_TOKEN || "")
    }

    // @attachRuntimes("fillMask")
    public async fillMasks(sequence: string): Promise<string> {
        const splitSequence = this.splitAtMask(sequence);

        let unmaskedSequence = splitSequence.shift();
        while (splitSequence.length) {
            let partialSequence = splitSequence.shift();

            const result = await this.hf.fillMask({
                model: 'bert-large-uncased',
                inputs: `${unmaskedSequence}[MASK]${partialSequence}`,
                
            });
            const unmaskedToken = result.filter(suggestion => !this.stopTokens.includes(suggestion.token_str)).shift().token_str;
            unmaskedSequence = `${unmaskedSequence}[MASK]${partialSequence}`.replace("[MASK]", unmaskedToken);
        }

        return unmaskedSequence;
    }

    private splitAtMask(sequence: string): Array<string> {
        return sequence.split("[MASK]");
    }
}