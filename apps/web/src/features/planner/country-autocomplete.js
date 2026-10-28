/** Country-name suggestions built from the platform's localized region names. */
const ISO_COUNTRY_CODES = [
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE',
  'BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD',
  'CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM',
  'DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF',
  'GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU',
  'ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN',
  'KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME',
  'MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA',
  'NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM',
  'PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI',
  'SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK',
  'TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI',
  'VN VU WF WS YE YT ZA ZM ZW',
]
  .join(' ')
  .split(' ');

/**
 * @param {string} query
 * @param {string} locale
 * @returns {{code: string, name: string}[]}
 */
export function suggestCountries(query, locale = 'en') {
  const term = query.trim().toLocaleLowerCase(locale);
  if (term.length < 2) return [];
  const names = new Intl.DisplayNames([locale, 'en'], { type: 'region' });
  return ISO_COUNTRY_CODES.map((code) => ({ code, name: names.of(code) ?? code }))
    .filter(
      ({ code, name }) =>
        name.toLocaleLowerCase(locale).includes(term) || code.toLowerCase() === term,
    )
    .sort((a, b) => {
      const aPrefix = a.name.toLocaleLowerCase(locale).startsWith(term) ? 0 : 1;
      const bPrefix = b.name.toLocaleLowerCase(locale).startsWith(term) ? 0 : 1;
      return aPrefix - bPrefix || a.name.localeCompare(b.name, locale);
    })
    .slice(0, 8);
}
