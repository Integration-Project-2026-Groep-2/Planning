export interface ChangeLog {
  logId:        string;
  sessionId:    string;
  oldStartTime: string | null;
  newStartTime: string | null;
  oldEndTime:   string | null;
  newEndTime:   string | null;
  reason:       string | null;
  changedAt:    string;
  changedBy:    string | null;
}

export interface CreateLogDTO {
  sessionId:    string;
  oldStartTime: string | null;
  newStartTime: string | null;
  oldEndTime:   string | null;
  newEndTime:   string | null;
  reason:       string | null;
  changedBy?:   string | null;
}
