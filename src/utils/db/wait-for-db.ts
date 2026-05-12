import { testConnection } from "../../db";

export const waitForDatabase = async (maxAttempts = 10, delayMs = 2000) => {
    console.log("[DB] Bezig met controleren van database verbinding...");
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await testConnection();
            console.log("[DB] Database is bereikbaar!");
            return;
        } catch (err: any) {
            console.warn(`[DB] Poging ${attempt}/${maxAttempts} mislukt: ${err.message}`);
            if (attempt === maxAttempts) {
                throw new Error(`Database niet bereikbaar na ${maxAttempts} pogingen.`);
            }
            // Exponentiële backoff of vaste delay
            const waitTime = delayMs * Math.min(attempt, 5);
            await new Promise(res => setTimeout(res, waitTime));
        }
    }
};
