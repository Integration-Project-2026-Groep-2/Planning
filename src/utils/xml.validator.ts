import fs from 'fs';
import path from 'path';
import { parseXml } from 'libxmljs2';

const schemaMap: Record<string, string> = {
  Heartbeat: 'controlroom.xsd',

  SessionCreated: 'session.xsd',
  SessionUpdated: 'session.xsd',
  SessionCancelled: 'session.xsd',
  SessionRescheduled: 'session.xsd',
  SessionFull: 'session.xsd',
  SessionError: 'session.xsd',
  ParticipantRegistered: 'session.xsd',
  PlanningSessionsAll: 'session.xsd',

  PlanningLocationCreated: 'location.xsd',
  PlanningLocationUpdated: 'location.xsd',
  PlanningLocationDeleted: 'location.xsd',
  PlanningLocationsAll: 'location.xsd',

  PlanningSpeakerCreated: 'speaker.xsd',
  PlanningSpeakerUpdated: 'speaker.xsd',
  PlanningSpeakerDeactivated: 'speaker.xsd',
  PlanningSpeakersAll: 'speaker.xsd',

  FrontendLocationCreated: 'frontend.xsd',
  FrontendLocationUpdated: 'frontend.xsd',
  FrontendLocationDeleted: 'frontend.xsd',
  FrontendSpeakerCreated: 'frontend.xsd',
  FrontendSpeakerUpdated: 'frontend.xsd',
  FrontendSpeakerDeactivated: 'frontend.xsd',
  FrontendSessionCreated: 'frontend.xsd',
  FrontendSessionUpdated: 'frontend.xsd',
  FrontendSessionCancelled: 'frontend.xsd',
  FrontendSessionsRequested: 'frontend.xsd',
  FrontendLocationsRequested: 'frontend.xsd',
  FrontendSpeakersRequested: 'frontend.xsd',

  UserConfirmed: 'crm.xsd',
  UserUpdated: 'crm.xsd',
  UserDeactivated: 'crm.xsd',
  CompanyConfirmed: 'crm.xsd',
  CompanyUpdated: 'crm.xsd',
  CompanyDeactivated: 'crm.xsd',
  PlanningUserCreated: 'crm.xsd',
  PlanningUserUpdated: 'crm.xsd',
  PlanningUserDeactivated: 'crm.xsd',
};

const getSchemaPath = (rootElement: string): string | null => {
  const schemaFile = schemaMap[rootElement];
  if (!schemaFile) return null;

  return path.join(__dirname, '../schema', schemaFile);
};

export const validateXml = (xml: string, expectedRoot: string): boolean => {
  try {
    const xmlDoc = parseXml(xml);
    const rootElement = xmlDoc.root()?.name();

    if (!rootElement) {
      console.error('[XML Validator] Geen root element gevonden');
      return false;
    }

    if (rootElement !== expectedRoot) {
      console.error(
        `[XML Validator] Root element '${rootElement}', verwacht '${expectedRoot}'`
      );
      return false;
    }

    const schemaPath = getSchemaPath(rootElement);

    if (!schemaPath) {
      console.error(`[XML Validator] Geen XSD gekoppeld aan '${rootElement}'`);
      return false;
    }

    if (!fs.existsSync(schemaPath)) {
      console.error(`[XML Validator] XSD bestand niet gevonden: ${schemaPath}`);
      return false;
    }

    const xsdContent = fs.readFileSync(schemaPath, 'utf-8');
    const xsdDoc = parseXml(xsdContent, { baseUrl: schemaPath });

    const isValid = xmlDoc.validate(xsdDoc);

    if (!isValid) {
      console.error(
        `[XML Validator] XSD validatie mislukt voor '${rootElement}':`,
        xmlDoc.validationErrors
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      `[XML Validator] Fout bij valideren van XML voor '${expectedRoot}':`,
      error
    );
    return false;
  }
};