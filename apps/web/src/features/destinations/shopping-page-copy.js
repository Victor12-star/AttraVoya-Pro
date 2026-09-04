import { normalizeLocale } from '@attravoya/localization';

/**
 * @typedef {object} ShoppingPageCopy
 * @property {string} eyebrow
 * @property {string} title
 * @property {string} intro
 * @property {string} back
 * @property {string} searchArea
 * @property {string} results
 * @property {string} noResults
 * @property {string} unavailable
 * @property {string} website
 * @property {string} distance
 */

const SHOPPING_PAGE_COPY = /** @type {Readonly<Record<string, ShoppingPageCopy>>} */ (
  Object.freeze({
    en: {
      eyebrow: 'Shopping',
      title: 'Shopping near {destination}',
      intro:
        'Discover real shopping malls returned by the configured places provider near this destination.',
      back: 'Back to destination',
      searchArea: 'Within 10 km',
      results: 'Results',
      noResults: 'No shopping malls were found in this search area.',
      unavailable: 'Shopping places could not be loaded right now.',
      website: 'Website',
      distance: 'Distance',
    },
    sv: {
      eyebrow: 'Shopping',
      title: 'Shopping nära {destination}',
      intro:
        'Upptäck verkliga köpcentrum som hämtas från den konfigurerade platsleverantören nära destinationen.',
      back: 'Tillbaka till destinationen',
      searchArea: 'Inom 10 km',
      results: 'Resultat',
      noResults: 'Inga köpcentrum hittades i det här sökområdet.',
      unavailable: 'Shoppingplatserna kunde inte hämtas just nu.',
      website: 'Webbplats',
      distance: 'Avstånd',
    },
    es: {
      eyebrow: 'Compras',
      title: 'Compras cerca de {destination}',
      intro:
        'Descubre centros comerciales reales devueltos por el proveedor de lugares configurado cerca de este destino.',
      back: 'Volver al destino',
      searchArea: 'En un radio de 10 km',
      results: 'Resultados',
      noResults: 'No se encontraron centros comerciales en esta zona de búsqueda.',
      unavailable: 'No se pudieron cargar los lugares de compras en este momento.',
      website: 'Sitio web',
      distance: 'Distancia',
    },
    fr: {
      eyebrow: 'Shopping',
      title: 'Shopping près de {destination}',
      intro:
        'Découvrez de vrais centres commerciaux renvoyés par le fournisseur de lieux configuré près de cette destination.',
      back: 'Retour à la destination',
      searchArea: 'Dans un rayon de 10 km',
      results: 'Résultats',
      noResults: 'Aucun centre commercial n’a été trouvé dans cette zone de recherche.',
      unavailable: 'Les lieux de shopping ne peuvent pas être chargés pour le moment.',
      website: 'Site web',
      distance: 'Distance',
    },
    de: {
      eyebrow: 'Shopping',
      title: 'Shopping nahe {destination}',
      intro:
        'Entdecke echte Einkaufszentren, die der konfigurierte Orte-Anbieter in der Nähe dieses Reiseziels liefert.',
      back: 'Zurück zum Reiseziel',
      searchArea: 'Im Umkreis von 10 km',
      results: 'Ergebnisse',
      noResults: 'In diesem Suchbereich wurden keine Einkaufszentren gefunden.',
      unavailable: 'Shopping-Orte können derzeit nicht geladen werden.',
      website: 'Webseite',
      distance: 'Entfernung',
    },
    it: {
      eyebrow: 'Shopping',
      title: 'Shopping vicino a {destination}',
      intro:
        'Scopri centri commerciali reali restituiti dal provider di luoghi configurato vicino a questa destinazione.',
      back: 'Torna alla destinazione',
      searchArea: 'Entro 10 km',
      results: 'Risultati',
      noResults: 'Nessun centro commerciale trovato in questa area di ricerca.',
      unavailable: 'Al momento non è possibile caricare i luoghi per lo shopping.',
      website: 'Sito web',
      distance: 'Distanza',
    },
    pt: {
      eyebrow: 'Compras',
      title: 'Compras perto de {destination}',
      intro:
        'Descubra centros comerciais reais devolvidos pelo fornecedor de locais configurado perto deste destino.',
      back: 'Voltar ao destino',
      searchArea: 'Num raio de 10 km',
      results: 'Resultados',
      noResults: 'Nenhum centro comercial foi encontrado nesta área de pesquisa.',
      unavailable: 'Não foi possível carregar os locais de compras neste momento.',
      website: 'Site',
      distance: 'Distância',
    },
    pl: {
      eyebrow: 'Zakupy',
      title: 'Zakupy w pobliżu {destination}',
      intro:
        'Odkrywaj prawdziwe centra handlowe zwrócone przez skonfigurowanego dostawcę miejsc w pobliżu tego celu podróży.',
      back: 'Wróć do celu podróży',
      searchArea: 'W promieniu 10 km',
      results: 'Wyniki',
      noResults: 'Nie znaleziono centrów handlowych w tym obszarze wyszukiwania.',
      unavailable: 'Nie można teraz wczytać miejsc zakupowych.',
      website: 'Strona internetowa',
      distance: 'Odległość',
    },
    nl: {
      eyebrow: 'Winkelen',
      title: 'Winkelen bij {destination}',
      intro:
        'Ontdek echte winkelcentra die door de ingestelde plaatsenprovider nabij deze bestemming worden geleverd.',
      back: 'Terug naar bestemming',
      searchArea: 'Binnen 10 km',
      results: 'Resultaten',
      noResults: 'Er zijn geen winkelcentra gevonden in dit zoekgebied.',
      unavailable: 'Winkellocaties kunnen nu niet worden geladen.',
      website: 'Website',
      distance: 'Afstand',
    },
    no: {
      eyebrow: 'Shopping',
      title: 'Shopping nær {destination}',
      intro:
        'Oppdag ekte kjøpesentre som returneres av den konfigurerte stedsleverandøren nær dette reisemålet.',
      back: 'Tilbake til reisemålet',
      searchArea: 'Innen 10 km',
      results: 'Resultater',
      noResults: 'Ingen kjøpesentre ble funnet i dette søkeområdet.',
      unavailable: 'Shoppingsteder kan ikke lastes inn akkurat nå.',
      website: 'Nettsted',
      distance: 'Avstand',
    },
    da: {
      eyebrow: 'Shopping',
      title: 'Shopping nær {destination}',
      intro:
        'Find rigtige indkøbscentre, som den konfigurerede stedsudbyder returnerer nær denne destination.',
      back: 'Tilbage til destinationen',
      searchArea: 'Inden for 10 km',
      results: 'Resultater',
      noResults: 'Der blev ikke fundet nogen indkøbscentre i dette søgeområde.',
      unavailable: 'Shoppingsteder kan ikke indlæses lige nu.',
      website: 'Websted',
      distance: 'Afstand',
    },
    fi: {
      eyebrow: 'Ostokset',
      title: 'Ostokset kohteen {destination} lähellä',
      intro:
        'Tutustu todellisiin kauppakeskuksiin, jotka määritetty paikkapalvelu palauttaa tämän kohteen läheltä.',
      back: 'Takaisin kohteeseen',
      searchArea: '10 km säteellä',
      results: 'Tulokset',
      noResults: 'Tältä hakualueelta ei löytynyt kauppakeskuksia.',
      unavailable: 'Ostospaikkoja ei voida ladata juuri nyt.',
      website: 'Verkkosivusto',
      distance: 'Etäisyys',
    },
    tr: {
      eyebrow: 'Alışveriş',
      title: '{destination} yakınında alışveriş',
      intro:
        'Bu varış noktasının yakınında yapılandırılmış yer sağlayıcısının döndürdüğü gerçek alışveriş merkezlerini keşfedin.',
      back: 'Varış noktasına dön',
      searchArea: '10 km içinde',
      results: 'Sonuçlar',
      noResults: 'Bu arama alanında alışveriş merkezi bulunamadı.',
      unavailable: 'Alışveriş yerleri şu anda yüklenemiyor.',
      website: 'Web sitesi',
      distance: 'Mesafe',
    },
    ar: {
      eyebrow: 'التسوق',
      title: 'التسوق بالقرب من {destination}',
      intro: 'اكتشف مراكز تسوق حقيقية يعرضها مزود الأماكن المهيأ بالقرب من هذه الوجهة.',
      back: 'العودة إلى الوجهة',
      searchArea: 'ضمن 10 كم',
      results: 'النتائج',
      noResults: 'لم يتم العثور على مراكز تسوق في منطقة البحث هذه.',
      unavailable: 'يتعذر تحميل أماكن التسوق الآن.',
      website: 'الموقع الإلكتروني',
      distance: 'المسافة',
    },
    zh: {
      eyebrow: '购物',
      title: '{destination}附近的购物场所',
      intro: '探索由已配置地点提供商返回的该目的地附近真实购物中心。',
      back: '返回目的地',
      searchArea: '10 公里范围内',
      results: '结果',
      noResults: '此搜索区域内未找到购物中心。',
      unavailable: '目前无法加载购物场所。',
      website: '网站',
      distance: '距离',
    },
    ja: {
      eyebrow: 'ショッピング',
      title: '{destination}周辺のショッピング',
      intro:
        '設定済みの場所プロバイダーから返された、この目的地周辺の実在するショッピングモールを探せます。',
      back: '目的地に戻る',
      searchArea: '10 km以内',
      results: '結果',
      noResults: 'この検索範囲ではショッピングモールが見つかりませんでした。',
      unavailable: '現在、ショッピングスポットを読み込めません。',
      website: 'ウェブサイト',
      distance: '距離',
    },
    ko: {
      eyebrow: '쇼핑',
      title: '{destination} 주변 쇼핑',
      intro: '설정된 장소 제공자가 반환한 이 목적지 주변의 실제 쇼핑몰을 둘러보세요.',
      back: '목적지로 돌아가기',
      searchArea: '10 km 이내',
      results: '결과',
      noResults: '이 검색 지역에서 쇼핑몰을 찾지 못했습니다.',
      unavailable: '현재 쇼핑 장소를 불러올 수 없습니다.',
      website: '웹사이트',
      distance: '거리',
    },
    hi: {
      eyebrow: 'खरीदारी',
      title: '{destination} के पास खरीदारी',
      intro: 'इस गंतव्य के पास कॉन्फ़िगर किए गए स्थान प्रदाता से मिले वास्तविक शॉपिंग मॉल देखें।',
      back: 'गंतव्य पर वापस जाएँ',
      searchArea: '10 किमी के भीतर',
      results: 'परिणाम',
      noResults: 'इस खोज क्षेत्र में कोई शॉपिंग मॉल नहीं मिला।',
      unavailable: 'अभी खरीदारी के स्थान लोड नहीं किए जा सकते।',
      website: 'वेबसाइट',
      distance: 'दूरी',
    },
  })
);

/** @param {string} locale */
export function getShoppingPageCopy(locale) {
  const normalizedLocale = normalizeLocale(locale);
  return SHOPPING_PAGE_COPY[normalizedLocale] ?? SHOPPING_PAGE_COPY.en;
}
