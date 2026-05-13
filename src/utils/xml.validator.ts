import path from "path";
import { XMLParser } from "fast-xml-parser";
import * as validator from "xsd-schema-validator";

const schemaMap: Record<string, string> = {
    /*
   |--------------------------------------------------------------------------
   | CONTROL ROOM
   |--------------------------------------------------------------------------
   */

    Heartbeat: "controlroom.xsd",
    SessionError: "controlroom.xsd",
    LogEvent: "controlroom.xsd",

    /*
   |--------------------------------------------------------------------------
   | SESSIONS
   |--------------------------------------------------------------------------
   */

    SessionCreated: "session.xsd",
    SessionUpdated: "session.xsd",
    SessionCancelled: "session.xsd",
    SessionRescheduled: "session.xsd",
    SessionFull: "session.xsd",
    ParticipantRegistered: "session.xsd",
    SessionsRequested: "session.xsd",
    SessionsAll: "session.xsd",
    FrontendSessionUpdated: "session.xsd",
    FrontendSessionCancelled: "session.xsd",
    RegistrationCreated: "session.xsd",
    RegistrationConfirmed: "session.xsd",
    FrontendSessionRescheduled: "session.xsd",

    /*
   |--------------------------------------------------------------------------
   | LOCATIONS
   |--------------------------------------------------------------------------
   */

    LocationCreated: "location.xsd",
    LocationUpdated: "location.xsd",
    LocationDeleted: "location.xsd",
    LocationsRequested: "location.xsd",
    LocationsAll: "location.xsd",

    /*
   |--------------------------------------------------------------------------
   | SPEAKERS
   |--------------------------------------------------------------------------
   */

    SpeakerCreated: "speaker.xsd",
    SpeakerUpdated: "speaker.xsd",
    SpeakerDeactivated: "speaker.xsd",
    SpeakersRequested: "speaker.xsd",
    SpeakersAll: "speaker.xsd",

    /*
   |--------------------------------------------------------------------------
   | CRM -> PLANNING
   |--------------------------------------------------------------------------
   */

    UserConfirmed: "crm.xsd",
    UserUpdated: "crm.xsd",
    UserDeactivated: "crm.xsd",

    /*
   |--------------------------------------------------------------------------
   | PLANNING -> CRM
   |--------------------------------------------------------------------------
   */

    PlanningUserCreated: "user.xsd",
    PlanningUserUpdated: "user.xsd",
    PlanningUserDeactivated: "user.xsd",
};

const getSchemaPath = (rootElement: string): string | null => {
    const schemaFile = schemaMap[rootElement];

    if (!schemaFile) {
        return null;
    }

    return path.join(__dirname, "../schema", schemaFile);
};

export const validateXml = async (
    xml: string,
    expectedRoot: string,
): Promise<boolean> => {
    try {
        const parser = new XMLParser({
            ignoreAttributes: false,
            ignoreDeclaration: true,
            trimValues: true,
        });

        const parsed = parser.parse(xml);

        const rootElement = Object.keys(parsed)[0];

        /*
     |--------------------------------------------------------------------------
     | ROOT VALIDATION
     |--------------------------------------------------------------------------
     */

        if (rootElement !== expectedRoot) {
            console.error(
                `[XML Validator] Root element '${rootElement}', verwacht '${expectedRoot}'`,
            );

            return false;
        }

        /*
     |--------------------------------------------------------------------------
     | XSD FILE
     |--------------------------------------------------------------------------
     */

        const schemaPath = getSchemaPath(rootElement);

        if (!schemaPath) {
            console.error(
                `[XML Validator] Geen XSD gekoppeld aan '${rootElement}'`,
            );

            return false;
        }

        /*
     |--------------------------------------------------------------------------
     | XSD VALIDATION
     |--------------------------------------------------------------------------
     */

        const result = await validator.validateXML(xml, schemaPath);

        if (!result.valid) {
            console.error(
                `[XML Validator] XSD validatie mislukt voor '${rootElement}':`,
                result.messages,
            );

            return false;
        }

        console.log(`[XML Validator] XML valid voor '${rootElement}'`);

        return true;
    } catch (error) {
        console.error(
            `[XML Validator] Fout bij valideren van XML voor '${expectedRoot}':`,
            error,
        );

        return false;
    }
};
