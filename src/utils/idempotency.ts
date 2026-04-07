import { query } from '../db';

export const isAlreadyProcessed = async (
  messageId: string
): Promise<boolean> => {
  const result = await query(
    `SELECT 1 FROM "ProcessedMessages" WHERE "messageId" = $1`,
    [messageId]
  );
  return (result.rowCount ?? 0) > 0;
};

export const markAsProcessed = async (messageId: string): Promise<void> => {
  await query(
    `INSERT INTO "ProcessedMessages" ("messageId", "processedAt")
     VALUES ($1, NOW())
     ON CONFLICT ("messageId") DO NOTHING`,
    [messageId]
  );
};