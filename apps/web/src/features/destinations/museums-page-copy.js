import { normalizeLocale } from '@attravoya/localization';

const MUSEUMS_PAGE_COPY = Object.freeze({
  en: {
    eyebrow: 'Museums',
    title: 'Museums near {destination}',
    intro:
      'Browse places categorized as museums by the configured places provider near this destination.',
    back: 'Back to destination',
    results: 'Nearby museums',
    noResults: 'No museums were found in this search area.',
    unavailable: 'Museums could not be loaded right now.',
    providerChecked: 'Provider checked',
    website: 'Website',
    disclaimer:
      'These are provider-returned places categorized as museums near the destination. AttraVoya does not verify exhibitions, opening hours, ticket prices, accessibility, ratings, or availability. Check the museum website before visiting when one is provided.',
  },
  sv: {
    eyebrow: 'Museer',
    title: 'Museer nära {destination}',
    intro:
      'Se platser som den konfigurerade platsleverantören kategoriserar som museer nära destinationen.',
    back: 'Tillbaka till destinationen',
    results: 'Museer i närheten',
    noResults: 'Inga museer hittades i sökområdet.',
    unavailable: 'Museer kunde inte laddas just nu.',
    providerChecked: 'Leverantör kontrollerad',
    website: 'Webbplats',
    disclaimer:
      'Detta är platser som leverantören kategoriserar som museer nära destinationen. AttraVoya verifierar inte utställningar, öppettider, biljettpriser, tillgänglighet, betyg eller besökstillgänglighet. Kontrollera museets webbplats före besöket när en sådan finns.',
  },
  es: {
    eyebrow: 'Museos',
    title: 'Museos cerca de {destination}',
    intro:
      'Consulta lugares que el proveedor configurado clasifica como museos cerca de este destino.',
    back: 'Volver al destino',
    results: 'Museos cercanos',
    noResults: 'No se encontraron museos en esta zona de búsqueda.',
    unavailable: 'Los museos no se pueden cargar ahora.',
    providerChecked: 'Proveedor comprobado',
    website: 'Sitio web',
    disclaimer:
      'Estos son lugares que el proveedor clasifica como museos cerca del destino. AttraVoya no verifica exposiciones, horarios, precios de entradas, accesibilidad, valoraciones ni disponibilidad. Consulta el sitio web del museo antes de visitarlo cuando esté disponible.',
  },
  fr: {
    eyebrow: 'Musées',
    title: 'Musées près de {destination}',
    intro:
      'Consultez les lieux classés comme musées par le fournisseur configuré près de cette destination.',
    back: 'Retour à la destination',
    results: 'Musées à proximité',
    noResults: 'Aucun musée n’a été trouvé dans cette zone de recherche.',
    unavailable: 'Les musées ne peuvent pas être chargés actuellement.',
    providerChecked: 'Fournisseur vérifié',
    website: 'Site web',
    disclaimer:
      'Ces lieux sont classés comme musées par le fournisseur près de la destination. AttraVoya ne vérifie pas les expositions, horaires, prix des billets, accessibilité, notes ou disponibilité. Consultez le site du musée avant votre visite lorsqu’il est fourni.',
  },
  de: {
    eyebrow: 'Museen',
    title: 'Museen nahe {destination}',
    intro:
      'Sieh dir Orte an, die der konfigurierte Anbieter nahe diesem Reiseziel als Museen einordnet.',
    back: 'Zurück zum Reiseziel',
    results: 'Museen in der Nähe',
    noResults: 'In diesem Suchgebiet wurden keine Museen gefunden.',
    unavailable: 'Museen können derzeit nicht geladen werden.',
    providerChecked: 'Anbieter geprüft',
    website: 'Website',
    disclaimer:
      'Diese Orte werden vom Anbieter nahe dem Reiseziel als Museen eingestuft. AttraVoya prüft weder Ausstellungen, Öffnungszeiten, Ticketpreise, Barrierefreiheit, Bewertungen noch Verfügbarkeit. Prüfe vor dem Besuch die Museumswebsite, wenn sie angegeben ist.',
  },
  it: {
    eyebrow: 'Musei',
    title: 'Musei vicino a {destination}',
    intro:
      'Consulta i luoghi classificati come musei dal fornitore configurato vicino a questa destinazione.',
    back: 'Torna alla destinazione',
    results: 'Musei nelle vicinanze',
    noResults: 'Nessun museo è stato trovato in questa area di ricerca.',
    unavailable: 'I musei non possono essere caricati al momento.',
    providerChecked: 'Fornitore controllato',
    website: 'Sito web',
    disclaimer:
      'Questi luoghi sono classificati come musei dal fornitore vicino alla destinazione. AttraVoya non verifica mostre, orari, prezzi dei biglietti, accessibilità, valutazioni o disponibilità. Controlla il sito del museo prima della visita quando disponibile.',
  },
  pt: {
    eyebrow: 'Museus',
    title: 'Museus perto de {destination}',
    intro:
      'Consulte locais classificados como museus pelo fornecedor configurado perto deste destino.',
    back: 'Voltar ao destino',
    results: 'Museus próximos',
    noResults: 'Não foram encontrados museus nesta área de pesquisa.',
    unavailable: 'Os museus não podem ser carregados agora.',
    providerChecked: 'Fornecedor verificado',
    website: 'Site',
    disclaimer:
      'Estes locais são classificados como museus pelo fornecedor perto do destino. A AttraVoya não verifica exposições, horários, preços de bilhetes, acessibilidade, avaliações ou disponibilidade. Consulte o site do museu antes da visita quando estiver disponível.',
  },
  pl: {
    eyebrow: 'Muzea',
    title: 'Muzea w pobliżu {destination}',
    intro:
      'Przeglądaj miejsca oznaczone przez skonfigurowanego dostawcę jako muzea w pobliżu celu podróży.',
    back: 'Wróć do celu podróży',
    results: 'Muzea w pobliżu',
    noResults: 'W tym obszarze wyszukiwania nie znaleziono muzeów.',
    unavailable: 'Nie można teraz wczytać muzeów.',
    providerChecked: 'Dostawca sprawdzony',
    website: 'Strona internetowa',
    disclaimer:
      'Są to miejsca oznaczone przez dostawcę jako muzea w pobliżu celu podróży. AttraVoya nie weryfikuje wystaw, godzin otwarcia, cen biletów, dostępności, ocen ani dostępności wizyty. Przed wizytą sprawdź stronę muzeum, jeśli jest podana.',
  },
  nl: {
    eyebrow: 'Musea',
    title: 'Musea bij {destination}',
    intro:
      'Bekijk plaatsen die de ingestelde locatiesprovider als museum classificeert nabij deze bestemming.',
    back: 'Terug naar bestemming',
    results: 'Musea in de buurt',
    noResults: 'Er zijn geen musea gevonden in dit zoekgebied.',
    unavailable: 'Musea kunnen momenteel niet worden geladen.',
    providerChecked: 'Provider gecontroleerd',
    website: 'Website',
    disclaimer:
      'Deze plaatsen worden door de provider als musea nabij de bestemming geclassificeerd. AttraVoya verifieert geen tentoonstellingen, openingstijden, ticketprijzen, toegankelijkheid, beoordelingen of beschikbaarheid. Controleer vóór het bezoek de museumwebsite als die beschikbaar is.',
  },
  no: {
    eyebrow: 'Museer',
    title: 'Museer nær {destination}',
    intro:
      'Se steder som den konfigurerte stedsleverandøren kategoriserer som museer nær dette reisemålet.',
    back: 'Tilbake til reisemålet',
    results: 'Museer i nærheten',
    noResults: 'Ingen museer ble funnet i dette søkeområdet.',
    unavailable: 'Museer kan ikke lastes akkurat nå.',
    providerChecked: 'Leverandør kontrollert',
    website: 'Nettsted',
    disclaimer:
      'Dette er steder leverandøren kategoriserer som museer nær reisemålet. AttraVoya verifiserer ikke utstillinger, åpningstider, billettpriser, tilgjengelighet, vurderinger eller besøksmulighet. Sjekk museets nettsted før besøket når det finnes.',
  },
  da: {
    eyebrow: 'Museer',
    title: 'Museer nær {destination}',
    intro:
      'Se steder, som den konfigurerede stedudbyder kategoriserer som museer nær denne destination.',
    back: 'Tilbage til destinationen',
    results: 'Museer i nærheden',
    noResults: 'Der blev ikke fundet museer i dette søgeområde.',
    unavailable: 'Museer kan ikke indlæses lige nu.',
    providerChecked: 'Udbyder kontrolleret',
    website: 'Websted',
    disclaimer:
      'Dette er steder, som udbyderen kategoriserer som museer nær destinationen. AttraVoya bekræfter ikke udstillinger, åbningstider, billetpriser, tilgængelighed, vurderinger eller besøgstilgængelighed. Tjek museets websted før besøget, når det er angivet.',
  },
  fi: {
    eyebrow: 'Museot',
    title: 'Museot lähellä kohdetta {destination}',
    intro:
      'Selaa paikkoja, jotka määritetty paikkapalvelu luokittelee museoiksi tämän kohteen lähellä.',
    back: 'Takaisin kohteeseen',
    results: 'Lähellä olevat museot',
    noResults: 'Tältä hakualueelta ei löytynyt museoita.',
    unavailable: 'Museoita ei voida ladata juuri nyt.',
    providerChecked: 'Palvelu tarkistettu',
    website: 'Verkkosivusto',
    disclaimer:
      'Nämä ovat palveluntarjoajan museoiksi luokittelemia paikkoja kohteen lähellä. AttraVoya ei vahvista näyttelyitä, aukioloaikoja, lippuhintoja, esteettömyyttä, arvioita tai saatavuutta. Tarkista museon verkkosivusto ennen vierailua, jos se on saatavilla.',
  },
  tr: {
    eyebrow: 'Müzeler',
    title: '{destination} yakınındaki müzeler',
    intro:
      'Yapılandırılmış yer sağlayıcısının bu hedefin yakınında müze olarak sınıflandırdığı yerleri görüntüleyin.',
    back: 'Hedefe dön',
    results: 'Yakındaki müzeler',
    noResults: 'Bu arama alanında müze bulunamadı.',
    unavailable: 'Müzeler şu anda yüklenemiyor.',
    providerChecked: 'Sağlayıcı kontrol edildi',
    website: 'Web sitesi',
    disclaimer:
      'Bunlar sağlayıcının hedef yakınında müze olarak sınıflandırdığı yerlerdir. AttraVoya sergileri, çalışma saatlerini, bilet fiyatlarını, erişilebilirliği, puanları veya müsaitliği doğrulamaz. Varsa ziyaret öncesinde müzenin web sitesini kontrol edin.',
  },
  ar: {
    eyebrow: 'المتاحف',
    title: 'متاحف بالقرب من {destination}',
    intro: 'تصفح الأماكن التي يصنفها مزود الأماكن المكوّن كمتاحف بالقرب من هذه الوجهة.',
    back: 'العودة إلى الوجهة',
    results: 'متاحف قريبة',
    noResults: 'لم يتم العثور على متاحف في منطقة البحث هذه.',
    unavailable: 'تعذر تحميل المتاحف الآن.',
    providerChecked: 'تم فحص المزود',
    website: 'الموقع الإلكتروني',
    disclaimer:
      'هذه أماكن يصنفها المزود كمتاحف بالقرب من الوجهة. لا تتحقق AttraVoya من المعارض أو ساعات العمل أو أسعار التذاكر أو إمكانية الوصول أو التقييمات أو التوفر. تحقق من موقع المتحف قبل الزيارة عند توفره.',
  },
  zh: {
    eyebrow: '博物馆',
    title: '{destination}附近的博物馆',
    intro: '查看已配置地点提供商在此目的地附近归类为博物馆的地点。',
    back: '返回目的地',
    results: '附近博物馆',
    noResults: '此搜索区域未找到博物馆。',
    unavailable: '目前无法加载博物馆。',
    providerChecked: '提供商检查时间',
    website: '网站',
    disclaimer:
      '这些是提供商在目的地附近归类为博物馆的地点。AttraVoya 不核实展览、开放时间、票价、无障碍设施、评分或可用性。如提供博物馆网站，请在参观前查看。',
  },
  ja: {
    eyebrow: '博物館',
    title: '{destination}周辺の博物館',
    intro: '設定済みの場所プロバイダーがこの目的地の近くで博物館として分類した場所を確認できます。',
    back: '目的地に戻る',
    results: '近くの博物館',
    noResults: 'この検索範囲では博物館が見つかりませんでした。',
    unavailable: '現在、博物館を読み込めません。',
    providerChecked: 'プロバイダー確認時刻',
    website: 'ウェブサイト',
    disclaimer:
      'これらはプロバイダーが目的地の近くで博物館として分類した場所です。AttraVoya は展示、営業時間、チケット料金、アクセシビリティ、評価、利用可能性を確認していません。ウェブサイトが提供されている場合は訪問前に確認してください。',
  },
  ko: {
    eyebrow: '박물관',
    title: '{destination} 근처 박물관',
    intro: '설정된 장소 제공업체가 이 목적지 근처에서 박물관으로 분류한 장소를 확인하세요.',
    back: '목적지로 돌아가기',
    results: '근처 박물관',
    noResults: '이 검색 영역에서 박물관을 찾지 못했습니다.',
    unavailable: '현재 박물관을 불러올 수 없습니다.',
    providerChecked: '제공업체 확인 시간',
    website: '웹사이트',
    disclaimer:
      '이는 제공업체가 목적지 근처에서 박물관으로 분류한 장소입니다. AttraVoya는 전시, 운영 시간, 티켓 가격, 접근성, 평점 또는 이용 가능성을 확인하지 않습니다. 웹사이트가 제공된 경우 방문 전에 확인하세요.',
  },
  hi: {
    eyebrow: 'संग्रहालय',
    title: '{destination} के पास संग्रहालय',
    intro:
      'इस गंतव्य के पास कॉन्फ़िगर किए गए स्थान प्रदाता द्वारा संग्रहालय के रूप में वर्गीकृत स्थान देखें।',
    back: 'गंतव्य पर वापस जाएँ',
    results: 'पास के संग्रहालय',
    noResults: 'इस खोज क्षेत्र में कोई संग्रहालय नहीं मिला।',
    unavailable: 'अभी संग्रहालय लोड नहीं किए जा सकते।',
    providerChecked: 'प्रदाता जाँचा गया',
    website: 'वेबसाइट',
    disclaimer:
      'ये गंतव्य के पास प्रदाता द्वारा संग्रहालय के रूप में वर्गीकृत स्थान हैं। AttraVoya प्रदर्शनियों, खुलने के समय, टिकट कीमतों, पहुँच-सुविधा, रेटिंग या उपलब्धता की पुष्टि नहीं करता। यदि वेबसाइट दी गई हो तो यात्रा से पहले संग्रहालय की वेबसाइट देखें।',
  },
});

export function getMuseumsPageCopy(locale) {
  return MUSEUMS_PAGE_COPY[normalizeLocale(locale)] ?? MUSEUMS_PAGE_COPY.en;
}
