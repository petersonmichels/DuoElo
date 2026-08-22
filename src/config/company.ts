// 🇱🇺 DADOS CORPORATIVOS OFICIAIS DA BARNX S.A R.L.-S (LUXEMBURGO)
export const BARNX_COMPANY_DATA = {
  legalName: "BARNX S.A R.L.-S",
  rcsNumber: "B308846", // Registre de Commerce et des Sociétés (RCS)
  businessPermitNumber: "10196485/0", // Autorisation d'établissement
  legalForm: "Société à responsabilité limitée simplifiée",
  managingDirector: "Peterson Michels",
  registeredAddress: {
    street: "Wämperweeg",
    number: "5",
    postalCode: "L-9980",
    locality: "Wilwerdange",
    country: "Grand-Duché de Luxembourg",
  },
  supportEmail: "suporte@duoelo.lu",
  privacyEmail: "privacy@duoelo.lu",
  domain: "https://duoelo.lu",
  ccssMatricule: "1977092902942",
} as const;

/**
 * Retorna o endereço corporativo oficial formatado para termos e rodapés legais
 */
export const getFormattedCompanyAddress = (): string => {
  const { street, number, postalCode, locality, country } = BARNX_COMPANY_DATA.registeredAddress;
  return `${number}, ${street}, ${postalCode} ${locality}, ${country}`;
};