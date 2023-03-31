import { PgClient } from "../../database/postgres/postgresDAO";
import fs from "fs";

(async () => {
    const dbClient = new PgClient("imdb", "postgresql://admin:admin@localhost:5432/");
    let res = await dbClient.queryDB("SELECT tconst, nconst FROM imdb.title_principals;");
    console.log("data fetched");
    const t_stream = fs.createWriteStream("title_principals_tconst.csv");
    const n_stream = fs.createWriteStream("title_principals_nconst.csv");
    const tconstSet = new Set();
    const nconstSet = new Set();
    for (let i = 0; i < res.length; i++) {
        const { tconst, nconst } = res.pop();
        if (!tconstSet.has(tconst)) {
            tconstSet.add(tconst);
            t_stream.write(tconst + "\n");
        }
        if (!nconstSet.has(nconst)) {
            nconstSet.add(nconst);
            n_stream.write(nconst + "\n");
        }
    }
    console.log("data written");
})();
