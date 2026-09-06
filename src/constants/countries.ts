export interface CountryData {
  code: string;
  flag: string;
  ddi: string;
  name: string;
}

const PRIORITY_CODES = ["BR", "PT", "US", "ES", "FR", "DE", "JP"];

export const ALL_COUNTRIES: CountryData[] = [
  // 🎯 LOCALES SUPORTADOS (TOP PRIORIDADE)
  { code: "BR", flag: "🇧🇷", ddi: "+55", name: "Brasil" },
  { code: "PT", flag: "🇵🇹", ddi: "+351", name: "Portugal" },
  { code: "US", flag: "🇺🇸", ddi: "+1", name: "Estados Unidos / Canadá" },
  { code: "ES", flag: "🇪🇸", ddi: "+34", name: "Espanha" },
  { code: "FR", flag: "🇫🇷", ddi: "+33", name: "França" },
  { code: "DE", flag: "🇩🇪", ddi: "+49", name: "Alemanha" },
  { code: "JP", flag: "🇯🇵", ddi: "+81", name: "Japão" },

  // 🌎 AMÉRICAS
  { code: "AR", flag: "🇦🇷", ddi: "+54", name: "Argentina" },
  { code: "MX", flag: "🇲🇽", ddi: "+52", name: "México" },
  { code: "CL", flag: "🇨🇱", ddi: "+56", name: "Chile" },
  { code: "CO", flag: "🇨🇴", ddi: "+57", name: "Colômbia" },
  { code: "UY", flag: "🇺🇾", ddi: "+598", name: "Uruguai" },
  { code: "PE", flag: "🇵🇪", ddi: "+51", name: "Peru" },
  { code: "PY", flag: "🇵🇾", ddi: "+595", name: "Paraguai" },
  { code: "BO", flag: "🇧🇴", ddi: "+591", name: "Bolívia" },
  { code: "EC", flag: "🇪🇨", ddi: "+593", name: "Equador" },
  { code: "VE", flag: "🇻🇪", ddi: "+58", name: "Venezuela" },
  { code: "CR", flag: "🇨🇷", ddi: "+506", name: "Costa Rica" },
  { code: "PA", flag: "🇵🇦", ddi: "+507", name: "Panamá" },
  { code: "DO", flag: "🇩🇴", ddi: "+1", name: "República Dominicana" },

  // 🌍 EUROPA
  { code: "IT", flag: "🇮🇹", ddi: "+39", name: "Itália" },
  { code: "GB", flag: "🇬🇧", ddi: "+44", name: "Reino Unido" },
  { code: "LU", flag: "🇱🇺", ddi: "+352", name: "Luxemburgo" },
  { code: "CH", flag: "🇨🇭", ddi: "+41", name: "Suíça" },
  { code: "BE", flag: "🇧🇪", ddi: "+32", name: "Bélgica" },
  { code: "NL", flag: "🇳🇱", ddi: "+31", name: "Holanda" },
  { code: "IE", flag: "🇮🇪", ddi: "+353", name: "Irlanda" },
  { code: "AT", flag: "🇦🇹", ddi: "+43", name: "Áustria" },
  { code: "SE", flag: "🇸🇪", ddi: "+46", name: "Suécia" },
  { code: "NO", flag: "🇳🇴", ddi: "+47", name: "Noruega" },
  { code: "DK", flag: "🇩🇰", ddi: "+45", name: "Dinamarca" },
  { code: "FI", flag: "🇫🇮", ddi: "+358", name: "Finlândia" },
  { code: "PL", flag: "🇵🇱", ddi: "+48", name: "Polônia" },
  { code: "GR", flag: "🇬🇷", ddi: "+30", name: "Grécia" },

  // 🌍 ÁFRICA
  { code: "AO", flag: "🇦🇴", ddi: "+244", name: "Angola" },
  { code: "MZ", flag: "🇲🇿", ddi: "+258", name: "Moçambique" },
  { code: "CV", flag: "🇨🇻", ddi: "+238", name: "Cabo Verde" },
  { code: "ZA", flag: "🇿🇦", ddi: "+27", name: "África do Sul" },
  { code: "NG", flag: "🇳🇬", ddi: "+234", name: "Nigéria" },
  { code: "EG", flag: "🇪🇬", ddi: "+20", name: "Egito" },
  { code: "MA", flag: "🇲🇦", ddi: "+212", name: "Marrocos" },
  { code: "KE", flag: "🇰🇪", ddi: "+254", name: "Quênia" },
  { code: "GH", flag: "🇬🇭", ddi: "+233", name: "Gana" },
  { code: "SN", flag: "🇸🇳", ddi: "+221", name: "Senegal" },
];

export const COUNTRY_CODES: CountryData[] = [
  ...ALL_COUNTRIES.filter((c) => PRIORITY_CODES.includes(c.code)),
  ...ALL_COUNTRIES
    .filter((c) => !PRIORITY_CODES.includes(c.code))
    .sort((a, b) => a.name.localeCompare(b.name)),
];