import { normalizeLocale } from '@attravoya/localization';

/**
 * @typedef {object} BeachesPageCopy
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

const BEACHES_PAGE_COPY = /** @type {Readonly<Record<string, BeachesPageCopy>>} */ (
  Object.freeze({
    en: {
      eyebrow: 'Beaches',
      title: 'Beaches near {destination}',
      intro:
        'Discover real beaches returned by the configured places provider near this destination.',
      back: 'Back to destination',
      searchArea: 'Within 20 km',
      results: 'Results',
      noResults: 'No beaches were found in this search area.',
      unavailable: 'Beaches could not be loaded right now.',
      website: 'Website',
      distance: 'Distance',
    },
    sv: {
      eyebrow: 'Stränder',
      title: 'Stränder nära {destination}',
      intro:
        'Upptäck verkliga stränder som hämtas från den konfigurerade platsleverantören nära destinationen.',
      back: 'Tillbaka till destinationen',
      searchArea: 'Inom 20 km',
      results: 'Resultat',
      noResults: 'Inga stränder hittades i det här sökområdet.',
      unavailable: 'Stränderna kunde inte hämtas just nu.',
      website: 'Webbplats',
      distance: 'Avstånd',
    },
    es: {
      eyebrow: 'Playas',
      title: 'Playas cerca de {destination}',
      intro:
        'Descubre playas reales devueltas por el proveedor de lugares configurado cerca de este destino.',
      back: 'Volver al destino',
      searchArea: 'En un radio de 20 km',
      results: 'Resultados',
      noResults: 'No se encontraron playas en esta zona de búsqueda.',
      unavailable: 'No se pudieron cargar las playas en este momento.',
      website: 'Sitio web',
      distance: 'Distancia',
    },
    fr: {
      eyebrow: 'Plages',
      title: 'Plages près de {destination}',
      intro:
        'Découvrez de vraies plages renvoyées par le fournisseur de lieux configuré près de cette destination.',
      back: 'Retour à la destination',
      searchArea: 'Dans un rayon de 20 km',
      results: 'Résultats',
      noResults: 'Aucune plage n’a été trouvée dans cette zone de recherche.',
      unavailable: 'Les plages ne peuvent pas être chargées pour le moment.',
      website: 'Site web',
      distance: 'Distance',
    },
    de: {
      eyebrow: 'Strände',
      title: 'Strände nahe {destination}',
      intro:
        'Entdecke echte Strände, die der konfigurierte Orte-Anbieter in der Nähe dieses Reiseziels liefert.',
      back: 'Zurück zum Reiseziel',
      searchArea: 'Im Umkreis von 20 km',
      results: 'Ergebnisse',
      noResults: 'In diesem Suchbereich wurden keine Strände gefunden.',
      unavailable: 'Strände können derzeit nicht geladen werden.',
      website: 'Webseite',
      distance: 'Entfernung',
    },
    it: {
      eyebrow: 'Spiagge',
      title: 'Spiagge vicino a {destination}',
      intro:
        'Scopri spiagge reali restituite dal provider di luoghi configurato vicino a questa destinazione.',
      back: 'Torna alla destinazione',
      searchArea: 'Entro 20 km',
      results: 'Risultati',
      noResults: 'Nessuna spiaggia trovata in questa area di ricerca.',
      unavailable: 'Al momento non è possibile caricare le spiagge.',
      website: 'Sito web',
      distance: 'Distanza',
    },
    pt: {
      eyebrow: 'Praias',
      title: 'Praias perto de {destination}',
      intro:
        'Descubra praias reais devolvidas pelo fornecedor de locais configurado perto deste destino.',
      back: 'Voltar ao destino',
      searchArea: 'Num raio de 20 km',
      results: 'Resultados',
      noResults: 'Nenhuma praia foi encontrada nesta área de pesquisa.',
      unavailable: 'Não foi possível carregar as praias neste momento.',
      website: 'Site',
      distance: 'Distância',
    },
    pl: {
      eyebrow: 'Plaże',
      title: 'Plaże w pobliżu {destination}',
      intro:
        'Odkrywaj prawdziwe plaże zwrócone przez skonfigurowanego dostawcę miejsc w pobliżu tego celu podróży.',
      back: 'Wróć do celu podróży',
      searchArea: 'W promieniu 20 km',
      results: 'Wyniki',
      noResults: 'Nie znaleziono plaż w tym obszarze wyszukiwania.',
      unavailable: 'Nie można teraz wczytać plaż.',
      website: 'Strona internetowa',
      distance: 'Odległość',
    },
    nl: {
      eyebrow: 'Stranden',
      title: 'Stranden bij {destination}',
      intro:
        'Ontdek echte stranden die door de ingestelde plaatsenprovider nabij deze bestemming worden geleverd.',
      back: 'Terug naar bestemming',
      searchArea: 'Binnen 20 km',
      results: 'Resultaten',
      noResults: 'Er zijn geen stranden gevonden in dit zoekgebied.',
      unavailable: 'Stranden kunnen nu niet worden geladen.',
      website: 'Website',
      distance: 'Afstand',
    },
    no: {
      eyebrow: 'Strender',
      title: 'Strender nær {destination}',
      intro:
        'Oppdag ekte strender som returneres av den konfigurerte stedsleverandøren nær dette reisemålet.',
      back: 'Tilbake til reisemålet',
      searchArea: 'Innen 20 km',
      results: 'Resultater',
      noResults: 'Ingen strender ble funnet i dette søkeområdet.',
      unavailable: 'Strendene kan ikke lastes inn akkurat nå.',
      website: 'Nettsted',
      distance: 'Avstand',
    },
    da: {
      eyebrow: 'Strande',
      title: 'Strande nær {destination}',
      intro:
        'Find rigtige strande, som den konfigurerede stedsudbyder returnerer nær denne destination.',
      back: 'Tilbage til destinationen',
      searchArea: 'Inden for 20 km',
      results: 'Resultater',
      noResults: 'Der blev ikke fundet nogen strande i dette søgeområde.',
      unavailable: 'Strandene kan ikke indlæses lige nu.',
      website: 'Websted',
      distance: 'Afstand',
    },
    fi: {
      eyebrow: 'Rannat',
      title: 'Rannat kohteen {destination} lähellä',
      intro:
        'Tutustu todellisiin rantoihin, jotka määritetty paikkapalvelu palauttaa tämän kohteen läheltä.',
      back: 'Takaisin kohteeseen',
      searchArea: '20 km säteellä',
      results: 'Tulokset',
      noResults: 'Tältä hakualueelta ei löytynyt rantoja.',
      unavailable: 'Rantoja ei voida ladata juuri nyt.',
      website: 'Verkkosivusto',
      distance: 'Etäisyys',
    },
    tr: {
      eyebrow: 'Plajlar',
      title: '{destination} yakınındaki plajlar',
      intro:
        'Bu varış noktasının yakınında yapılandırılmış yer sağlayıcısının döndürdüğü gerçek plajları keşfedin.',
      back: 'Varış noktasına dön',
      searchArea: '20 km içinde',
      results: 'Sonuçlar',
      noResults: 'Bu arama alanında plaj bulunamadı.',
      unavailable: 'Plajlar şu anda yüklenemiyor.',
      website: 'Web sitesi',
      distance: 'Mesafe',
    },
    ar: {
      eyebrow: 'الشواطئ',
      title: 'شواطئ بالقرب من {destination}',
      intro: 'اكتشف شواطئ حقيقية يعرضها مزود الأماكن المهيأ بالقرب من هذه الوجهة.',
      back: 'العودة إلى الوجهة',
      searchArea: 'ضمن 20 كم',
      results: 'النتائج',
      noResults: 'لم يتم العثور على شواطئ في منطقة البحث هذه.',
      unavailable: 'يتعذر تحميل الشواطئ الآن.',
      website: 'الموقع الإلكتروني',
      distance: 'المسافة',
    },
    zh: {
      eyebrow: '海滩',
      title: '{destination}附近的海滩',
      intro: '探索由已配置地点提供商返回的该目的地附近真实海滩。',
      back: '返回目的地',
      searchArea: '20 公里范围内',
      results: '结果',
      noResults: '此搜索区域内未找到海滩。',
      unavailable: '目前无法加载海滩。',
      website: '网站',
      distance: '距离',
    },
    ja: {
      eyebrow: 'ビーチ',
      title: '{destination}周辺のビーチ',
      intro: '設定済みの場所プロバイダーから返された、この目的地周辺の実在するビーチを探せます。',
      back: '目的地に戻る',
      searchArea: '20 km以内',
      results: '結果',
      noResults: 'この検索範囲ではビーチが見つかりませんでした。',
      unavailable: '現在、ビーチを読み込めません。',
      website: 'ウェブサイト',
      distance: '距離',
    },
    ko: {
      eyebrow: '해변',
      title: '{destination} 주변의 해변',
      intro: '설정된 장소 제공자가 반환한 이 목적지 주변의 실제 해변을 둘러보세요.',
      back: '목적지로 돌아가기',
      searchArea: '20 km 이내',
      results: '결과',
      noResults: '이 검색 지역에서 해변을 찾지 못했습니다.',
      unavailable: '현재 해변을 불러올 수 없습니다.',
      website: '웹사이트',
      distance: '거리',
    },
    hi: {
      eyebrow: 'समुद्र तट',
      title: '{destination} के पास समुद्र तट',
      intro: 'इस गंतव्य के पास कॉन्फ़िगर किए गए स्थान प्रदाता से मिले वास्तविक समुद्र तट देखें।',
      back: 'गंतव्य पर वापस जाएँ',
      searchArea: '20 किमी के भीतर',
      results: 'परिणाम',
      noResults: 'इस खोज क्षेत्र में कोई समुद्र तट नहीं मिला।',
      unavailable: 'अभी समुद्र तट लोड नहीं किए जा सकते।',
      website: 'वेबसाइट',
      distance: 'दूरी',
    },
  })
);

/** @param {string} locale */
export function getBeachesPageCopy(locale) {
  const normalizedLocale = normalizeLocale(locale);
  return BEACHES_PAGE_COPY[normalizedLocale] ?? BEACHES_PAGE_COPY.en;
}
