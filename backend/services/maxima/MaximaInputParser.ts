interface IInput {
    type: keyof MaximaInputParser;
    object: any;
}

class MaximaInputParser {
    public parse(input: IInput): any {
        const { type, object } = input;
        return this[type](object);
    }

    private matrix(matrix: Array<Array<any>>) {
        const substrings = matrix.reduce((substrings, row) => {
            const rowString = row.join(",");
            substrings.push(`[${rowString}]`);
            return substrings;
        }, []);
        const rows = substrings.join(",");
        return `matrix(${rows})`;
    }
}

export { MaximaInputParser, IInput };
