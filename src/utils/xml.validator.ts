import { XMLParser, XMLValidator } from 'fast-xml-parser';

export const validateXml = (xml: string, expectedRoot: string): boolean => {
  // 1. Basis XML validatie (syntax check)
  const validation = XMLValidator.validate(xml);

  if (validation !== true) {
    console.error(`[XML Validator] Ongeldige XML voor ${expectedRoot}:`, validation);
    return false;
  }

  try {
    // 2. Parse XML → JSON
    const parser = new XMLParser({
      ignoreAttributes: false,
      ignoreDeclaration: true, // 🔥 BELANGRIJK → negeert <?xml ... ?>
      trimValues: true,
    });

    const parsed = parser.parse(xml);

    // 3. Root element ophalen
    const rootElement = Object.keys(parsed)[0];

    // 4. Check of root correct is
    if (rootElement !== expectedRoot) {
      console.error(
        `[XML Validator] Root element '${rootElement}' maar verwacht '${expectedRoot}'`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      `[XML Validator] Fout bij parsen van XML voor ${expectedRoot}:`,
      error
    );
    return false;
  }
};