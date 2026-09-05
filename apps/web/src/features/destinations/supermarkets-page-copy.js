import { normalizeLocale } from '@attravoya/localization';

const SUPERMARKETS_PAGE_COPY = Object.freeze({
  en: {
    eyebrow: 'Supermarkets',
    title: 'Supermarkets near {destination}',
    intro:
      'Browse places categorized as supermarkets by the configured places provider near this destination.',
    back: 'Back to destination',
    results: 'Nearby supermarkets',
    noResults: 'No supermarkets were found in this search area.',
    unavailable: 'Supermarkets could not be loaded right now.',
    providerChecked: 'Provider checked',
    website: 'Website',
    disclaimer:
      'These are provider-returned places categorized as supermarkets near the destination. AttraVoya does not verify opening status, product stock, product availability, prices, promotions, delivery, collection, queues, or payment methods.',
  },
  sv: {
    eyebrow: 'Stormarknader',
    title: 'Stormarknader nära {destination}',
    intro:
      'Se platser som den konfigurerade platsleverantören kategoriserar som stormarknader nära destinationen.',
    back: 'Tillbaka till destinationen',
    results: 'Stormarknader i närheten',
    noResults: 'Inga stormarknader hittades i sökområdet.',
    unavailable: 'Stormarknader kunde inte laddas just nu.',
    providerChecked: 'Leverantör kontrollerad',
    website: 'Webbplats',
    disclaimer:
      'Detta är platser som leverantören kategoriserar som stormarknader nära destinationen. AttraVoya verifierar inte öppetstatus, varulager, produkttillgänglighet, priser, kampanjer, leverans, upphämtning, köer eller betalningsmetoder.',
  },
  es: {
    eyebrow: 'Supermercados',
    title: 'Supermercados cerca de {destination}',
    intro:
      'Consulta lugares que el proveedor configurado clasifica como supermercados cerca de este destino.',
    back: 'Volver al destino',
    results: 'Supermercados cercanos',
    noResults: 'No se encontraron supermercados en esta zona de búsqueda.',
    unavailable: 'Los supermercados no se pueden cargar ahora.',
    providerChecked: 'Proveedor comprobado',
    website: 'Sitio web',
    disclaimer:
      'Estos son lugares que el proveedor clasifica como supermercados cerca del destino. AttraVoya no verifica estado de apertura, existencias, disponibilidad de productos, precios, promociones, entrega, recogida, colas ni métodos de pago.',
  },
  fr: {
    eyebrow: 'Supermarchés',
    title: 'Supermarchés près de {destination}',
    intro:
      'Consultez les lieux classés comme supermarchés par le fournisseur configuré près de cette destination.',
    back: 'Retour à la destination',
    results: 'Supermarchés à proximité',
    noResults: 'Aucun supermarché n’a été trouvé dans cette zone de recherche.',
    unavailable: 'Les supermarchés ne peuvent pas être chargés actuellement.',
    providerChecked: 'Fournisseur vérifié',
    website: 'Site web',
    disclaimer:
      'Ces lieux sont classés comme supermarchés par le fournisseur près de la destination. AttraVoya ne vérifie pas l’ouverture, le stock, la disponibilité des produits, les prix, les promotions, la livraison, le retrait, les files d’attente ni les moyens de paiement.',
  },
  de: {
    eyebrow: 'Supermärkte',
    title: 'Supermärkte nahe {destination}',
    intro:
      'Sieh dir Orte an, die der konfigurierte Anbieter nahe diesem Reiseziel als Supermärkte einordnet.',
    back: 'Zurück zum Reiseziel',
    results: 'Supermärkte in der Nähe',
    noResults: 'In diesem Suchgebiet wurden keine Supermärkte gefunden.',
    unavailable: 'Supermärkte können derzeit nicht geladen werden.',
    providerChecked: 'Anbieter geprüft',
    website: 'Website',
    disclaimer:
      'Diese Orte werden vom Anbieter nahe dem Reiseziel als Supermärkte eingestuft. AttraVoya prüft weder Öffnungsstatus, Warenbestand, Produktverfügbarkeit, Preise, Aktionen, Lieferung, Abholung, Warteschlangen noch Zahlungsmethoden.',
  },
  it: {
    eyebrow: 'Supermercati',
    title: 'Supermercati vicino a {destination}',
    intro:
      'Consulta i luoghi classificati come supermercati dal fornitore configurato vicino a questa destinazione.',
    back: 'Torna alla destinazione',
    results: 'Supermercati nelle vicinanze',
    noResults: 'Nessun supermercato è stato trovato in questa area di ricerca.',
    unavailable: 'I supermercati non possono essere caricati al momento.',
    providerChecked: 'Fornitore controllato',
    website: 'Sito web',
    disclaimer:
      'Questi luoghi sono classificati come supermercati dal fornitore vicino alla destinazione. AttraVoya non verifica apertura, scorte, disponibilità dei prodotti, prezzi, promozioni, consegna, ritiro, code o metodi di pagamento.',
  },
  pt: {
    eyebrow: 'Supermercados',
    title: 'Supermercados perto de {destination}',
    intro:
      'Consulte locais classificados como supermercados pelo fornecedor configurado perto deste destino.',
    back: 'Voltar ao destino',
    results: 'Supermercados próximos',
    noResults: 'Não foram encontrados supermercados nesta área de pesquisa.',
    unavailable: 'Os supermercados não podem ser carregados agora.',
    providerChecked: 'Fornecedor verificado',
    website: 'Site',
    disclaimer:
      'Estes locais são classificados como supermercados pelo fornecedor perto do destino. A AttraVoya não verifica estado de abertura, stock, disponibilidade de produtos, preços, promoções, entrega, recolha, filas ou métodos de pagamento.',
  },
  pl: {
    eyebrow: 'Supermarkety',
    title: 'Supermarkety w pobliżu {destination}',
    intro:
      'Przeglądaj miejsca oznaczone przez skonfigurowanego dostawcę jako supermarkety w pobliżu celu podróży.',
    back: 'Wróć do celu podróży',
    results: 'Supermarkety w pobliżu',
    noResults: 'W tym obszarze wyszukiwania nie znaleziono supermarketów.',
    unavailable: 'Nie można teraz wczytać supermarketów.',
    providerChecked: 'Dostawca sprawdzony',
    website: 'Strona internetowa',
    disclaimer:
      'Są to miejsca oznaczone przez dostawcę jako supermarkety w pobliżu celu podróży. AttraVoya nie weryfikuje statusu otwarcia, zapasów, dostępności produktów, cen, promocji, dostawy, odbioru, kolejek ani metod płatności.',
  },
  nl: {
    eyebrow: 'Supermarkten',
    title: 'Supermarkten bij {destination}',
    intro:
      'Bekijk plaatsen die de ingestelde locatiesprovider als supermarkt classificeert nabij deze bestemming.',
    back: 'Terug naar bestemming',
    results: 'Supermarkten in de buurt',
    noResults: 'Er zijn geen supermarkten gevonden in dit zoekgebied.',
    unavailable: 'Supermarkten kunnen momenteel niet worden geladen.',
    providerChecked: 'Provider gecontroleerd',
    website: 'Website',
    disclaimer:
      'Deze plaatsen worden door de provider als supermarkten nabij de bestemming geclassificeerd. AttraVoya verifieert geen openingsstatus, voorraad, productbeschikbaarheid, prijzen, acties, bezorging, afhalen, wachtrijen of betaalmethoden.',
  },
  no: {
    eyebrow: 'Supermarkeder',
    title: 'Supermarkeder nær {destination}',
    intro:
      'Se steder som den konfigurerte stedsleverandøren kategoriserer som supermarkeder nær dette reisemålet.',
    back: 'Tilbake til reisemålet',
    results: 'Supermarkeder i nærheten',
    noResults: 'Ingen supermarkeder ble funnet i dette søkeområdet.',
    unavailable: 'Supermarkeder kan ikke lastes akkurat nå.',
    providerChecked: 'Leverandør kontrollert',
    website: 'Nettsted',
    disclaimer:
      'Dette er steder leverandøren kategoriserer som supermarkeder nær reisemålet. AttraVoya verifiserer ikke åpningsstatus, varebeholdning, produkttilgjengelighet, priser, kampanjer, levering, henting, køer eller betalingsmetoder.',
  },
  da: {
    eyebrow: 'Supermarkeder',
    title: 'Supermarkeder nær {destination}',
    intro:
      'Se steder, som den konfigurerede stedudbyder kategoriserer som supermarkeder nær denne destination.',
    back: 'Tilbage til destinationen',
    results: 'Supermarkeder i nærheden',
    noResults: 'Der blev ikke fundet supermarkeder i dette søgeområde.',
    unavailable: 'Supermarkeder kan ikke indlæses lige nu.',
    providerChecked: 'Udbyder kontrolleret',
    website: 'Websted',
    disclaimer:
      'Dette er steder, som udbyderen kategoriserer som supermarkeder nær destinationen. AttraVoya bekræfter ikke åbningsstatus, lager, produkttilgængelighed, priser, tilbud, levering, afhentning, køer eller betalingsmetoder.',
  },
  fi: {
    eyebrow: 'Supermarketit',
    title: 'Supermarketit lähellä kohdetta {destination}',
    intro:
      'Selaa paikkoja, jotka määritetty paikkapalvelu luokittelee supermarketeiksi tämän kohteen lähellä.',
    back: 'Takaisin kohteeseen',
    results: 'Lähellä olevat supermarketit',
    noResults: 'Tältä hakualueelta ei löytynyt supermarketteja.',
    unavailable: 'Supermarketteja ei voida ladata juuri nyt.',
    providerChecked: 'Palvelu tarkistettu',
    website: 'Verkkosivusto',
    disclaimer:
      'Nämä ovat palveluntarjoajan supermarketeiksi luokittelemia paikkoja kohteen lähellä. AttraVoya ei vahvista aukiolotilaa, varastoa, tuotteiden saatavuutta, hintoja, tarjouksia, toimitusta, noutoa, jonoja tai maksutapoja.',
  },
  tr: {
    eyebrow: 'Süpermarketler',
    title: '{destination} yakınındaki süpermarketler',
    intro:
      'Yapılandırılmış yer sağlayıcısının bu hedefin yakınında süpermarket olarak sınıflandırdığı yerleri görüntüleyin.',
    back: 'Hedefe dön',
    results: 'Yakındaki süpermarketler',
    noResults: 'Bu arama alanında süpermarket bulunamadı.',
    unavailable: 'Süpermarketler şu anda yüklenemiyor.',
    providerChecked: 'Sağlayıcı kontrol edildi',
    website: 'Web sitesi',
    disclaimer:
      'Bunlar sağlayıcının hedef yakınında süpermarket olarak sınıflandırdığı yerlerdir. AttraVoya açık olma durumunu, stoku, ürün bulunabilirliğini, fiyatları, kampanyaları, teslimatı, teslim almayı, kuyrukları veya ödeme yöntemlerini doğrulamaz.',
  },
  ar: {
    eyebrow: 'متاجر السوبرماركت',
    title: 'متاجر السوبرماركت بالقرب من {destination}',
    intro: 'تصفح الأماكن التي يصنفها مزود الأماكن المكوّن كمتاجر سوبرماركت بالقرب من هذه الوجهة.',
    back: 'العودة إلى الوجهة',
    results: 'متاجر سوبرماركت قريبة',
    noResults: 'لم يتم العثور على متاجر سوبرماركت في منطقة البحث هذه.',
    unavailable: 'تعذر تحميل متاجر السوبرماركت الآن.',
    providerChecked: 'تم فحص المزود',
    website: 'الموقع الإلكتروني',
    disclaimer:
      'هذه أماكن يصنفها المزود كمتاجر سوبرماركت بالقرب من الوجهة. لا تتحقق AttraVoya من حالة الفتح أو المخزون أو توفر المنتجات أو الأسعار أو العروض أو التوصيل أو الاستلام أو الطوابير أو طرق الدفع.',
  },
  zh: {
    eyebrow: '超市',
    title: '{destination}附近的超市',
    intro: '查看已配置地点提供商在此目的地附近归类为超市的地点。',
    back: '返回目的地',
    results: '附近超市',
    noResults: '此搜索区域未找到超市。',
    unavailable: '目前无法加载超市。',
    providerChecked: '提供商检查时间',
    website: '网站',
    disclaimer:
      '这些是提供商在目的地附近归类为超市的地点。AttraVoya 不核实营业状态、库存、商品供应、价格、促销、配送、自取、排队情况或付款方式。',
  },
  ja: {
    eyebrow: 'スーパーマーケット',
    title: '{destination}周辺のスーパーマーケット',
    intro:
      '設定済みの場所プロバイダーがこの目的地の近くでスーパーマーケットとして分類した場所を確認できます。',
    back: '目的地に戻る',
    results: '近くのスーパーマーケット',
    noResults: 'この検索範囲ではスーパーマーケットが見つかりませんでした。',
    unavailable: '現在、スーパーマーケットを読み込めません。',
    providerChecked: 'プロバイダー確認時刻',
    website: 'ウェブサイト',
    disclaimer:
      'これらはプロバイダーが目的地の近くでスーパーマーケットとして分類した場所です。AttraVoya は営業状況、在庫、商品の入手可能性、価格、プロモーション、配送、受け取り、待ち時間、支払い方法を確認していません。',
  },
  ko: {
    eyebrow: '슈퍼마켓',
    title: '{destination} 근처 슈퍼마켓',
    intro: '설정된 장소 제공업체가 이 목적지 근처에서 슈퍼마켓으로 분류한 장소를 확인하세요.',
    back: '목적지로 돌아가기',
    results: '근처 슈퍼마켓',
    noResults: '이 검색 영역에서 슈퍼마켓을 찾지 못했습니다.',
    unavailable: '현재 슈퍼마켓을 불러올 수 없습니다.',
    providerChecked: '제공업체 확인 시간',
    website: '웹사이트',
    disclaimer:
      '이는 제공업체가 목적지 근처에서 슈퍼마켓으로 분류한 장소입니다. AttraVoya는 영업 상태, 재고, 상품 이용 가능 여부, 가격, 프로모션, 배송, 픽업, 대기열 또는 결제 수단을 확인하지 않습니다.',
  },
  hi: {
    eyebrow: 'सुपरमार्केट',
    title: '{destination} के पास सुपरमार्केट',
    intro:
      'इस गंतव्य के पास कॉन्फ़िगर किए गए स्थान प्रदाता द्वारा सुपरमार्केट के रूप में वर्गीकृत स्थान देखें।',
    back: 'गंतव्य पर वापस जाएँ',
    results: 'पास के सुपरमार्केट',
    noResults: 'इस खोज क्षेत्र में कोई सुपरमार्केट नहीं मिला।',
    unavailable: 'अभी सुपरमार्केट लोड नहीं किए जा सकते।',
    providerChecked: 'प्रदाता जाँचा गया',
    website: 'वेबसाइट',
    disclaimer:
      'ये गंतव्य के पास प्रदाता द्वारा सुपरमार्केट के रूप में वर्गीकृत स्थान हैं। AttraVoya खुला होने की स्थिति, स्टॉक, उत्पाद उपलब्धता, कीमतों, प्रचार, डिलीवरी, पिकअप, कतारों या भुगतान विधियों की पुष्टि नहीं करता।',
  },
});

export function getSupermarketsPageCopy(locale) {
  return SUPERMARKETS_PAGE_COPY[normalizeLocale(locale)] ?? SUPERMARKETS_PAGE_COPY.en;
}
