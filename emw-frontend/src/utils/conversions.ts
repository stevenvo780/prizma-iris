export function convertKeysToEnglish(obj: any) {
  const translationMap: any = {
    Nombre: 'firstName',
    Apellido: 'lastName',
    Telefono: 'phoneNumber',
    Email: 'email',
    Notas: 'notes',
    Etiquetas: 'tags',
    Estado: 'status',
    Idioma: 'language',
    ZonaHoraria: 'timezone',

    Prefijo: 'prefix',
    UltimoContacto: 'lastContact',
    'Campaña': 'campaign',
    Nota: 'note',
    Etiqueta: 'tags',
    NombreEmpresa: 'companyName',
    Titulo: 'title',
    Dato1: 'data1',
    Dato2: 'data2',
    Dato3: 'data3',
  };

  let newObj: any = {};

  for (let key in obj) {
    let newKey: any = translationMap[key] || key;

    const value = obj[key];
    if (value !== null && value !== undefined) {
      newObj[newKey] = String(value).trim();
    } else {
      newObj[newKey] = '';
    }
  }

  // Asegurar que phoneNumber tenga formato +
  if (newObj.phoneNumber && !String(newObj.phoneNumber).startsWith('+')) {
    newObj.phoneNumber = '+' + String(newObj.phoneNumber).trim();
  }

  // Convertir tags de string a array si es necesario
  if (newObj.tags && typeof newObj.tags === 'string') {
    newObj.tags = newObj.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
  }

  return newObj;
}

export function convertKeysToSpanish(obj: any) {
  const translationMap: any = {
    firstName: 'Nombre',
    lastName: 'Apellido',
    phoneNumber: 'Telefono',
    email: 'Email',
    notes: 'Notas',
    tags: 'Etiquetas',
    status: 'Estado',
    language: 'Idioma',
    timezone: 'ZonaHoraria',

    prefix: 'Prefijo',
    phone: 'TelefonoCelular',
    lastContact: 'UltimoContacto',
    campaign: 'Campaña',
    note: 'Nota',
    label: 'Etiqueta',
    companyName: 'NombreEmpresa',
    title: 'Titulo',
    data1: 'Dato1',
    data2: 'Dato2',
    data3: 'Dato3',
  };

  let newObj: any = {};

  for (let key in obj) {
    let newKey: any = translationMap[key];
    if (newKey) {
      const value = obj[key];
      newObj[newKey] = value !== null && value !== undefined ? value : '';
    }
  }

  // Extraer campos de customFields y aplanarlos
  if (obj.customFields && typeof obj.customFields === 'object') {
    const cf = obj.customFields;
    if (cf.company || cf.companyName) newObj['NombreEmpresa'] = cf.company || cf.companyName || '';
    if (cf.title) newObj['Titulo'] = cf.title || '';
    if (cf.campaign) newObj['Campaña'] = cf.campaign || '';
    if (cf.data1) newObj['Dato1'] = cf.data1 || '';
    if (cf.data2) newObj['Dato2'] = cf.data2 || '';
    if (cf.data3) newObj['Dato3'] = cf.data3 || '';
  }

  return newObj;
}
