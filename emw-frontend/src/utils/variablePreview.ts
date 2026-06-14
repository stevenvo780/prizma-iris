export const WHATSAPP_EXAMPLE_VALUES: Record<string, string> = {
  '{{firstName}}': 'Juan',
  '{{lastName}}': 'Pérez',
  '{{companyName}}': 'Empresa S.A.',
  '{{lastContact}}': '2025-06-01',
  '{{campaign}}': 'Campaña de Verano',
  '{{note}}': 'Nota de ejemplo',
  '{{label}}': 'VIP',
  '{{title}}': 'Sr.',
  '{{data1}}': 'Dato1',
  '{{data2}}': 'Dato2',
  '{{data3}}': 'Dato3',
};

export function getWhatsappPreview(text: string): string {
  let preview = text;
  Object.entries(WHATSAPP_EXAMPLE_VALUES).forEach(([key, value]) => {
    preview = preview.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
  });
  return preview;
}

/**
 * Convierte placeholders numéricos ({{1}}, {{2}}) de vuelta a variables descriptivas ({{firstName}}, {{lastName}})
 * usando el mapping guardado en templateParameters
 */
export function convertNumericToDescriptivePlaceholders(
  text: string,
  templateParameters: string | null,
): string {
  if (!templateParameters) return text;

  try {
    const mapping: Record<string, number> = JSON.parse(templateParameters);
    let result = text;

    const reverseMapping: Record<number, string> = {};
    Object.entries(mapping).forEach(([varName, num]) => {
      reverseMapping[num] = varName;
    });

    Object.entries(reverseMapping).forEach(([num, varName]) => {
      const numericPlaceholder = `{{${num}}}`;
      const descriptivePlaceholder = `{{${varName}}}`;
      result = result.replace(
        new RegExp(numericPlaceholder.replace(/[{}]/g, '\\$&'), 'g'),
        descriptivePlaceholder,
      );
    });

    return result;
  } catch (error) {
    console.warn('Error al convertir placeholders numéricos a descriptivos:', error);
    return text;
  }
}

/**
 * Obtiene el texto del template con variables descriptivas y genera un preview con valores de ejemplo
 */
export function getTemplateDisplayText(
  templateBody: string,
  templateParameters: string | null,
): { descriptiveText: string; previewText: string } {
  const descriptiveText = convertNumericToDescriptivePlaceholders(templateBody, templateParameters);
  const previewText = getWhatsappPreview(descriptiveText);

  return { descriptiveText, previewText };
}
