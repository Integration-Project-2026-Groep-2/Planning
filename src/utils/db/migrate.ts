import pool from "../../db";
import fs from "fs";
import path from "path";

const getSchemaPath = () => {
    const paths = [
        path.join(__dirname, "schema.sql"),
        path.join(__dirname, "../../../src/utils/db/schema.sql"),
        path.resolve(process.cwd(), "src/utils/db/schema.sql"),
        path.resolve(process.cwd(), "schema.sql"),
    ];

    for (const p of paths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }

    throw new Error("schema.sql niet gevonden in bekende locaties.");
};

export const migrate = async () => {
    const schemaPath = getSchemaPath();
    const sql = fs.readFileSync(schemaPath, "utf-8");
    const dbConfig = (pool as any).options;
    console.log(`[DB] Start migratie op host: ${dbConfig.host}, database: ${dbConfig.database} (schema: ${schemaPath})`);
    try {
        await pool.query(sql);
        console.log("[DB] Alle tabellen aangemaakt!");
    } catch (err: any) {
        console.error("[DB] Fout bij aanmaken tabellen:", err);
        throw new Error(`Migratie mislukt: ${err.message}`);
    }
};

if (require.main === module) {
    void migrate().finally(() => {
        void pool.end();
    });
}
