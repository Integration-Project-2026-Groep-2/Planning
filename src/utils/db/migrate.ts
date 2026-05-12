import pool from "../../db";
import fs from "fs";
import path from "path";

const getSchemaPath = () => {
    const compiledPath = path.join(__dirname, "schema.sql");
    if (fs.existsSync(compiledPath)) {
        return compiledPath;
    }

    return path.resolve(process.cwd(), "src/utils/db/schema.sql");
};

export const migrate = async () => {
    const sql = fs.readFileSync(getSchemaPath(), "utf-8");
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
