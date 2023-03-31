interface IOutput {
    type: keyof MaximaOutputParser;
    output: Array<string>;
}

class MaximaOutputParser {
    public parse(input: IOutput): any {
        const { type, output } = input;
        if (type !== "parse") return this[type](output);
    }

    public matrix(output: Array<string>) {
        return output.reduce((parsed, row) => {
            const splitRows = row.split("\n");
            splitRows.forEach((splitRow) => {
                const matrixRow = splitRow.match(/(-?\s?\d+\s)/g);
                if (matrixRow) {
                    parsed.push(matrixRow.map((v) => v.replace(/ /g, "")));
                }
            });
            return parsed;
        }, []);
    }
}

export { MaximaOutputParser, IOutput };
