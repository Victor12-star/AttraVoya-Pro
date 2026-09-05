import { normalizeLocale } from '@attravoya/localization';

const AIRPORTS_PAGE_COPY = Object.freeze({
  en: {
    eyebrow: 'Airports',
    title: 'Airports near {destination}',
    intro: 'Browse airports returned by the configured places provider near this destination.',
    back: 'Back to destination',
    results: 'Nearby airports',
    noResults: 'No airports were found in this search area.',
    unavailable: 'Airports could not be loaded right now.',
    providerChecked: 'Provider checked',
    website: 'Website',
    disclaimer:
      'These are provider-returned airport places near the destination. AttraVoya does not claim which airport is the main or best airport and does not provide live flights, terminal information, fares, transfer prices, or availability here.',
  },
  sv: {
    eyebrow: 'Flygplatser',
    title: 'Flygplatser nära {destination}',
    intro:
      'Utforska flygplatser som den konfigurerade platsleverantören returnerar nära destinationen.',
    back: 'Tillbaka till destinationen',
    results: 'Flygplatser i närheten',
    noResults: 'Inga flygplatser hittades i sökområdet.',
    unavailable: 'Flygplatser kunde inte laddas just nu.',
    providerChecked: 'Leverantören kontrollerad',
    website: 'Webbplats',
    disclaimer:
      'Detta är flygplatsplatser som leverantören returnerar nära destinationen. AttraVoya anger inte vilken flygplats som är huvudflygplats eller bäst och visar inte liveflyg, terminalinformation, priser, transferpriser eller tillgänglighet här.',
  },
  es: {
    eyebrow: 'Aeropuertos',
    title: 'Aeropuertos cerca de {destination}',
    intro:
      'Consulta aeropuertos devueltos por el proveedor de lugares configurado cerca de este destino.',
    back: 'Volver al destino',
    results: 'Aeropuertos cercanos',
    noResults: 'No se encontraron aeropuertos en esta zona de búsqueda.',
    unavailable: 'Los aeropuertos no se pueden cargar ahora.',
    providerChecked: 'Proveedor comprobado',
    website: 'Sitio web',
    disclaimer:
      'Estos son lugares de aeropuerto devueltos por el proveedor cerca del destino. AttraVoya no afirma cuál es el aeropuerto principal o mejor y aquí no ofrece vuelos en vivo, información de terminales, tarifas, precios de traslados ni disponibilidad.',
  },
  fr: {
    eyebrow: 'Aéroports',
    title: 'Aéroports près de {destination}',
    intro:
      'Consultez les aéroports renvoyés par le fournisseur de lieux configuré près de cette destination.',
    back: 'Retour à la destination',
    results: 'Aéroports à proximité',
    noResults: 'Aucun aéroport n’a été trouvé dans cette zone de recherche.',
    unavailable: 'Les aéroports ne peuvent pas être chargés actuellement.',
    providerChecked: 'Fournisseur vérifié',
    website: 'Site web',
    disclaimer:
      'Il s’agit de lieux d’aéroport renvoyés par le fournisseur près de la destination. AttraVoya ne désigne pas l’aéroport principal ou le meilleur et ne fournit ici ni vols en direct, ni informations de terminal, ni tarifs, ni prix de transfert, ni disponibilité.',
  },
  de: {
    eyebrow: 'Flughäfen',
    title: 'Flughäfen nahe {destination}',
    intro:
      'Sieh dir Flughäfen an, die der konfigurierte Orteanbieter in der Nähe dieses Reiseziels zurückgibt.',
    back: 'Zurück zum Reiseziel',
    results: 'Flughäfen in der Nähe',
    noResults: 'In diesem Suchgebiet wurden keine Flughäfen gefunden.',
    unavailable: 'Flughäfen können derzeit nicht geladen werden.',
    providerChecked: 'Anbieter geprüft',
    website: 'Website',
    disclaimer:
      'Dies sind vom Anbieter zurückgegebene Flughafenorte nahe dem Reiseziel. AttraVoya behauptet nicht, welcher Flughafen der wichtigste oder beste ist, und zeigt hier keine Live-Flüge, Terminalinformationen, Tarife, Transferpreise oder Verfügbarkeiten.',
  },
  it: {
    eyebrow: 'Aeroporti',
    title: 'Aeroporti vicino a {destination}',
    intro:
      'Consulta gli aeroporti restituiti dal fornitore di luoghi configurato vicino a questa destinazione.',
    back: 'Torna alla destinazione',
    results: 'Aeroporti nelle vicinanze',
    noResults: 'Nessun aeroporto è stato trovato in questa area di ricerca.',
    unavailable: 'Gli aeroporti non possono essere caricati al momento.',
    providerChecked: 'Fornitore controllato',
    website: 'Sito web',
    disclaimer:
      'Questi sono luoghi aeroportuali restituiti dal fornitore vicino alla destinazione. AttraVoya non indica quale sia l’aeroporto principale o migliore e non mostra qui voli in tempo reale, informazioni sui terminal, tariffe, prezzi dei trasferimenti o disponibilità.',
  },
  pt: {
    eyebrow: 'Aeroportos',
    title: 'Aeroportos perto de {destination}',
    intro:
      'Consulte aeroportos devolvidos pelo fornecedor de locais configurado perto deste destino.',
    back: 'Voltar ao destino',
    results: 'Aeroportos próximos',
    noResults: 'Não foram encontrados aeroportos nesta área de pesquisa.',
    unavailable: 'Os aeroportos não podem ser carregados agora.',
    providerChecked: 'Fornecedor verificado',
    website: 'Site',
    disclaimer:
      'Estes são locais de aeroporto devolvidos pelo fornecedor perto do destino. A AttraVoya não afirma qual é o aeroporto principal ou melhor e não fornece aqui voos em tempo real, informações de terminal, tarifas, preços de transfer ou disponibilidade.',
  },
  pl: {
    eyebrow: 'Lotniska',
    title: 'Lotniska w pobliżu {destination}',
    intro:
      'Przeglądaj lotniska zwrócone przez skonfigurowanego dostawcę miejsc w pobliżu celu podróży.',
    back: 'Wróć do celu podróży',
    results: 'Lotniska w pobliżu',
    noResults: 'W tym obszarze wyszukiwania nie znaleziono lotnisk.',
    unavailable: 'Nie można teraz wczytać lotnisk.',
    providerChecked: 'Dostawca sprawdzony',
    website: 'Strona internetowa',
    disclaimer:
      'Są to miejsca lotnisk zwrócone przez dostawcę w pobliżu celu podróży. AttraVoya nie określa, które lotnisko jest główne lub najlepsze, i nie pokazuje tutaj lotów na żywo, informacji o terminalach, taryf, cen transferów ani dostępności.',
  },
  nl: {
    eyebrow: 'Luchthavens',
    title: 'Luchthavens bij {destination}',
    intro:
      'Bekijk luchthavens die door de ingestelde plaatsenprovider in de buurt van deze bestemming worden teruggegeven.',
    back: 'Terug naar bestemming',
    results: 'Luchthavens in de buurt',
    noResults: 'Er zijn geen luchthavens gevonden in dit zoekgebied.',
    unavailable: 'Luchthavens kunnen momenteel niet worden geladen.',
    providerChecked: 'Provider gecontroleerd',
    website: 'Website',
    disclaimer:
      'Dit zijn luchthavenlocaties die de provider in de buurt van de bestemming teruggeeft. AttraVoya beweert niet welke luchthaven de belangrijkste of beste is en toont hier geen live vluchten, terminalinformatie, tarieven, transferprijzen of beschikbaarheid.',
  },
  no: {
    eyebrow: 'Flyplasser',
    title: 'Flyplasser nær {destination}',
    intro: 'Se flyplasser som den konfigurerte stedsleverantøren returnerer nær dette reisemålet.',
    back: 'Tilbake til reisemålet',
    results: 'Flyplasser i nærheten',
    noResults: 'Ingen flyplasser ble funnet i dette søkeområdet.',
    unavailable: 'Flyplasser kan ikke lastes akkurat nå.',
    providerChecked: 'Leverandør kontrollert',
    website: 'Nettsted',
    disclaimer:
      'Dette er flyplasssteder returnert av leverandøren nær reisemålet. AttraVoya hevder ikke hvilken flyplass som er hovedflyplass eller best, og viser ikke sanntidsflyvninger, terminalinformasjon, priser, transferpriser eller tilgjengelighet her.',
  },
  da: {
    eyebrow: 'Lufthavne',
    title: 'Lufthavne nær {destination}',
    intro: 'Se lufthavne, som den konfigurerede stedudbyder returnerer nær denne destination.',
    back: 'Tilbage til destinationen',
    results: 'Lufthavne i nærheden',
    noResults: 'Der blev ikke fundet lufthavne i dette søgeområde.',
    unavailable: 'Lufthavne kan ikke indlæses lige nu.',
    providerChecked: 'Udbyder kontrolleret',
    website: 'Websted',
    disclaimer:
      'Dette er lufthavnssteder, som udbyderen returnerer nær destinationen. AttraVoya hævder ikke, hvilken lufthavn der er hovedlufthavn eller bedst, og viser ikke livefly, terminaloplysninger, priser, transferpriser eller tilgængelighed her.',
  },
  fi: {
    eyebrow: 'Lentoasemat',
    title: 'Lentoasemat lähellä kohdetta {destination}',
    intro: 'Selaa määritetyn paikkapalvelun palauttamia lentoasemia tämän kohteen lähellä.',
    back: 'Takaisin kohteeseen',
    results: 'Lähialueen lentoasemat',
    noResults: 'Tältä hakualueelta ei löytynyt lentoasemia.',
    unavailable: 'Lentoasemia ei voida ladata juuri nyt.',
    providerChecked: 'Palvelu tarkistettu',
    website: 'Verkkosivusto',
    disclaimer:
      'Nämä ovat palveluntarjoajan palauttamia lentoasemapaikkoja kohteen lähellä. AttraVoya ei väitä mitään lentoasemaa pääasialliseksi tai parhaaksi eikä näytä tässä reaaliaikaisia lentoja, terminaalitietoja, hintoja, kuljetushintoja tai saatavuutta.',
  },
  tr: {
    eyebrow: 'Havalimanları',
    title: '{destination} yakınındaki havalimanları',
    intro:
      'Yapılandırılmış yer sağlayıcısının bu hedefin yakınında döndürdüğü havalimanlarını görüntüleyin.',
    back: 'Hedefe dön',
    results: 'Yakındaki havalimanları',
    noResults: 'Bu arama alanında havalimanı bulunamadı.',
    unavailable: 'Havalimanları şu anda yüklenemiyor.',
    providerChecked: 'Sağlayıcı kontrol edildi',
    website: 'Web sitesi',
    disclaimer:
      'Bunlar sağlayıcının hedef yakınında döndürdüğü havalimanı yerleridir. AttraVoya hangi havalimanının ana veya en iyi olduğunu iddia etmez ve burada canlı uçuş, terminal bilgisi, ücret, transfer fiyatı veya müsaitlik göstermez.',
  },
  ar: {
    eyebrow: 'المطارات',
    title: 'مطارات بالقرب من {destination}',
    intro: 'تصفح المطارات التي يعيدها مزود الأماكن المُعد بالقرب من هذه الوجهة.',
    back: 'العودة إلى الوجهة',
    results: 'المطارات القريبة',
    noResults: 'لم يتم العثور على مطارات في منطقة البحث هذه.',
    unavailable: 'تعذر تحميل المطارات الآن.',
    providerChecked: 'تم فحص المزود',
    website: 'الموقع الإلكتروني',
    disclaimer:
      'هذه مواقع مطارات يعيدها المزود بالقرب من الوجهة. لا تدّعي AttraVoya أي مطار باعتباره الرئيسي أو الأفضل، ولا تعرض هنا رحلات مباشرة أو معلومات المحطات أو الأسعار أو أسعار النقل أو التوفر.',
  },
  zh: {
    eyebrow: '机场',
    title: '{destination}附近的机场',
    intro: '浏览已配置地点提供商返回的目的地附近机场。',
    back: '返回目的地',
    results: '附近机场',
    noResults: '此搜索区域未找到机场。',
    unavailable: '目前无法加载机场。',
    providerChecked: '提供商检查时间',
    website: '网站',
    disclaimer:
      '这些是地点提供商返回的目的地附近机场。AttraVoya 不声称哪个机场是主要或最佳机场，也不会在此提供实时航班、航站楼信息、票价、接送价格或可用性。',
  },
  ja: {
    eyebrow: '空港',
    title: '{destination}周辺の空港',
    intro: '設定済みの場所プロバイダーがこの目的地周辺で返した空港を確認できます。',
    back: '目的地に戻る',
    results: '周辺の空港',
    noResults: 'この検索範囲では空港が見つかりませんでした。',
    unavailable: '現在空港を読み込めません。',
    providerChecked: 'プロバイダー確認',
    website: 'ウェブサイト',
    disclaimer:
      'これらは場所プロバイダーが目的地周辺で返した空港です。AttraVoya は主要または最適な空港を断定せず、ここではリアルタイムのフライト、ターミナル情報、運賃、送迎料金、空き状況を提供しません。',
  },
  ko: {
    eyebrow: '공항',
    title: '{destination} 근처 공항',
    intro: '설정된 장소 제공업체가 이 목적지 근처에서 반환한 공항을 확인하세요.',
    back: '목적지로 돌아가기',
    results: '근처 공항',
    noResults: '이 검색 영역에서 공항을 찾지 못했습니다.',
    unavailable: '현재 공항을 불러올 수 없습니다.',
    providerChecked: '제공업체 확인',
    website: '웹사이트',
    disclaimer:
      '이는 장소 제공업체가 목적지 근처에서 반환한 공항입니다. AttraVoya는 어떤 공항이 주요 공항이거나 가장 좋은지 주장하지 않으며 여기에서 실시간 항공편, 터미널 정보, 요금, 이동 가격 또는 이용 가능 여부를 제공하지 않습니다.',
  },
  hi: {
    eyebrow: 'हवाई अड्डे',
    title: '{destination} के पास हवाई अड्डे',
    intro: 'इस गंतव्य के पास कॉन्फ़िगर किए गए स्थान प्रदाता द्वारा लौटाए गए हवाई अड्डे देखें।',
    back: 'गंतव्य पर वापस जाएँ',
    results: 'पास के हवाई अड्डे',
    noResults: 'इस खोज क्षेत्र में कोई हवाई अड्डा नहीं मिला।',
    unavailable: 'अभी हवाई अड्डे लोड नहीं किए जा सकते।',
    providerChecked: 'प्रदाता की जाँच',
    website: 'वेबसाइट',
    disclaimer:
      'ये गंतव्य के पास स्थान प्रदाता द्वारा लौटाए गए हवाई अड्डे हैं। AttraVoya यह दावा नहीं करता कि कौन सा हवाई अड्डा मुख्य या सबसे अच्छा है और यहाँ लाइव उड़ानें, टर्मिनल जानकारी, किराए, ट्रांसफर कीमतें या उपलब्धता नहीं देता।',
  },
});

export function getAirportsPageCopy(locale) {
  return AIRPORTS_PAGE_COPY[normalizeLocale(locale)] ?? AIRPORTS_PAGE_COPY.en;
}
