import { js2xml } from 'xml-js';

export function buildXml(rootElement: string, data: Record<string, unknown>): string {
  const obj = {
    _declaration: {
      _attributes: {
        version: '1.0',
        encoding: 'UTF-8',
      },
    },
    [rootElement]: convertToXmlJs(data),
  };

  return js2xml(obj, { compact: true, spaces: 2 });
}

function convertToXmlJs(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue; // optionele velden overslaan
    result[key] = { _text: String(value) };
  }

  return result;
}