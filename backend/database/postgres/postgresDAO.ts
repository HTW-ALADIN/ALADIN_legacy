import { Pool, QueryResult } from "pg";
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "./../../.env" });

export class PgClient {
	// "postgresql://admin:admin@postgres:5432/"
	private connectionString: string = "postgresql://admin:admin@postgres_1:5432/"; //`${process.env.postgresConnection}/`;
	private pool: Pool;
	private connectionAttempts: number = 50;

	constructor(dbName?: string, connectionString?: string) {
		if (!dbName) dbName = "aladin";
		this.connectionString = connectionString ? connectionString : this.connectionString;
		this.connectionString += dbName;
		try {
			this.connect();
		} catch (error) {
			if (this.connectionAttempts) {
				setTimeout(() => {
					this.connect();
				}, 2000);
				this.connectionAttempts--;
			} else {
				throw new Error(error);
			}
		}
	}

	private connect() {
		try {
			this.pool = new Pool({ connectionString: this.connectionString });
		} catch (error) {
			if (this.connectionAttempts) {
				setTimeout(() => {
					this.connect();
				}, 2000);
				this.connectionAttempts--;
			} else {
				throw new Error(error);
			}
		}
	}

	public async queryDB(query: string): Promise<Array<any>> {
		const result: QueryResult = await this.pool.query(query);
		return result.rows;
	}

	public async tearDown() {
		await this.pool.end();
	}
}
