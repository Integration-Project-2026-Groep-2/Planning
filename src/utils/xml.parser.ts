import { parseStringPromise } from 'xml2js';
import { validateXml } from './xml.validator';

export const parseXml = async (xml: string, rootElement: string) => {
  const isValid = validateXml(xml, rootElement);

  if (!isValid) {
    throw new Error(`Ongeldige XML voor ${rootElement}`);
  }

  const parsed = await parseStringPromise(xml, {
    explicitArray: false,
    trim: true,
  });

  return parsed[rootElement];
};