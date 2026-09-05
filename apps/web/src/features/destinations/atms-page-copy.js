import { normalizeLocale } from '@attravoya/localization';

const ATMS_PAGE_COPY = Object.freeze({
  en: {
    eyebrow: 'ATMs',
    title: 'ATMs near {destination}',
    intro:
      'Browse places categorized as ATMs by the configured places provider near this destination.',
    back: 'Back to destination',
    results: 'Nearby ATMs',
    noResults: 'No ATMs were found in this search area.',
    unavailable: 'ATMs could not be loaded right now.',
    providerChecked: 'Provider checked',
    website: 'Website',
    disclaimer:
      'These are provider-returned places categorized as ATMs near the destination. AttraVoya does not verify whether a machine is operating, has cash, supports a card or network, offers a particular currency or denomination, accepts deposits, charges a fee, has a withdrawal limit, or is accessible at a particular time.',
  },
  sv: {
    eyebrow: 'Bankomater',
    title: 'Bankomater nära {destination}',
    intro:
      'Se platser som den konfigurerade platsleverantören kategoriserar som bankomater nära destinationen.',
    back: 'Tillbaka till destinationen',
    results: 'Bankomater i närheten',
    noResults: 'Inga bankomater hittades i sökområdet.',
    unavailable: 'Bankomater kunde inte laddas just nu.',
    providerChecked: 'Leverantör kontrollerad',
    website: 'Webbplats',
    disclaimer:
      'Detta är platser som leverantören kategoriserar som bankomater nära destinationen. AttraVoya verifierar inte om en automat fungerar, har kontanter, stöder ett kort eller nätverk, erbjuder en viss valuta eller valör, tar emot insättningar, tar ut avgifter, har uttagsgränser eller är åtkomlig vid en viss tid.',
  },
  es: {
    eyebrow: 'Cajeros automáticos',
    title: 'Cajeros automáticos cerca de {destination}',
    intro:
      'Consulta lugares que el proveedor configurado clasifica como cajeros automáticos cerca de este destino.',
    back: 'Volver al destino',
    results: 'Cajeros automáticos cercanos',
    noResults: 'No se encontraron cajeros automáticos en esta zona de búsqueda.',
    unavailable: 'Los cajeros automáticos no se pueden cargar ahora.',
    providerChecked: 'Proveedor comprobado',
    website: 'Sitio web',
    disclaimer:
      'Estos son lugares que el proveedor clasifica como cajeros automáticos cerca del destino. AttraVoya no verifica si una máquina funciona, tiene efectivo, admite una tarjeta o red, ofrece una moneda o denominación concreta, acepta depósitos, cobra comisiones, tiene límites de retirada o es accesible a una hora determinada.',
  },
  fr: {
    eyebrow: 'Distributeurs automatiques',
    title: 'Distributeurs automatiques près de {destination}',
    intro:
      'Consultez les lieux classés comme distributeurs automatiques par le fournisseur configuré près de cette destination.',
    back: 'Retour à la destination',
    results: 'Distributeurs automatiques à proximité',
    noResults: 'Aucun distributeur automatique n’a été trouvé dans cette zone de recherche.',
    unavailable: 'Les distributeurs automatiques ne peuvent pas être chargés actuellement.',
    providerChecked: 'Fournisseur vérifié',
    website: 'Site web',
    disclaimer:
      'Ces lieux sont classés comme distributeurs automatiques par le fournisseur près de la destination. AttraVoya ne vérifie pas si une machine fonctionne, contient des espèces, accepte une carte ou un réseau, propose une devise ou une coupure particulière, accepte les dépôts, facture des frais, impose une limite de retrait ou est accessible à une heure donnée.',
  },
  de: {
    eyebrow: 'Geldautomaten',
    title: 'Geldautomaten nahe {destination}',
    intro:
      'Sieh dir Orte an, die der konfigurierte Anbieter nahe diesem Reiseziel als Geldautomaten einordnet.',
    back: 'Zurück zum Reiseziel',
    results: 'Geldautomaten in der Nähe',
    noResults: 'In diesem Suchgebiet wurden keine Geldautomaten gefunden.',
    unavailable: 'Geldautomaten können derzeit nicht geladen werden.',
    providerChecked: 'Anbieter geprüft',
    website: 'Website',
    disclaimer:
      'Diese Orte werden vom Anbieter nahe dem Reiseziel als Geldautomaten eingestuft. AttraVoya prüft nicht, ob ein Gerät funktioniert, Bargeld hat, eine Karte oder ein Netzwerk unterstützt, eine bestimmte Währung oder Stückelung anbietet, Einzahlungen annimmt, Gebühren verlangt, ein Abhebungslimit hat oder zu einer bestimmten Zeit zugänglich ist.',
  },
  it: {
    eyebrow: 'Bancomat',
    title: 'Bancomat vicino a {destination}',
    intro:
      'Consulta i luoghi classificati come bancomat dal fornitore configurato vicino a questa destinazione.',
    back: 'Torna alla destinazione',
    results: 'Bancomat nelle vicinanze',
    noResults: 'Nessun bancomat è stato trovato in questa area di ricerca.',
    unavailable: 'I bancomat non possono essere caricati al momento.',
    providerChecked: 'Fornitore controllato',
    website: 'Sito web',
    disclaimer:
      'Questi luoghi sono classificati come bancomat dal fornitore vicino alla destinazione. AttraVoya non verifica se una macchina funziona, dispone di contanti, supporta una carta o rete, offre una valuta o un taglio specifico, accetta depositi, applica commissioni, ha limiti di prelievo o è accessibile in un determinato momento.',
  },
  pt: {
    eyebrow: 'Caixas multibanco',
    title: 'Caixas multibanco perto de {destination}',
    intro:
      'Consulte locais classificados como caixas multibanco pelo fornecedor configurado perto deste destino.',
    back: 'Voltar ao destino',
    results: 'Caixas multibanco próximos',
    noResults: 'Não foram encontrados caixas multibanco nesta área de pesquisa.',
    unavailable: 'Os caixas multibanco não podem ser carregados agora.',
    providerChecked: 'Fornecedor verificado',
    website: 'Site',
    disclaimer:
      'Estes locais são classificados como caixas multibanco pelo fornecedor perto do destino. A AttraVoya não verifica se uma máquina funciona, tem dinheiro, suporta um cartão ou rede, oferece determinada moeda ou denominação, aceita depósitos, cobra taxas, tem limites de levantamento ou está acessível num horário específico.',
  },
  pl: {
    eyebrow: 'Bankomaty',
    title: 'Bankomaty w pobliżu {destination}',
    intro:
      'Przeglądaj miejsca oznaczone przez skonfigurowanego dostawcę jako bankomaty w pobliżu celu podróży.',
    back: 'Wróć do celu podróży',
    results: 'Bankomaty w pobliżu',
    noResults: 'W tym obszarze wyszukiwania nie znaleziono bankomatów.',
    unavailable: 'Nie można teraz wczytać bankomatów.',
    providerChecked: 'Dostawca sprawdzony',
    website: 'Strona internetowa',
    disclaimer:
      'Są to miejsca oznaczone przez dostawcę jako bankomaty w pobliżu celu podróży. AttraVoya nie weryfikuje, czy urządzenie działa, ma gotówkę, obsługuje kartę lub sieć, oferuje określoną walutę lub nominał, przyjmuje wpłaty, pobiera opłaty, ma limit wypłat lub jest dostępne o określonej porze.',
  },
  nl: {
    eyebrow: 'Geldautomaten',
    title: 'Geldautomaten bij {destination}',
    intro:
      'Bekijk plaatsen die de ingestelde locatiesprovider als geldautomaat classificeert nabij deze bestemming.',
    back: 'Terug naar bestemming',
    results: 'Geldautomaten in de buurt',
    noResults: 'Er zijn geen geldautomaten gevonden in dit zoekgebied.',
    unavailable: 'Geldautomaten kunnen momenteel niet worden geladen.',
    providerChecked: 'Provider gecontroleerd',
    website: 'Website',
    disclaimer:
      'Deze plaatsen worden door de provider als geldautomaten nabij de bestemming geclassificeerd. AttraVoya verifieert niet of een automaat werkt, contant geld heeft, een kaart of netwerk ondersteunt, een bepaalde valuta of coupure biedt, stortingen accepteert, kosten rekent, een opnamelimiet heeft of op een bepaald tijdstip toegankelijk is.',
  },
  no: {
    eyebrow: 'Minibanker',
    title: 'Minibanker nær {destination}',
    intro:
      'Se steder som den konfigurerte stedsleverandøren kategoriserer som minibanker nær dette reisemålet.',
    back: 'Tilbake til reisemålet',
    results: 'Minibanker i nærheten',
    noResults: 'Ingen minibanker ble funnet i dette søkeområdet.',
    unavailable: 'Minibanker kan ikke lastes akkurat nå.',
    providerChecked: 'Leverandør kontrollert',
    website: 'Nettsted',
    disclaimer:
      'Dette er steder leverandøren kategoriserer som minibanker nær reisemålet. AttraVoya verifiserer ikke om en automat fungerer, har kontanter, støtter et kort eller nettverk, tilbyr en bestemt valuta eller valør, tar imot innskudd, krever gebyr, har uttaksgrense eller er tilgjengelig på et bestemt tidspunkt.',
  },
  da: {
    eyebrow: 'Hæveautomater',
    title: 'Hæveautomater nær {destination}',
    intro:
      'Se steder, som den konfigurerede stedudbyder kategoriserer som hæveautomater nær denne destination.',
    back: 'Tilbage til destinationen',
    results: 'Hæveautomater i nærheden',
    noResults: 'Der blev ikke fundet hæveautomater i dette søgeområde.',
    unavailable: 'Hæveautomater kan ikke indlæses lige nu.',
    providerChecked: 'Udbyder kontrolleret',
    website: 'Websted',
    disclaimer:
      'Dette er steder, som udbyderen kategoriserer som hæveautomater nær destinationen. AttraVoya bekræfter ikke, om en automat virker, har kontanter, understøtter et kort eller netværk, tilbyder en bestemt valuta eller seddeltype, tager imod indbetalinger, opkræver gebyrer, har en hævegrænse eller er tilgængelig på et bestemt tidspunkt.',
  },
  fi: {
    eyebrow: 'Pankkiautomaatit',
    title: 'Pankkiautomaatit lähellä kohdetta {destination}',
    intro:
      'Selaa paikkoja, jotka määritetty paikkapalvelu luokittelee pankkiautomaateiksi tämän kohteen lähellä.',
    back: 'Takaisin kohteeseen',
    results: 'Lähellä olevat pankkiautomaatit',
    noResults: 'Tältä hakualueelta ei löytynyt pankkiautomaatteja.',
    unavailable: 'Pankkiautomaatteja ei voida ladata juuri nyt.',
    providerChecked: 'Palvelu tarkistettu',
    website: 'Verkkosivusto',
    disclaimer:
      'Nämä ovat palveluntarjoajan pankkiautomaateiksi luokittelemia paikkoja kohteen lähellä. AttraVoya ei vahvista, toimiiko automaatti, onko siinä käteistä, tukeeko se korttia tai verkkoa, tarjoaako se tiettyä valuuttaa tai setelikokoa, hyväksyykö se talletuksia, veloittaako maksuja, onko sillä nostorajaa tai onko se käytettävissä tiettynä aikana.',
  },
  tr: {
    eyebrow: "ATM'ler",
    title: "{destination} yakınındaki ATM'ler",
    intro:
      'Yapılandırılmış yer sağlayıcısının bu hedefin yakınında ATM olarak sınıflandırdığı yerleri görüntüleyin.',
    back: 'Hedefe dön',
    results: "Yakındaki ATM'ler",
    noResults: 'Bu arama alanında ATM bulunamadı.',
    unavailable: "ATM'ler şu anda yüklenemiyor.",
    providerChecked: 'Sağlayıcı kontrol edildi',
    website: 'Web sitesi',
    disclaimer:
      'Bunlar sağlayıcının hedef yakınında ATM olarak sınıflandırdığı yerlerdir. AttraVoya bir cihazın çalıştığını, nakit bulundurduğunu, belirli bir kartı veya ağı desteklediğini, belirli para birimi veya kupür sunduğunu, para yatırmayı kabul ettiğini, ücret aldığını, para çekme limiti olduğunu veya belirli bir saatte erişilebilir olduğunu doğrulamaz.',
  },
  ar: {
    eyebrow: 'أجهزة الصراف الآلي',
    title: 'أجهزة الصراف الآلي بالقرب من {destination}',
    intro: 'تصفح الأماكن التي يصنفها مزود الأماكن المكوّن كأجهزة صراف آلي بالقرب من هذه الوجهة.',
    back: 'العودة إلى الوجهة',
    results: 'أجهزة صراف آلي قريبة',
    noResults: 'لم يتم العثور على أجهزة صراف آلي في منطقة البحث هذه.',
    unavailable: 'تعذر تحميل أجهزة الصراف الآلي الآن.',
    providerChecked: 'تم فحص المزود',
    website: 'الموقع الإلكتروني',
    disclaimer:
      'هذه أماكن يصنفها المزود كأجهزة صراف آلي بالقرب من الوجهة. لا تتحقق AttraVoya من أن الجهاز يعمل أو يحتوي على نقد أو يدعم بطاقة أو شبكة معينة أو يوفر عملة أو فئة نقدية محددة أو يقبل الإيداعات أو يفرض رسوماً أو له حد للسحب أو يمكن الوصول إليه في وقت معين.',
  },
  zh: {
    eyebrow: '自动取款机',
    title: '{destination}附近的自动取款机',
    intro: '查看已配置地点提供商在此目的地附近归类为自动取款机的地点。',
    back: '返回目的地',
    results: '附近的自动取款机',
    noResults: '此搜索区域未找到自动取款机。',
    unavailable: '目前无法加载自动取款机。',
    providerChecked: '提供商检查时间',
    website: '网站',
    disclaimer:
      '这些是提供商在目的地附近归类为自动取款机的地点。AttraVoya 不核实机器是否运行、是否有现金、是否支持某张卡或网络、是否提供特定货币或面额、是否接受存款、是否收费、是否有取款限额或是否可在特定时间使用。',
  },
  ja: {
    eyebrow: 'ATM',
    title: '{destination}周辺のATM',
    intro: '設定済みの場所プロバイダーがこの目的地の近くでATMとして分類した場所を確認できます。',
    back: '目的地に戻る',
    results: '近くのATM',
    noResults: 'この検索範囲ではATMが見つかりませんでした。',
    unavailable: '現在、ATMを読み込めません。',
    providerChecked: 'プロバイダー確認時刻',
    website: 'ウェブサイト',
    disclaimer:
      'これらはプロバイダーが目的地の近くでATMとして分類した場所です。AttraVoya は機械の稼働、現金の有無、カードやネットワークの対応、特定通貨や券種、入金対応、手数料、引き出し限度額、特定時間の利用可否を確認していません。',
  },
  ko: {
    eyebrow: 'ATM',
    title: '{destination} 근처 ATM',
    intro: '설정된 장소 제공업체가 이 목적지 근처에서 ATM으로 분류한 장소를 확인하세요.',
    back: '목적지로 돌아가기',
    results: '근처 ATM',
    noResults: '이 검색 영역에서 ATM을 찾지 못했습니다.',
    unavailable: '현재 ATM을 불러올 수 없습니다.',
    providerChecked: '제공업체 확인 시간',
    website: '웹사이트',
    disclaimer:
      '이는 제공업체가 목적지 근처에서 ATM으로 분류한 장소입니다. AttraVoya는 기기 작동 여부, 현금 보유 여부, 카드나 네트워크 지원, 특정 통화나 권종, 입금 지원, 수수료, 출금 한도 또는 특정 시간의 접근 가능 여부를 확인하지 않습니다.',
  },
  hi: {
    eyebrow: 'एटीएम',
    title: '{destination} के पास एटीएम',
    intro:
      'इस गंतव्य के पास कॉन्फ़िगर किए गए स्थान प्रदाता द्वारा एटीएम के रूप में वर्गीकृत स्थान देखें।',
    back: 'गंतव्य पर वापस जाएँ',
    results: 'पास के एटीएम',
    noResults: 'इस खोज क्षेत्र में कोई एटीएम नहीं मिला।',
    unavailable: 'अभी एटीएम लोड नहीं किए जा सकते।',
    providerChecked: 'प्रदाता जाँचा गया',
    website: 'वेबसाइट',
    disclaimer:
      'ये गंतव्य के पास प्रदाता द्वारा एटीएम के रूप में वर्गीकृत स्थान हैं। AttraVoya यह पुष्टि नहीं करता कि मशीन काम कर रही है, उसमें नकदी है, वह किसी कार्ड या नेटवर्क को समर्थन देती है, किसी खास मुद्रा या मूल्यवर्ग की सुविधा देती है, जमा स्वीकार करती है, शुल्क लेती है, निकासी सीमा रखती है या किसी विशेष समय पर उपलब्ध है।',
  },
});

export function getAtmsPageCopy(locale) {
  return ATMS_PAGE_COPY[normalizeLocale(locale)] ?? ATMS_PAGE_COPY.en;
}
