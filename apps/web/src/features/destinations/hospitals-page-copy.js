import { normalizeLocale } from '@attravoya/localization';

const HOSPITALS_PAGE_COPY = Object.freeze({
  en: {
    eyebrow: 'Hospitals',
    title: 'Hospitals near {destination}',
    intro:
      'Browse places categorized as hospitals by the configured places provider near this destination.',
    back: 'Back to destination',
    results: 'Nearby hospitals',
    noResults: 'No hospitals were found in this search area.',
    unavailable: 'Hospitals could not be loaded right now.',
    providerChecked: 'Provider checked',
    website: 'Website',
    emergencyLink: 'Verified emergency contacts',
    disclaimer:
      'These are provider-returned places categorized as hospitals near the destination. AttraVoya does not verify emergency-department status, services, opening hours, waiting times, capacity, quality, or availability. For an emergency, use the verified emergency contacts in Safety & emergency.',
  },
  sv: {
    eyebrow: 'Sjukhus',
    title: 'Sjukhus nära {destination}',
    intro:
      'Se platser som den konfigurerade platsleverantören kategoriserar som sjukhus nära destinationen.',
    back: 'Tillbaka till destinationen',
    results: 'Sjukhus i närheten',
    noResults: 'Inga sjukhus hittades i sökområdet.',
    unavailable: 'Sjukhus kunde inte laddas just nu.',
    providerChecked: 'Leverantör kontrollerad',
    website: 'Webbplats',
    emergencyLink: 'Verifierade nödnummer',
    disclaimer:
      'Detta är platser som leverantören kategoriserar som sjukhus nära destinationen. AttraVoya verifierar inte akutmottagning, tjänster, öppettider, väntetider, kapacitet, kvalitet eller tillgänglighet. Vid en nödsituation, använd de verifierade kontakterna under Säkerhet och nödläge.',
  },
  es: {
    eyebrow: 'Hospitales',
    title: 'Hospitales cerca de {destination}',
    intro:
      'Consulta lugares que el proveedor configurado clasifica como hospitales cerca de este destino.',
    back: 'Volver al destino',
    results: 'Hospitales cercanos',
    noResults: 'No se encontraron hospitales en esta zona de búsqueda.',
    unavailable: 'Los hospitales no se pueden cargar ahora.',
    providerChecked: 'Proveedor comprobado',
    website: 'Sitio web',
    emergencyLink: 'Contactos de emergencia verificados',
    disclaimer:
      'Estos son lugares que el proveedor clasifica como hospitales cerca del destino. AttraVoya no verifica urgencias, servicios, horarios, tiempos de espera, capacidad, calidad ni disponibilidad. En una emergencia, utiliza los contactos verificados de Seguridad y emergencia.',
  },
  fr: {
    eyebrow: 'Hôpitaux',
    title: 'Hôpitaux près de {destination}',
    intro:
      'Consultez les lieux classés comme hôpitaux par le fournisseur configuré près de cette destination.',
    back: 'Retour à la destination',
    results: 'Hôpitaux à proximité',
    noResults: 'Aucun hôpital n’a été trouvé dans cette zone de recherche.',
    unavailable: 'Les hôpitaux ne peuvent pas être chargés actuellement.',
    providerChecked: 'Fournisseur vérifié',
    website: 'Site web',
    emergencyLink: 'Contacts d’urgence vérifiés',
    disclaimer:
      'Ces lieux sont classés comme hôpitaux par le fournisseur près de la destination. AttraVoya ne vérifie pas les urgences, services, horaires, délais d’attente, capacités, qualité ou disponibilité. En cas d’urgence, utilisez les contacts vérifiés de Sécurité et urgence.',
  },
  de: {
    eyebrow: 'Krankenhäuser',
    title: 'Krankenhäuser nahe {destination}',
    intro:
      'Sieh dir Orte an, die der konfigurierte Anbieter nahe diesem Reiseziel als Krankenhäuser einordnet.',
    back: 'Zurück zum Reiseziel',
    results: 'Krankenhäuser in der Nähe',
    noResults: 'In diesem Suchgebiet wurden keine Krankenhäuser gefunden.',
    unavailable: 'Krankenhäuser können derzeit nicht geladen werden.',
    providerChecked: 'Anbieter geprüft',
    website: 'Website',
    emergencyLink: 'Verifizierte Notfallkontakte',
    disclaimer:
      'Diese Orte werden vom Anbieter nahe dem Reiseziel als Krankenhäuser eingestuft. AttraVoya prüft weder Notaufnahme, Leistungen, Öffnungszeiten, Wartezeiten, Kapazität, Qualität noch Verfügbarkeit. Nutze im Notfall die verifizierten Kontakte unter Sicherheit und Notfall.',
  },
  it: {
    eyebrow: 'Ospedali',
    title: 'Ospedali vicino a {destination}',
    intro:
      'Consulta i luoghi classificati come ospedali dal fornitore configurato vicino a questa destinazione.',
    back: 'Torna alla destinazione',
    results: 'Ospedali nelle vicinanze',
    noResults: 'Nessun ospedale è stato trovato in questa area di ricerca.',
    unavailable: 'Gli ospedali non possono essere caricati al momento.',
    providerChecked: 'Fornitore controllato',
    website: 'Sito web',
    emergencyLink: 'Contatti di emergenza verificati',
    disclaimer:
      'Questi luoghi sono classificati come ospedali dal fornitore vicino alla destinazione. AttraVoya non verifica pronto soccorso, servizi, orari, tempi di attesa, capacità, qualità o disponibilità. In caso di emergenza usa i contatti verificati in Sicurezza ed emergenza.',
  },
  pt: {
    eyebrow: 'Hospitais',
    title: 'Hospitais perto de {destination}',
    intro:
      'Consulte locais classificados como hospitais pelo fornecedor configurado perto deste destino.',
    back: 'Voltar ao destino',
    results: 'Hospitais próximos',
    noResults: 'Não foram encontrados hospitais nesta área de pesquisa.',
    unavailable: 'Os hospitais não podem ser carregados agora.',
    providerChecked: 'Fornecedor verificado',
    website: 'Site',
    emergencyLink: 'Contactos de emergência verificados',
    disclaimer:
      'Estes locais são classificados como hospitais pelo fornecedor perto do destino. A AttraVoya não verifica urgência, serviços, horários, tempos de espera, capacidade, qualidade ou disponibilidade. Numa emergência, use os contactos verificados em Segurança e emergência.',
  },
  pl: {
    eyebrow: 'Szpitale',
    title: 'Szpitale w pobliżu {destination}',
    intro:
      'Przeglądaj miejsca oznaczone przez skonfigurowanego dostawcę jako szpitale w pobliżu celu podróży.',
    back: 'Wróć do celu podróży',
    results: 'Szpitale w pobliżu',
    noResults: 'W tym obszarze wyszukiwania nie znaleziono szpitali.',
    unavailable: 'Nie można teraz wczytać szpitali.',
    providerChecked: 'Dostawca sprawdzony',
    website: 'Strona internetowa',
    emergencyLink: 'Zweryfikowane kontakty alarmowe',
    disclaimer:
      'Są to miejsca oznaczone przez dostawcę jako szpitale w pobliżu celu podróży. AttraVoya nie weryfikuje oddziału ratunkowego, usług, godzin otwarcia, czasu oczekiwania, pojemności, jakości ani dostępności. W nagłym przypadku użyj zweryfikowanych kontaktów w sekcji Bezpieczeństwo i alarm.',
  },
  nl: {
    eyebrow: 'Ziekenhuizen',
    title: 'Ziekenhuizen bij {destination}',
    intro:
      'Bekijk plaatsen die de ingestelde locatiesprovider als ziekenhuis classificeert nabij deze bestemming.',
    back: 'Terug naar bestemming',
    results: 'Ziekenhuizen in de buurt',
    noResults: 'Er zijn geen ziekenhuizen gevonden in dit zoekgebied.',
    unavailable: 'Ziekenhuizen kunnen momenteel niet worden geladen.',
    providerChecked: 'Provider gecontroleerd',
    website: 'Website',
    emergencyLink: 'Geverifieerde noodcontacten',
    disclaimer:
      'Deze plaatsen worden door de provider als ziekenhuizen nabij de bestemming geclassificeerd. AttraVoya verifieert geen spoedeisende hulp, diensten, openingstijden, wachttijden, capaciteit, kwaliteit of beschikbaarheid. Gebruik bij een noodgeval de geverifieerde contacten onder Veiligheid en nood.',
  },
  no: {
    eyebrow: 'Sykehus',
    title: 'Sykehus nær {destination}',
    intro:
      'Se steder som den konfigurerte stedsleverandøren kategoriserer som sykehus nær dette reisemålet.',
    back: 'Tilbake til reisemålet',
    results: 'Sykehus i nærheten',
    noResults: 'Ingen sykehus ble funnet i dette søkeområdet.',
    unavailable: 'Sykehus kan ikke lastes akkurat nå.',
    providerChecked: 'Leverandør kontrollert',
    website: 'Nettsted',
    emergencyLink: 'Verifiserte nødkontakter',
    disclaimer:
      'Dette er steder leverandøren kategoriserer som sykehus nær reisemålet. AttraVoya verifiserer ikke akuttmottak, tjenester, åpningstider, ventetider, kapasitet, kvalitet eller tilgjengelighet. Ved en nødsituasjon bruker du de verifiserte kontaktene under Sikkerhet og nød.',
  },
  da: {
    eyebrow: 'Hospitaler',
    title: 'Hospitaler nær {destination}',
    intro:
      'Se steder, som den konfigurerede stedudbyder kategoriserer som hospitaler nær denne destination.',
    back: 'Tilbage til destinationen',
    results: 'Hospitaler i nærheden',
    noResults: 'Der blev ikke fundet hospitaler i dette søgeområde.',
    unavailable: 'Hospitaler kan ikke indlæses lige nu.',
    providerChecked: 'Udbyder kontrolleret',
    website: 'Websted',
    emergencyLink: 'Bekræftede nødkontakter',
    disclaimer:
      'Dette er steder, som udbyderen kategoriserer som hospitaler nær destinationen. AttraVoya bekræfter ikke akutmodtagelse, tjenester, åbningstider, ventetider, kapacitet, kvalitet eller tilgængelighed. Brug de bekræftede kontakter under Sikkerhed og nødsituation ved en nødsituation.',
  },
  fi: {
    eyebrow: 'Sairaalat',
    title: 'Sairaalat lähellä kohdetta {destination}',
    intro:
      'Selaa paikkoja, jotka määritetty paikkapalvelu luokittelee sairaaloiksi tämän kohteen lähellä.',
    back: 'Takaisin kohteeseen',
    results: 'Lähellä olevat sairaalat',
    noResults: 'Tältä hakualueelta ei löytynyt sairaaloita.',
    unavailable: 'Sairaaloita ei voida ladata juuri nyt.',
    providerChecked: 'Palvelu tarkistettu',
    website: 'Verkkosivusto',
    emergencyLink: 'Vahvistetut hätäyhteystiedot',
    disclaimer:
      'Nämä ovat palveluntarjoajan sairaaloiksi luokittelemia paikkoja kohteen lähellä. AttraVoya ei vahvista päivystystä, palveluja, aukioloaikoja, odotusaikoja, kapasiteettia, laatua tai saatavuutta. Hätätilanteessa käytä Turvallisuus ja hätätilanne -osion vahvistettuja yhteystietoja.',
  },
  tr: {
    eyebrow: 'Hastaneler',
    title: '{destination} yakınındaki hastaneler',
    intro:
      'Yapılandırılmış yer sağlayıcısının bu hedefin yakınında hastane olarak sınıflandırdığı yerleri görüntüleyin.',
    back: 'Hedefe dön',
    results: 'Yakındaki hastaneler',
    noResults: 'Bu arama alanında hastane bulunamadı.',
    unavailable: 'Hastaneler şu anda yüklenemiyor.',
    providerChecked: 'Sağlayıcı kontrol edildi',
    website: 'Web sitesi',
    emergencyLink: 'Doğrulanmış acil durum kişileri',
    disclaimer:
      'Bunlar sağlayıcının hedef yakınında hastane olarak sınıflandırdığı yerlerdir. AttraVoya acil servis, hizmetler, çalışma saatleri, bekleme süreleri, kapasite, kalite veya müsaitliği doğrulamaz. Acil durumda Güvenlik ve acil durum bölümündeki doğrulanmış kişileri kullanın.',
  },
  ar: {
    eyebrow: 'المستشفيات',
    title: 'مستشفيات بالقرب من {destination}',
    intro: 'تصفح الأماكن التي يصنفها مزود الأماكن المكوّن كمستشفيات بالقرب من هذه الوجهة.',
    back: 'العودة إلى الوجهة',
    results: 'مستشفيات قريبة',
    noResults: 'لم يتم العثور على مستشفيات في منطقة البحث هذه.',
    unavailable: 'تعذر تحميل المستشفيات الآن.',
    providerChecked: 'تم فحص المزود',
    website: 'الموقع الإلكتروني',
    emergencyLink: 'جهات اتصال طوارئ موثقة',
    disclaimer:
      'هذه أماكن يصنفها المزود كمستشفيات بالقرب من الوجهة. لا تتحقق AttraVoya من وجود قسم طوارئ أو الخدمات أو ساعات العمل أو أوقات الانتظار أو السعة أو الجودة أو التوفر. في حالة الطوارئ استخدم جهات الاتصال الموثقة في قسم السلامة والطوارئ.',
  },
  zh: {
    eyebrow: '医院',
    title: '{destination}附近的医院',
    intro: '查看已配置地点提供商在此目的地附近归类为医院的地点。',
    back: '返回目的地',
    results: '附近医院',
    noResults: '此搜索区域未找到医院。',
    unavailable: '目前无法加载医院。',
    providerChecked: '提供商检查时间',
    website: '网站',
    emergencyLink: '已核实的紧急联系方式',
    disclaimer:
      '这些是提供商在目的地附近归类为医院的地点。AttraVoya 不核实急诊科、服务、营业时间、等待时间、容量、质量或可用性。遇到紧急情况时，请使用“安全与紧急情况”中的已核实联系方式。',
  },
  ja: {
    eyebrow: '病院',
    title: '{destination}周辺の病院',
    intro: '設定済みの場所プロバイダーがこの目的地の近くで病院として分類した場所を確認できます。',
    back: '目的地に戻る',
    results: '近くの病院',
    noResults: 'この検索範囲では病院が見つかりませんでした。',
    unavailable: '現在、病院を読み込めません。',
    providerChecked: 'プロバイダー確認時刻',
    website: 'ウェブサイト',
    emergencyLink: '確認済み緊急連絡先',
    disclaimer:
      'これらはプロバイダーが目的地の近くで病院として分類した場所です。AttraVoya は救急部門、診療内容、営業時間、待ち時間、受入能力、品質、利用可能性を確認していません。緊急時は「安全と緊急」の確認済み連絡先を使用してください。',
  },
  ko: {
    eyebrow: '병원',
    title: '{destination} 근처 병원',
    intro: '설정된 장소 제공업체가 이 목적지 근처에서 병원으로 분류한 장소를 확인하세요.',
    back: '목적지로 돌아가기',
    results: '근처 병원',
    noResults: '이 검색 영역에서 병원을 찾지 못했습니다.',
    unavailable: '현재 병원을 불러올 수 없습니다.',
    providerChecked: '제공업체 확인 시간',
    website: '웹사이트',
    emergencyLink: '확인된 긴급 연락처',
    disclaimer:
      '이는 제공업체가 목적지 근처에서 병원으로 분류한 장소입니다. AttraVoya는 응급실 여부, 서비스, 운영 시간, 대기 시간, 수용 능력, 품질 또는 이용 가능성을 확인하지 않습니다. 응급 상황에서는 안전 및 긴급 섹션의 확인된 연락처를 사용하세요.',
  },
  hi: {
    eyebrow: 'अस्पताल',
    title: '{destination} के पास अस्पताल',
    intro:
      'इस गंतव्य के पास कॉन्फ़िगर किए गए स्थान प्रदाता द्वारा अस्पताल के रूप में वर्गीकृत स्थान देखें।',
    back: 'गंतव्य पर वापस जाएँ',
    results: 'पास के अस्पताल',
    noResults: 'इस खोज क्षेत्र में कोई अस्पताल नहीं मिला।',
    unavailable: 'अभी अस्पताल लोड नहीं किए जा सकते।',
    providerChecked: 'प्रदाता जाँचा गया',
    website: 'वेबसाइट',
    emergencyLink: 'सत्यापित आपातकालीन संपर्क',
    disclaimer:
      'ये गंतव्य के पास प्रदाता द्वारा अस्पताल के रूप में वर्गीकृत स्थान हैं। AttraVoya आपातकालीन विभाग, सेवाओं, खुलने के समय, प्रतीक्षा समय, क्षमता, गुणवत्ता या उपलब्धता की पुष्टि नहीं करता। आपातकाल में सुरक्षा और आपातकाल अनुभाग के सत्यापित संपर्कों का उपयोग करें।',
  },
});

export function getHospitalsPageCopy(locale) {
  return HOSPITALS_PAGE_COPY[normalizeLocale(locale)] ?? HOSPITALS_PAGE_COPY.en;
}
