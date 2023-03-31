import axios from "axios";

const parameters = {
    joinRange: [1, 2],
    columnRange: [1, 4],
    constraintRange: [1, 3],
    allowAggregates: true,
    forceHavingClause: false,
    forceOrderBy: true,
    schema: "northwind",
    seed: "",
};

(async () => {
    try {
        // const res = await sqlQueryGenerator({ language: "en", parameters });
        let { data } = await axios({
            method: "post",
            url: "http://localhost:3000/api/SQL/generateQuery",
            data: {
                parameters,
                language: "de",
                task: "sql",
                type: "sql",
                instruction: "generateQuery",
            },
        });
        const { query, result } = JSON.parse(data);

        // const code = `
        // SELECT su.company_name, su.postal_code, su.supplier_id, p.product_name
        // FROM northwind.suppliers as su
        // LEFT OUTER JOIN northwind.products as p
        // ON su.supplier_id = p.supplier_id
        // WHERE su.supplier_id BETWEEN '13' AND '14'
        // GROUP BY su.company_name, su.postal_code, su.supplier_id, su.region, p.product_name
        // ORDER BY su.region DESC;
        // `;
        // let res = await axios({
        //     method: "post",
        //     url: "http://localhost:3000/api/SQL/validateQuery",
        //     data: {
        //         parameters: { expectedResult: result, query: code, schema: "northwind" },
        //         code: "",
        //         language: "de",
        //         task: "SQL",
        //         type: "SQL",
        //         instruction: "generateQuery",
        //     },
        // });
        // const { isMatchingResult, userResult } = JSON.parse(res["data"]);

        console.log(query);

        // console.log(isMatchingResult, userResult);
    } catch (err) {
        console.log(err);
    }
})();
