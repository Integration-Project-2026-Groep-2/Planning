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
        console.log("Alle tabellen aangemaakt!");
    } catch (err) {
        console.error("Fout bij aanmaken tabellen:", err);
    }
};

if (require.main === module) {
    void migrate().finally(() => {
        void pool.end();
    });
}
