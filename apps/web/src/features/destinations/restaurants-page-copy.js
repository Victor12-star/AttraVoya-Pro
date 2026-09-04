import { normalizeLocale } from '@attravoya/localization';

/**
 * @typedef {object} RestaurantsPageCopy
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

const RESTAURANTS_PAGE_COPY = /** @type {Readonly<Record<string, RestaurantsPageCopy>>} */ (
  Object.freeze({
    en: {
      eyebrow: 'Restaurants',
      title: 'Restaurants in {destination}',
      intro:
        'Discover real restaurants returned by the configured places provider near this destination.',
      back: 'Back to destination',
      searchArea: 'Within 5 km',
      results: 'Results',
      noResults: 'No restaurants were found in this search area.',
      unavailable: 'Restaurants could not be loaded right now.',
      website: 'Website',
      distance: 'Distance',
    },
    sv: {
      eyebrow: 'Restauranger',
      title: 'Restauranger i {destination}',
      intro:
        'Upptäck verkliga restauranger som hämtas från den konfigurerade platsleverantören nära destinationen.',
      back: 'Tillbaka till destinationen',
      searchArea: 'Inom 5 km',
      results: 'Resultat',
      noResults: 'Inga restauranger hittades i det här sökområdet.',
      unavailable: 'Restaurangerna kunde inte hämtas just nu.',
      website: 'Webbplats',
      distance: 'Avstånd',
    },
    es: {
      eyebrow: 'Restaurantes',
      title: 'Restaurantes en {destination}',
      intro:
        'Descubre restaurantes reales devueltos por el proveedor de lugares configurado cerca de este destino.',
      back: 'Volver al destino',
      searchArea: 'En un radio de 5 km',
      results: 'Resultados',
      noResults: 'No se encontraron restaurantes en esta zona de búsqueda.',
      unavailable: 'No se pudieron cargar los restaurantes en este momento.',
      website: 'Sitio web',
      distance: 'Distancia',
    },
    fr: {
      eyebrow: 'Restaurants',
      title: 'Restaurants à {destination}',
      intro:
        'Découvrez de vrais restaurants renvoyés par le fournisseur de lieux configuré près de cette destination.',
      back: 'Retour à la destination',
      searchArea: 'Dans un rayon de 5 km',
      results: 'Résultats',
      noResults: 'Aucun restaurant n’a été trouvé dans cette zone de recherche.',
      unavailable: 'Les restaurants ne peuvent pas être chargés pour le moment.',
      website: 'Site web',
      distance: 'Distance',
    },
    de: {
      eyebrow: 'Restaurants',
      title: 'Restaurants in {destination}',
      intro:
        'Entdecke echte Restaurants, die der konfigurierte Orte-Anbieter in der Nähe dieses Reiseziels liefert.',
      back: 'Zurück zum Reiseziel',
      searchArea: 'Im Umkreis von 5 km',
      results: 'Ergebnisse',
      noResults: 'In diesem Suchbereich wurden keine Restaurants gefunden.',
      unavailable: 'Restaurants können derzeit nicht geladen werden.',
      website: 'Webseite',
      distance: 'Entfernung',
    },
    it: {
      eyebrow: 'Ristoranti',
      title: 'Ristoranti a {destination}',
      intro:
        'Scopri ristoranti reali restituiti dal provider di luoghi configurato vicino a questa destinazione.',
      back: 'Torna alla destinazione',
      searchArea: 'Entro 5 km',
      results: 'Risultati',
      noResults: 'Nessun ristorante trovato in questa area di ricerca.',
      unavailable: 'Al momento non è possibile caricare i ristoranti.',
      website: 'Sito web',
      distance: 'Distanza',
    },
    pt: {
      eyebrow: 'Restaurantes',
      title: 'Restaurantes em {destination}',
      intro:
        'Descubra restaurantes reais devolvidos pelo fornecedor de locais configurado perto deste destino.',
      back: 'Voltar ao destino',
      searchArea: 'Num raio de 5 km',
      results: 'Resultados',
      noResults: 'Nenhum restaurante foi encontrado nesta área de pesquisa.',
      unavailable: 'Não foi possível carregar os restaurantes neste momento.',
      website: 'Site',
      distance: 'Distância',
    },
    pl: {
      eyebrow: 'Restauracje',
      title: 'Restauracje w {destination}',
      intro:
        'Odkrywaj prawdziwe restauracje zwrócone przez skonfigurowanego dostawcę miejsc w pobliżu tego celu podróży.',
      back: 'Wróć do celu podróży',
      searchArea: 'W promieniu 5 km',
      results: 'Wyniki',
      noResults: 'Nie znaleziono restauracji w tym obszarze wyszukiwania.',
      unavailable: 'Nie można teraz wczytać restauracji.',
      website: 'Strona internetowa',
      distance: 'Odległość',
    },
    nl: {
      eyebrow: 'Restaurants',
      title: 'Restaurants in {destination}',
      intro:
        'Ontdek echte restaurants die door de ingestelde plaatsenprovider nabij deze bestemming worden geleverd.',
      back: 'Terug naar bestemming',
      searchArea: 'Binnen 5 km',
      results: 'Resultaten',
      noResults: 'Er zijn geen restaurants gevonden in dit zoekgebied.',
      unavailable: 'Restaurants kunnen nu niet worden geladen.',
      website: 'Website',
      distance: 'Afstand',
    },
    no: {
      eyebrow: 'Restauranter',
      title: 'Restauranter i {destination}',
      intro:
        'Oppdag ekte restauranter som returneres av den konfigurerte stedsleverandøren nær dette reisemålet.',
      back: 'Tilbake til reisemålet',
      searchArea: 'Innen 5 km',
      results: 'Resultater',
      noResults: 'Ingen restauranter ble funnet i dette søkeområdet.',
      unavailable: 'Restaurantene kan ikke lastes inn akkurat nå.',
      website: 'Nettsted',
      distance: 'Avstand',
    },
    da: {
      eyebrow: 'Restauranter',
      title: 'Restauranter i {destination}',
      intro:
        'Find rigtige restauranter, som den konfigurerede stedsudbyder returnerer nær denne destination.',
      back: 'Tilbage til destinationen',
      searchArea: 'Inden for 5 km',
      results: 'Resultater',
      noResults: 'Der blev ikke fundet nogen restauranter i dette søgeområde.',
      unavailable: 'Restauranterne kan ikke indlæses lige nu.',
      website: 'Websted',
      distance: 'Afstand',
    },
    fi: {
      eyebrow: 'Ravintolat',
      title: 'Ravintolat kohteessa {destination}',
      intro:
        'Tutustu todellisiin ravintoloihin, jotka määritetty paikkapalvelu palauttaa tämän kohteen läheltä.',
      back: 'Takaisin kohteeseen',
      searchArea: '5 km säteellä',
      results: 'Tulokset',
      noResults: 'Tältä hakualueelta ei löytynyt ravintoloita.',
      unavailable: 'Ravintoloita ei voida ladata juuri nyt.',
      website: 'Verkkosivusto',
      distance: 'Etäisyys',
    },
    tr: {
      eyebrow: 'Restoranlar',
      title: '{destination} bölgesindeki restoranlar',
      intro:
        'Bu varış noktasının yakınında yapılandırılmış yer sağlayıcısının döndürdüğü gerçek restoranları keşfedin.',
      back: 'Varış noktasına dön',
      searchArea: '5 km içinde',
      results: 'Sonuçlar',
      noResults: 'Bu arama alanında restoran bulunamadı.',
      unavailable: 'Restoranlar şu anda yüklenemiyor.',
      website: 'Web sitesi',
      distance: 'Mesafe',
    },
    ar: {
      eyebrow: 'المطاعم',
      title: 'مطاعم في {destination}',
      intro: 'اكتشف مطاعم حقيقية يعرضها مزود الأماكن المهيأ بالقرب من هذه الوجهة.',
      back: 'العودة إلى الوجهة',
      searchArea: 'ضمن 5 كم',
      results: 'النتائج',
      noResults: 'لم يتم العثور على مطاعم في منطقة البحث هذه.',
      unavailable: 'يتعذر تحميل المطاعم الآن.',
      website: 'الموقع الإلكتروني',
      distance: 'المسافة',
    },
    zh: {
      eyebrow: '餐厅',
      title: '{destination}的餐厅',
      intro: '探索由已配置地点提供商返回的该目的地附近真实餐厅。',
      back: '返回目的地',
      searchArea: '5 公里范围内',
      results: '结果',
      noResults: '此搜索区域内未找到餐厅。',
      unavailable: '目前无法加载餐厅。',
      website: '网站',
      distance: '距离',
    },
    ja: {
      eyebrow: 'レストラン',
      title: '{destination}のレストラン',
      intro: '設定済みの場所プロバイダーから返された、この目的地周辺の実在するレストランを探せます。',
      back: '目的地に戻る',
      searchArea: '5 km以内',
      results: '結果',
      noResults: 'この検索範囲ではレストランが見つかりませんでした。',
      unavailable: '現在、レストランを読み込めません。',
      website: 'ウェブサイト',
      distance: '距離',
    },
    ko: {
      eyebrow: '레스토랑',
      title: '{destination}의 레스토랑',
      intro: '설정된 장소 제공자가 반환한 이 목적지 주변의 실제 레스토랑을 둘러보세요.',
      back: '목적지로 돌아가기',
      searchArea: '5 km 이내',
      results: '결과',
      noResults: '이 검색 지역에서 레스토랑을 찾지 못했습니다.',
      unavailable: '현재 레스토랑을 불러올 수 없습니다.',
      website: '웹사이트',
      distance: '거리',
    },
    hi: {
      eyebrow: 'रेस्तराँ',
      title: '{destination} में रेस्तराँ',
      intro: 'इस गंतव्य के पास कॉन्फ़िगर किए गए स्थान प्रदाता से मिले वास्तविक रेस्तराँ देखें।',
      back: 'गंतव्य पर वापस जाएँ',
      searchArea: '5 किमी के भीतर',
      results: 'परिणाम',
      noResults: 'इस खोज क्षेत्र में कोई रेस्तराँ नहीं मिला।',
      unavailable: 'अभी रेस्तराँ लोड नहीं किए जा सकते।',
      website: 'वेबसाइट',
      distance: 'दूरी',
    },
  })
);

/** @param {string} locale */
export function getRestaurantsPageCopy(locale) {
  const normalizedLocale = normalizeLocale(locale);
  return RESTAURANTS_PAGE_COPY[normalizedLocale] ?? RESTAURANTS_PAGE_COPY.en;
}
