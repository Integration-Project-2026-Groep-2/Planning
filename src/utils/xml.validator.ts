import { XMLParser, XMLValidator } from 'fast-xml-parser';

export function validateXml(xml: string, expectedRoot: string): boolean {
  try {
    // Stap 1: is het geldige XML?
    const result = XMLValidator.validate(xml);
    if (result !== true) {
      console.error(`[XML Validator] Ongeldige XML voor ${expectedRoot}:`, result);
      return false;
    }

    // Stap 2: klopt het root element?
    const parser = new XMLParser();
    const parsed = parser.parse(xml);
    const rootElement = Object.keys(parsed)[0];

    if (rootElement !== expectedRoot) {
      console.error(
        `[XML Validator] Root element '${rootElement}' maar verwacht '${expectedRoot}'`
      );
      return false;
    }

    // Validatie geslaagd
    return true;

  } catch (error) {
    console.error(`[XML Validator] Fout bij validatie van ${expectedRoot}:`, error);
    return false;
  }
}