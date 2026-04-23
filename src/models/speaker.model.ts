export interface Speaker {
  speakerId:   string;
  crmMasterId?: string;
  firstName:   string;
  lastName:    string;
  email:       string;
  phoneNumber?: string;
  company?:    string;
  isActive:    boolean;
}

export interface CreateSpeakerDTO {
  firstName:    string;
  lastName:     string;
  email:        string;
  phoneNumber?: string;
  company?:     string;
}

export interface UpdateSpeakerDTO {
  firstName?:   string;
  lastName?:    string;
  email?:       string;
  phoneNumber?: string;
  company?:     string;
}
