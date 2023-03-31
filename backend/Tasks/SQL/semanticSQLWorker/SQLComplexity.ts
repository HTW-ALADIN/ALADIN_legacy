import { SQLParser } from "./SQLParser";
import { 
    ConstituentCounts,
    SQLConstituentType,
    isQueryConstituent
} from "./types"


type QueryComplexityFormula = {
    [key in SQLConstituentType]?: IQueryConstituentComplexityFormula
}

interface IQueryConstituentComplexityFormula extends QueryComplexityFormula {
    weight: number;
    diminishingReturnIntervals: Array<IDiminishingReturnInterval>
}

interface IDiminishingReturnInterval {
    lowerBound: number;
    upperBound: number;
    penaltyFactor: number;
}

const trivialComplexityIntervals = [
    {
        lowerBound: 0,
        upperBound: 1,
        penaltyFactor: 1
    },
    {
        lowerBound: 2,
        upperBound: Infinity,
        penaltyFactor: 0
    }
];

const column = {
    weight: 1,
    diminishingReturnIntervals: trivialComplexityIntervals
};
const aggregate = {
    weight: 1.5,
    diminishingReturnIntervals: [
        {
            lowerBound: 0,
            upperBound: 1,
            penaltyFactor: 1
        },
        {
            lowerBound: 0,
            upperBound: Infinity,
            penaltyFactor: 0
        }
    ]
};
const selectList = {
    column,
    aggregate,
};

const innerJoin = {};
const partialOuterJoin = {};
const fullOuterJoin = {};
const crossJoin = {};
const tableReference = {
    innerJoin,
    partialOuterJoin,
    fullOuterJoin,
    crossJoin
};

const whereClause = {};
const groupBy = {};
const havingClause = {};
const orderBy = {};

const queryComplexityFormula: QueryComplexityFormula = {
    selectList: {
        ...selectList,
        weight: 1,
        diminishingReturnIntervals: trivialComplexityIntervals
    },
    // tableReference,
    // whereClause,
    // groupBy,
    // havingClause,
    // orderBy
};

interface IStepFunction {
    (n: number): Array<number>;
};

export class SQLComplexity {
    constructor (private complexityFormula: QueryComplexityFormula, private sqlParser: SQLParser) {}

    public computeQueryComplexity(query: string, constrainComplexity: boolean = false): number {
        const queryAST = this.sqlParser.parseSQLToAST([query])[0];
        const constituentCounts = this.sqlParser.retrieveConstituentCounts(queryAST);

        const queryComplexity = this.calculateConstituentComplexity(this.complexityFormula, constituentCounts as unknown as ConstituentCounts);
        const normalizedQueryComplexity = this.normalizeConstituentComplexity(
            queryComplexity,
            this.complexityFormula,
            constrainComplexity ? constituentCounts : {} as ConstituentCounts
        )

        return normalizedQueryComplexity;
    }

    private calculateConstituentComplexity(complexityFormula: QueryComplexityFormula, constituentCounts: ConstituentCounts): number {
        return Object.entries(complexityFormula).reduce((sum, [queryConstituent, complexityClause]) => {
            const { weight, diminishingReturnIntervals, ...nestedConstituents } = complexityClause;

            const stepFunction = this.constructStepFunction(diminishingReturnIntervals);

            let localComplexityScore = 0;
            if (isQueryConstituent(queryConstituent)) {
                const n = constituentCounts[queryConstituent];
                localComplexityScore = this.calculateLocalComplexityScore(stepFunction(n), weight);
            }

            return sum + localComplexityScore + this.calculateConstituentComplexity(nestedConstituents, constituentCounts);
        }, 0)
    }

    private normalizeConstituentComplexity(queryComplexityScore: number, complexityFormula: QueryComplexityFormula, constituentCounts: ConstituentCounts) {
        const maxComplexityScore = this.calculateMaxComplexityScore(complexityFormula, constituentCounts);
        return queryComplexityScore / maxComplexityScore;
    }

    private calculateMaxComplexityScore(complexityFormula: QueryComplexityFormula, constituentCounts: ConstituentCounts): number {
        const maxConstituentCounts = Object.keys(constituentCounts).length ? 
            this.getMaxConstituentCounts(complexityFormula) : 
            this.getMaxConstituentCounts(this.pruneConstituents(complexityFormula, constituentCounts));

        return this.calculateConstituentComplexity(complexityFormula, maxConstituentCounts);
    }

    private pruneConstituents(complexityFormula: QueryComplexityFormula, constituentCounts: ConstituentCounts): QueryComplexityFormula {
        return Object.keys(complexityFormula).reduce((prunedComplexityFormula, queryConstituent) => {
            // requires custom typeguard as Object.-methods don't infer type from generics due to JS-compatibility
            if (isQueryConstituent(queryConstituent)) {
                const { weight, diminishingReturnIntervals, ...nestedConstituents } = complexityFormula[queryConstituent]
                if (constituentCounts[queryConstituent] > 0) {
                    prunedComplexityFormula[queryConstituent] = {
                        weight,
                        diminishingReturnIntervals,
                        ...this.pruneConstituents(nestedConstituents, constituentCounts)
                    }
                }
            }
            return prunedComplexityFormula;
        }, {} as QueryComplexityFormula);
    }

    private getMaxConstituentCounts(complexityFormula: QueryComplexityFormula): ConstituentCounts {
        return Object.entries(complexityFormula).map(([queryConstituent, complexityClause]) => {
            const { weight, diminishingReturnIntervals, ...nestedConstituents } = complexityClause;

            const stepFunction = this.constructStepFunction(diminishingReturnIntervals);
            const maxN = diminishingReturnIntervals[diminishingReturnIntervals.length-1].lowerBound;
            const maxLocalComplexityScore = this.calculateLocalComplexityScore(stepFunction(maxN), weight);

            return maxLocalComplexityScore;
        }) as unknown as ConstituentCounts;
    }

    private calculateLocalComplexityScore(penaltyFactors: Array<number>, weight: number) {
        return penaltyFactors.reduce((sum, penaltyFactor) => {
            return sum + (weight * penaltyFactor);
        }, 0);
    }

    private constructStepFunction(intervals: Array<IDiminishingReturnInterval>): IStepFunction {
        return (n: number) => {
            return range(n).map((i) => {
                for (const interval of intervals) {
                    if (i >= interval.lowerBound && i <= interval.upperBound) {
                        return interval.penaltyFactor;
                    }
                }
            });
        }
    }
}

const range = (
    size: number, 
    startAt: number = 0, 
    stepSize: number = 1
    ): ReadonlyArray<number> => Array.from(
        {
            length: (size - startAt) / stepSize + 1
        }, 
        (_, i) => startAt + (i * stepSize)
    );