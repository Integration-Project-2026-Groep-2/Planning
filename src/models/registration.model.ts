export interface Registration {
  registrationId:   string;
  sessionId:        string;
  participantId:    string;
  crmMasterId?:     string;
  registrationTime: string;
}

export interface RegisterParticipantDTO {
  participantId: string;
  crmMasterId?:  string;
}

export interface CancelRegistrationDTO {
  participantId: string;
}
