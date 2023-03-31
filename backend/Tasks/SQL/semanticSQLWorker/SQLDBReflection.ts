import { templateString } from "../../../helpers/helperFunctions";
import { PgClient } from "../../../database/postgres/postgresDAO";

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
                        (SELECT a.attname FROM pg_attribute a 
                            WHERE a.attrelid = m.oid
                                AND a.attnum = o.conkey[1] 
                                AND a.attisdropped = false) 
                            AS source_column,
                        f.relname AS target_table,
                        (SELECT a.attname 
                            FROM pg_attribute a 
                            WHERE a.attrelid = f.oid 
                                AND a.attnum = o.confkey[1] 
                                AND a.attisdropped = false) 
                            AS target_column
                FROM pg_constraint o 
                    LEFT JOIN pg_class f ON f.oid = o.confrelid 
                    LEFT JOIN pg_class m ON m.oid = o.conrelid
                WHERE o.contype = 'f' 
                    AND o.conrelid IN (SELECT oid FROM pg_class c WHERE c.relkind = 'r')
                    AND o.connamespace::regnamespace::text = '\${schema}';`,
    primaryKeys: `SELECT kcu.table_schema,
                        kcu.table_name,
                        tco.constraint_name,
                        kcu.ordinal_position as position,
                        kcu.column_name as key_column
                  FROM information_schema.table_constraints tco
                  JOIN information_schema.key_column_usage kcu 
                        ON kcu.constraint_name = tco.constraint_name
                        AND kcu.constraint_schema = tco.constraint_schema
                        AND kcu.constraint_name = tco.constraint_name
                  WHERE tco.constraint_type = 'PRIMARY KEY'
                        AND kcu.table_schema = '\${schema}'
                  ORDER BY kcu.table_schema, kcu.table_name, position;`,
};

export class SQLDBReflection {
    constructor(private schema: Array<string>, private dbClient: PgClient) {}

    public async reflectDB() {
        return {
            foreignKeys: await this.reflectForeignKeys(),
            tables: await this.reflectTables(),
            primaryKeys: await this.reflectPrimaryKeys(),
        };
    }
    public async reflectForeignKeys() {
        return await this.dbClient.queryDB(templateString(reflectionQueries.foreignKeys, { schema: this.schema }));
    }
    public async reflectTables() {
        return await this.dbClient.queryDB(templateString(reflectionQueries.tables, { schema: this.schema }));
    }
    public async reflectPrimaryKeys() {
        return await this.dbClient.queryDB(templateString(reflectionQueries.primaryKeys, { schema: this.schema }));
    }
}
