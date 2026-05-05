import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import * as validator from 'xsd-schema-validator';

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

  LocationCreated: 'location.xsd',
  LocationUpdated: 'location.xsd',
  LocationDeleted: 'location.xsd',
  PlanningLocationsAll: 'location.xsd',

  PlanningLocationCreated: 'location.xsd',
PlanningLocationUpdated: 'location.xsd',
PlanningLocationDeleted: 'location.xsd',

PlanningSpeakerCreated: 'speaker.xsd',
PlanningSpeakerUpdated: 'speaker.xsd',
PlanningSpeakerDeactivated: 'speaker.xsd',
  SpeakerCreated: 'speaker.xsd',
  SpeakerUpdated: 'speaker.xsd',
  SpeakerDeactivated: 'speaker.xsd',
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

export const validateXml = async (
  xml: string,
  expectedRoot: string
): Promise<boolean> => {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      ignoreDeclaration: true,
      trimValues: true,
    });

    const parsed = parser.parse(xml);
    const rootElement = Object.keys(parsed)[0];

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

    const result = await validator.validateXML(xml, schemaPath);

    if (!result.valid) {
      console.error(
        `[XML Validator] XSD validatie mislukt voor '${rootElement}':`,
        result.messages
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