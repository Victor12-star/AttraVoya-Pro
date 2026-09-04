import { normalizeLocale } from '@attravoya/localization';

/**
 * @typedef {object} SafetyPageCopy
 * @property {string} eyebrow
 * @property {string} title
 * @property {string} intro
 * @property {string} back
 * @property {string} countryWide
 * @property {string} verifiedOnly
 * @property {string} call
 * @property {string} source
 * @property {string} lastVerified
 * @property {string} recordsFound
 * @property {string} noRecords
 * @property {string} unavailable
 */

/** @type {Readonly<Record<string, SafetyPageCopy>>} */
const SAFETY_PAGE_COPY = Object.freeze({
  en: {
    eyebrow: 'Safety & emergency',
    title: 'Verified emergency contacts for {destination}',
    intro:
      'Only published country-wide records verified from an authoritative source are shown. AttraVoya never generates emergency numbers.',
    back: 'Back to destination',
    countryWide: 'Country-wide contacts',
    verifiedOnly: 'Verified records only',
    call: 'Call',
    source: 'Official source',
    lastVerified: 'Last verified',
    recordsFound: 'verified contacts',
    noRecords:
      'No verified country-wide emergency contacts are available in AttraVoya for this destination yet.',
    unavailable: 'Verified emergency information could not be loaded right now.',
  },
  sv: {
    eyebrow: 'Säkerhet och nödläge',
    title: 'Verifierade nödnummer för {destination}',
    intro:
      'Endast publicerade landsomfattande uppgifter som verifierats från en auktoritativ källa visas. AttraVoya skapar aldrig nödnummer.',
    back: 'Tillbaka till destinationen',
    countryWide: 'Landsomfattande kontakter',
    verifiedOnly: 'Endast verifierade uppgifter',
    call: 'Ring',
    source: 'Officiell källa',
    lastVerified: 'Senast verifierad',
    recordsFound: 'verifierade kontakter',
    noRecords:
      'Det finns ännu inga verifierade landsomfattande nödkontakter i AttraVoya för denna destination.',
    unavailable: 'Verifierad nödinformation kunde inte laddas just nu.',
  },
  es: {
    eyebrow: 'Seguridad y emergencias',
    title: 'Contactos de emergencia verificados para {destination}',
    intro:
      'Solo se muestran registros nacionales publicados y verificados mediante una fuente autorizada. AttraVoya nunca genera números de emergencia.',
    back: 'Volver al destino',
    countryWide: 'Contactos nacionales',
    verifiedOnly: 'Solo registros verificados',
    call: 'Llamar',
    source: 'Fuente oficial',
    lastVerified: 'Última verificación',
    recordsFound: 'contactos verificados',
    noRecords:
      'AttraVoya aún no dispone de contactos de emergencia nacionales verificados para este destino.',
    unavailable: 'No se pudo cargar la información de emergencia verificada.',
  },
  fr: {
    eyebrow: 'Sécurité et urgences',
    title: 'Contacts d’urgence vérifiés pour {destination}',
    intro:
      'Seules les données nationales publiées et vérifiées auprès d’une source faisant autorité sont affichées. AttraVoya ne génère jamais de numéros d’urgence.',
    back: 'Retour à la destination',
    countryWide: 'Contacts nationaux',
    verifiedOnly: 'Données vérifiées uniquement',
    call: 'Appeler',
    source: 'Source officielle',
    lastVerified: 'Dernière vérification',
    recordsFound: 'contacts vérifiés',
    noRecords:
      'Aucun contact d’urgence national vérifié n’est encore disponible dans AttraVoya pour cette destination.',
    unavailable:
      'Les informations d’urgence vérifiées ne peuvent pas être chargées pour le moment.',
  },
  de: {
    eyebrow: 'Sicherheit und Notfall',
    title: 'Verifizierte Notfallkontakte für {destination}',
    intro:
      'Es werden nur veröffentlichte landesweite Angaben angezeigt, die anhand einer maßgeblichen Quelle verifiziert wurden. AttraVoya erzeugt niemals Notrufnummern.',
    back: 'Zurück zum Reiseziel',
    countryWide: 'Landesweite Kontakte',
    verifiedOnly: 'Nur verifizierte Angaben',
    call: 'Anrufen',
    source: 'Offizielle Quelle',
    lastVerified: 'Zuletzt verifiziert',
    recordsFound: 'verifizierte Kontakte',
    noRecords:
      'Für dieses Reiseziel sind in AttraVoya noch keine verifizierten landesweiten Notfallkontakte verfügbar.',
    unavailable: 'Verifizierte Notfallinformationen können derzeit nicht geladen werden.',
  },
  it: {
    eyebrow: 'Sicurezza ed emergenze',
    title: 'Contatti di emergenza verificati per {destination}',
    intro:
      'Sono mostrati solo dati nazionali pubblicati e verificati tramite una fonte autorevole. AttraVoya non genera mai numeri di emergenza.',
    back: 'Torna alla destinazione',
    countryWide: 'Contatti nazionali',
    verifiedOnly: 'Solo dati verificati',
    call: 'Chiama',
    source: 'Fonte ufficiale',
    lastVerified: 'Ultima verifica',
    recordsFound: 'contatti verificati',
    noRecords:
      'AttraVoya non dispone ancora di contatti di emergenza nazionali verificati per questa destinazione.',
    unavailable: 'Le informazioni di emergenza verificate non possono essere caricate al momento.',
  },
  pt: {
    eyebrow: 'Segurança e emergência',
    title: 'Contactos de emergência verificados para {destination}',
    intro:
      'Apenas são apresentados registos nacionais publicados e verificados por uma fonte autorizada. A AttraVoya nunca gera números de emergência.',
    back: 'Voltar ao destino',
    countryWide: 'Contactos nacionais',
    verifiedOnly: 'Apenas registos verificados',
    call: 'Ligar',
    source: 'Fonte oficial',
    lastVerified: 'Última verificação',
    recordsFound: 'contactos verificados',
    noRecords:
      'Ainda não existem contactos de emergência nacionais verificados na AttraVoya para este destino.',
    unavailable: 'Não foi possível carregar a informação de emergência verificada.',
  },
  pl: {
    eyebrow: 'Bezpieczeństwo i sytuacje awaryjne',
    title: 'Zweryfikowane kontakty alarmowe dla {destination}',
    intro:
      'Wyświetlane są wyłącznie opublikowane dane ogólnokrajowe zweryfikowane w wiarygodnym źródle. AttraVoya nigdy nie generuje numerów alarmowych.',
    back: 'Wróć do celu podróży',
    countryWide: 'Kontakty ogólnokrajowe',
    verifiedOnly: 'Tylko zweryfikowane dane',
    call: 'Zadzwoń',
    source: 'Oficjalne źródło',
    lastVerified: 'Ostatnia weryfikacja',
    recordsFound: 'zweryfikowanych kontaktów',
    noRecords:
      'AttraVoya nie ma jeszcze zweryfikowanych ogólnokrajowych kontaktów alarmowych dla tego celu.',
    unavailable: 'Nie można teraz załadować zweryfikowanych informacji alarmowych.',
  },
  nl: {
    eyebrow: 'Veiligheid en noodgevallen',
    title: 'Geverifieerde noodcontacten voor {destination}',
    intro:
      'Alleen gepubliceerde landelijke gegevens die via een gezaghebbende bron zijn geverifieerd worden getoond. AttraVoya genereert nooit noodnummers.',
    back: 'Terug naar bestemming',
    countryWide: 'Landelijke contacten',
    verifiedOnly: 'Alleen geverifieerde gegevens',
    call: 'Bellen',
    source: 'Officiële bron',
    lastVerified: 'Laatst geverifieerd',
    recordsFound: 'geverifieerde contacten',
    noRecords:
      'Er zijn nog geen geverifieerde landelijke noodcontacten in AttraVoya voor deze bestemming.',
    unavailable: 'Geverifieerde noodinformatie kan nu niet worden geladen.',
  },
  no: {
    eyebrow: 'Sikkerhet og nødsituasjoner',
    title: 'Verifiserte nødkontakter for {destination}',
    intro:
      'Bare publiserte landsdekkende opplysninger som er verifisert fra en autoritativ kilde vises. AttraVoya genererer aldri nødnumre.',
    back: 'Tilbake til reisemålet',
    countryWide: 'Landsdekkende kontakter',
    verifiedOnly: 'Kun verifiserte opplysninger',
    call: 'Ring',
    source: 'Offisiell kilde',
    lastVerified: 'Sist verifisert',
    recordsFound: 'verifiserte kontakter',
    noRecords:
      'AttraVoya har ennå ingen verifiserte landsdekkende nødkontakter for dette reisemålet.',
    unavailable: 'Verifisert nødinformasjon kan ikke lastes inn akkurat nå.',
  },
  da: {
    eyebrow: 'Sikkerhed og nødsituationer',
    title: 'Verificerede nødkontakter for {destination}',
    intro:
      'Kun offentliggjorte landsdækkende oplysninger, der er verificeret fra en autoritativ kilde, vises. AttraVoya genererer aldrig nødnumre.',
    back: 'Tilbage til destinationen',
    countryWide: 'Landsdækkende kontakter',
    verifiedOnly: 'Kun verificerede oplysninger',
    call: 'Ring',
    source: 'Officiel kilde',
    lastVerified: 'Senest verificeret',
    recordsFound: 'verificerede kontakter',
    noRecords:
      'AttraVoya har endnu ingen verificerede landsdækkende nødkontakter for denne destination.',
    unavailable: 'Verificerede nødoplysninger kan ikke indlæses lige nu.',
  },
  fi: {
    eyebrow: 'Turvallisuus ja hätätilanteet',
    title: 'Vahvistetut hätäyhteystiedot kohteelle {destination}',
    intro:
      'Näytämme vain julkaistut valtakunnalliset tiedot, jotka on vahvistettu virallisesta lähteestä. AttraVoya ei koskaan luo hätänumeroita.',
    back: 'Takaisin kohteeseen',
    countryWide: 'Valtakunnalliset yhteystiedot',
    verifiedOnly: 'Vain vahvistetut tiedot',
    call: 'Soita',
    source: 'Virallinen lähde',
    lastVerified: 'Viimeksi vahvistettu',
    recordsFound: 'vahvistettua yhteystietoa',
    noRecords:
      'AttraVoyassa ei vielä ole vahvistettuja valtakunnallisia hätäyhteystietoja tälle kohteelle.',
    unavailable: 'Vahvistettuja hätätietoja ei voida ladata juuri nyt.',
  },
  tr: {
    eyebrow: 'Güvenlik ve acil durum',
    title: '{destination} için doğrulanmış acil durum kişileri',
    intro:
      'Yalnızca yetkili bir kaynaktan doğrulanmış ve yayımlanmış ülke çapındaki kayıtlar gösterilir. AttraVoya hiçbir zaman acil durum numarası üretmez.',
    back: 'Varış noktasına dön',
    countryWide: 'Ülke çapındaki kişiler',
    verifiedOnly: 'Yalnızca doğrulanmış kayıtlar',
    call: 'Ara',
    source: 'Resmî kaynak',
    lastVerified: 'Son doğrulama',
    recordsFound: 'doğrulanmış kişi',
    noRecords:
      'AttraVoya’da bu varış noktası için henüz doğrulanmış ülke çapında acil durum kişisi yok.',
    unavailable: 'Doğrulanmış acil durum bilgileri şu anda yüklenemiyor.',
  },
  ar: {
    eyebrow: 'السلامة والطوارئ',
    title: 'جهات اتصال طوارئ موثقة لـ {destination}',
    intro:
      'لا تُعرض إلا السجلات المنشورة على مستوى الدولة التي تم التحقق منها من مصدر موثوق. لا تنشئ AttraVoya أرقام الطوارئ مطلقًا.',
    back: 'العودة إلى الوجهة',
    countryWide: 'جهات اتصال على مستوى الدولة',
    verifiedOnly: 'سجلات موثقة فقط',
    call: 'اتصال',
    source: 'المصدر الرسمي',
    lastVerified: 'آخر تحقق',
    recordsFound: 'جهات اتصال موثقة',
    noRecords: 'لا تتوفر بعد في AttraVoya جهات اتصال طوارئ موثقة على مستوى الدولة لهذه الوجهة.',
    unavailable: 'تعذر تحميل معلومات الطوارئ الموثقة الآن.',
  },
  zh: {
    eyebrow: '安全与紧急情况',
    title: '{destination}的已核实紧急联系方式',
    intro: '仅显示经权威来源核实并已发布的全国性记录。AttraVoya 绝不会生成紧急电话号码。',
    back: '返回目的地',
    countryWide: '全国联系方式',
    verifiedOnly: '仅限已核实记录',
    call: '拨打',
    source: '官方来源',
    lastVerified: '最近核实',
    recordsFound: '个已核实联系方式',
    noRecords: 'AttraVoya 尚无此目的地的已核实全国紧急联系方式。',
    unavailable: '目前无法加载已核实的紧急信息。',
  },
  ja: {
    eyebrow: '安全と緊急時',
    title: '{destination}の確認済み緊急連絡先',
    intro:
      '権威ある情報源で確認された公開済みの全国向け記録のみを表示します。AttraVoya が緊急電話番号を生成することはありません。',
    back: '目的地に戻る',
    countryWide: '全国共通の連絡先',
    verifiedOnly: '確認済み記録のみ',
    call: '電話する',
    source: '公式情報源',
    lastVerified: '最終確認',
    recordsFound: '件の確認済み連絡先',
    noRecords: 'この目的地について、AttraVoya には確認済みの全国緊急連絡先がまだありません。',
    unavailable: '確認済みの緊急情報を現在読み込めません。',
  },
  ko: {
    eyebrow: '안전 및 긴급 상황',
    title: '{destination}의 확인된 긴급 연락처',
    intro:
      '권위 있는 출처에서 확인되고 게시된 전국 단위 기록만 표시합니다. AttraVoya는 긴급 전화번호를 생성하지 않습니다.',
    back: '목적지로 돌아가기',
    countryWide: '전국 연락처',
    verifiedOnly: '확인된 기록만',
    call: '전화',
    source: '공식 출처',
    lastVerified: '마지막 확인',
    recordsFound: '개의 확인된 연락처',
    noRecords: 'AttraVoya에는 아직 이 목적지의 확인된 전국 긴급 연락처가 없습니다.',
    unavailable: '현재 확인된 긴급 정보를 불러올 수 없습니다.',
  },
  hi: {
    eyebrow: 'सुरक्षा और आपातकाल',
    title: '{destination} के लिए सत्यापित आपातकालीन संपर्क',
    intro:
      'केवल किसी आधिकारिक स्रोत से सत्यापित और प्रकाशित देश-व्यापी रिकॉर्ड दिखाए जाते हैं। AttraVoya कभी भी आपातकालीन नंबर उत्पन्न नहीं करता।',
    back: 'गंतव्य पर वापस जाएँ',
    countryWide: 'देश-व्यापी संपर्क',
    verifiedOnly: 'केवल सत्यापित रिकॉर्ड',
    call: 'कॉल करें',
    source: 'आधिकारिक स्रोत',
    lastVerified: 'अंतिम सत्यापन',
    recordsFound: 'सत्यापित संपर्क',
    noRecords:
      'AttraVoya में इस गंतव्य के लिए अभी कोई सत्यापित देश-व्यापी आपातकालीन संपर्क उपलब्ध नहीं है।',
    unavailable: 'सत्यापित आपातकालीन जानकारी अभी लोड नहीं की जा सकती।',
  },
});

/** @param {string} locale */
export function getSafetyPageCopy(locale) {
  const normalized = normalizeLocale(locale);
  return SAFETY_PAGE_COPY[normalized] ?? SAFETY_PAGE_COPY.en;
}
