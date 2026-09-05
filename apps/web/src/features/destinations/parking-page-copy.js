import { normalizeLocale } from '@attravoya/localization';

const PARKING_PAGE_COPY = Object.freeze({
  en: {
    eyebrow: 'Parking',
    title: 'Parking near {destination}',
    intro:
      'Browse places categorized as parking by the configured places provider near this destination.',
    back: 'Back to destination',
    results: 'Nearby parking',
    noResults: 'No parking places were found in this search area.',
    unavailable: 'Parking places could not be loaded right now.',
    providerChecked: 'Provider checked',
    website: 'Website',
    disclaimer:
      'These are provider-returned places categorized as parking near the destination. AttraVoya does not verify live space availability or occupancy, prices, restrictions, permits, payment methods, opening or access hours, reservation status, EV charging, vehicle or height limits, security, or accessibility.',
  },
  sv: {
    eyebrow: 'Parkering',
    title: 'Parkering nära {destination}',
    intro:
      'Se platser som den konfigurerade platsleverantören kategoriserar som parkering nära destinationen.',
    back: 'Tillbaka till destinationen',
    results: 'Parkering i närheten',
    noResults: 'Inga parkeringsplatser hittades i sökområdet.',
    unavailable: 'Parkeringsplatser kunde inte laddas just nu.',
    providerChecked: 'Leverantör kontrollerad',
    website: 'Webbplats',
    disclaimer:
      'Detta är platser som leverantören kategoriserar som parkering nära destinationen. AttraVoya verifierar inte lediga platser eller beläggning i realtid, priser, begränsningar, tillstånd, betalningsmetoder, öppet- eller åtkomsttider, bokningsstatus, elbilsladdning, fordons- eller höjdgränser, säkerhet eller tillgänglighet.',
  },
  es: {
    eyebrow: 'Aparcamiento',
    title: 'Aparcamiento cerca de {destination}',
    intro:
      'Consulta lugares que el proveedor configurado clasifica como aparcamiento cerca de este destino.',
    back: 'Volver al destino',
    results: 'Aparcamiento cercano',
    noResults: 'No se encontraron aparcamientos en esta zona de búsqueda.',
    unavailable: 'Los aparcamientos no se pueden cargar ahora.',
    providerChecked: 'Proveedor comprobado',
    website: 'Sitio web',
    disclaimer:
      'Estos son lugares que el proveedor clasifica como aparcamiento cerca del destino. AttraVoya no verifica plazas libres ni ocupación en tiempo real, precios, restricciones, permisos, métodos de pago, horarios de apertura o acceso, estado de reservas, carga de vehículos eléctricos, límites de vehículo o altura, seguridad ni accesibilidad.',
  },
  fr: {
    eyebrow: 'Stationnement',
    title: 'Stationnement près de {destination}',
    intro:
      'Consultez les lieux classés comme stationnement par le fournisseur configuré près de cette destination.',
    back: 'Retour à la destination',
    results: 'Stationnement à proximité',
    noResults: 'Aucun lieu de stationnement n’a été trouvé dans cette zone de recherche.',
    unavailable: 'Les lieux de stationnement ne peuvent pas être chargés actuellement.',
    providerChecked: 'Fournisseur vérifié',
    website: 'Site web',
    disclaimer:
      'Ces lieux sont classés comme stationnement par le fournisseur près de la destination. AttraVoya ne vérifie pas les places libres ou l’occupation en temps réel, les prix, restrictions, permis, moyens de paiement, horaires d’ouverture ou d’accès, réservations, recharge de véhicules électriques, limites de véhicule ou de hauteur, sécurité ou accessibilité.',
  },
  de: {
    eyebrow: 'Parken',
    title: 'Parkmöglichkeiten nahe {destination}',
    intro:
      'Sieh dir Orte an, die der konfigurierte Anbieter nahe diesem Reiseziel als Parkmöglichkeiten einordnet.',
    back: 'Zurück zum Reiseziel',
    results: 'Parkmöglichkeiten in der Nähe',
    noResults: 'In diesem Suchgebiet wurden keine Parkmöglichkeiten gefunden.',
    unavailable: 'Parkmöglichkeiten können derzeit nicht geladen werden.',
    providerChecked: 'Anbieter geprüft',
    website: 'Website',
    disclaimer:
      'Diese Orte werden vom Anbieter nahe dem Reiseziel als Parkmöglichkeiten eingestuft. AttraVoya prüft keine live verfügbaren Plätze oder Belegung, Preise, Einschränkungen, Genehmigungen, Zahlungsmethoden, Öffnungs- oder Zugangszeiten, Reservierungsstatus, E-Laden, Fahrzeug- oder Höhenbegrenzungen, Sicherheit oder Barrierefreiheit.',
  },
  it: {
    eyebrow: 'Parcheggi',
    title: 'Parcheggi vicino a {destination}',
    intro:
      'Consulta i luoghi classificati come parcheggi dal fornitore configurato vicino a questa destinazione.',
    back: 'Torna alla destinazione',
    results: 'Parcheggi nelle vicinanze',
    noResults: 'Nessun parcheggio è stato trovato in questa area di ricerca.',
    unavailable: 'I parcheggi non possono essere caricati al momento.',
    providerChecked: 'Fornitore controllato',
    website: 'Sito web',
    disclaimer:
      'Questi luoghi sono classificati come parcheggi dal fornitore vicino alla destinazione. AttraVoya non verifica posti liberi o occupazione in tempo reale, prezzi, restrizioni, permessi, metodi di pagamento, orari di apertura o accesso, stato delle prenotazioni, ricarica EV, limiti di veicolo o altezza, sicurezza o accessibilità.',
  },
  pt: {
    eyebrow: 'Estacionamento',
    title: 'Estacionamento perto de {destination}',
    intro:
      'Consulte locais classificados como estacionamento pelo fornecedor configurado perto deste destino.',
    back: 'Voltar ao destino',
    results: 'Estacionamento próximo',
    noResults: 'Não foram encontrados locais de estacionamento nesta área de pesquisa.',
    unavailable: 'Os locais de estacionamento não podem ser carregados agora.',
    providerChecked: 'Fornecedor verificado',
    website: 'Site',
    disclaimer:
      'Estes locais são classificados como estacionamento pelo fornecedor perto do destino. A AttraVoya não verifica vagas ou ocupação em tempo real, preços, restrições, licenças, métodos de pagamento, horários de abertura ou acesso, estado de reservas, carregamento de veículos elétricos, limites de veículo ou altura, segurança ou acessibilidade.',
  },
  pl: {
    eyebrow: 'Parkingi',
    title: 'Parkingi w pobliżu {destination}',
    intro:
      'Przeglądaj miejsca oznaczone przez skonfigurowanego dostawcę jako parkingi w pobliżu celu podróży.',
    back: 'Wróć do celu podróży',
    results: 'Parkingi w pobliżu',
    noResults: 'W tym obszarze wyszukiwania nie znaleziono parkingów.',
    unavailable: 'Nie można teraz wczytać parkingów.',
    providerChecked: 'Dostawca sprawdzony',
    website: 'Strona internetowa',
    disclaimer:
      'Są to miejsca oznaczone przez dostawcę jako parkingi w pobliżu celu podróży. AttraVoya nie weryfikuje dostępności miejsc ani zajętości na żywo, cen, ograniczeń, zezwoleń, metod płatności, godzin otwarcia lub dostępu, rezerwacji, ładowania EV, limitów pojazdu lub wysokości, bezpieczeństwa ani dostępności.',
  },
  nl: {
    eyebrow: 'Parkeren',
    title: 'Parkeren bij {destination}',
    intro:
      'Bekijk plaatsen die de ingestelde locatiesprovider als parkeren classificeert nabij deze bestemming.',
    back: 'Terug naar bestemming',
    results: 'Parkeren in de buurt',
    noResults: 'Er zijn geen parkeerplaatsen gevonden in dit zoekgebied.',
    unavailable: 'Parkeerplaatsen kunnen momenteel niet worden geladen.',
    providerChecked: 'Provider gecontroleerd',
    website: 'Website',
    disclaimer:
      'Deze plaatsen worden door de provider als parkeren nabij de bestemming geclassificeerd. AttraVoya verifieert geen live beschikbaarheid of bezetting, prijzen, beperkingen, vergunningen, betaalmethoden, openings- of toegangstijden, reserveringsstatus, EV-laden, voertuig- of hoogtebeperkingen, beveiliging of toegankelijkheid.',
  },
  no: {
    eyebrow: 'Parkering',
    title: 'Parkering nær {destination}',
    intro:
      'Se steder som den konfigurerte stedsleverandøren kategoriserer som parkering nær dette reisemålet.',
    back: 'Tilbake til reisemålet',
    results: 'Parkering i nærheten',
    noResults: 'Ingen parkeringssteder ble funnet i dette søkeområdet.',
    unavailable: 'Parkeringssteder kan ikke lastes akkurat nå.',
    providerChecked: 'Leverandør kontrollert',
    website: 'Nettsted',
    disclaimer:
      'Dette er steder leverandøren kategoriserer som parkering nær reisemålet. AttraVoya verifiserer ikke ledige plasser eller belegg i sanntid, priser, restriksjoner, tillatelser, betalingsmetoder, åpnings- eller tilgangstider, reservasjoner, elbillading, kjøretøy- eller høydegrenser, sikkerhet eller tilgjengelighet.',
  },
  da: {
    eyebrow: 'Parkering',
    title: 'Parkering nær {destination}',
    intro:
      'Se steder, som den konfigurerede stedudbyder kategoriserer som parkering nær denne destination.',
    back: 'Tilbage til destinationen',
    results: 'Parkering i nærheden',
    noResults: 'Der blev ikke fundet parkeringssteder i dette søgeområde.',
    unavailable: 'Parkeringssteder kan ikke indlæses lige nu.',
    providerChecked: 'Udbyder kontrolleret',
    website: 'Websted',
    disclaimer:
      'Dette er steder, som udbyderen kategoriserer som parkering nær destinationen. AttraVoya bekræfter ikke ledige pladser eller belægning i realtid, priser, begrænsninger, tilladelser, betalingsmetoder, åbnings- eller adgangstider, reservationer, elbilopladning, køretøjs- eller højdegrænser, sikkerhed eller tilgængelighed.',
  },
  fi: {
    eyebrow: 'Pysäköinti',
    title: 'Pysäköinti lähellä kohdetta {destination}',
    intro:
      'Selaa paikkoja, jotka määritetty paikkapalvelu luokittelee pysäköinniksi tämän kohteen lähellä.',
    back: 'Takaisin kohteeseen',
    results: 'Lähellä oleva pysäköinti',
    noResults: 'Tältä hakualueelta ei löytynyt pysäköintipaikkoja.',
    unavailable: 'Pysäköintipaikkoja ei voida ladata juuri nyt.',
    providerChecked: 'Palvelu tarkistettu',
    website: 'Verkkosivusto',
    disclaimer:
      'Nämä ovat palveluntarjoajan pysäköinniksi luokittelemia paikkoja kohteen lähellä. AttraVoya ei vahvista reaaliaikaista paikkatilannetta tai käyttöastetta, hintoja, rajoituksia, lupia, maksutapoja, aukiolo- tai pääsyaikoja, varaustilannetta, sähköauton latausta, ajoneuvo- tai korkeusrajoja, turvallisuutta tai esteettömyyttä.',
  },
  tr: {
    eyebrow: 'Otopark',
    title: '{destination} yakınındaki otoparklar',
    intro:
      'Yapılandırılmış yer sağlayıcısının bu hedefin yakınında otopark olarak sınıflandırdığı yerleri görüntüleyin.',
    back: 'Hedefe dön',
    results: 'Yakındaki otoparklar',
    noResults: 'Bu arama alanında otopark bulunamadı.',
    unavailable: 'Otoparklar şu anda yüklenemiyor.',
    providerChecked: 'Sağlayıcı kontrol edildi',
    website: 'Web sitesi',
    disclaimer:
      'Bunlar sağlayıcının hedef yakınında otopark olarak sınıflandırdığı yerlerdir. AttraVoya canlı boş yer veya doluluk, fiyat, kısıtlama, izin, ödeme yöntemi, açılış veya erişim saati, rezervasyon durumu, elektrikli araç şarjı, araç veya yükseklik sınırı, güvenlik ya da erişilebilirlik bilgilerini doğrulamaz.',
  },
  ar: {
    eyebrow: 'مواقف السيارات',
    title: 'مواقف السيارات بالقرب من {destination}',
    intro: 'تصفح الأماكن التي يصنفها مزود الأماكن المكوّن كمواقف سيارات بالقرب من هذه الوجهة.',
    back: 'العودة إلى الوجهة',
    results: 'مواقف سيارات قريبة',
    noResults: 'لم يتم العثور على مواقف سيارات في منطقة البحث هذه.',
    unavailable: 'تعذر تحميل مواقف السيارات الآن.',
    providerChecked: 'تم فحص المزود',
    website: 'الموقع الإلكتروني',
    disclaimer:
      'هذه أماكن يصنفها المزود كمواقف سيارات بالقرب من الوجهة. لا تتحقق AttraVoya من توفر الأماكن أو الإشغال المباشر أو الأسعار أو القيود أو التصاريح أو طرق الدفع أو ساعات الفتح أو الدخول أو حالة الحجز أو شحن السيارات الكهربائية أو حدود المركبة أو الارتفاع أو الأمان أو إمكانية الوصول.',
  },
  zh: {
    eyebrow: '停车',
    title: '{destination}附近的停车地点',
    intro: '查看已配置地点提供商在此目的地附近归类为停车地点的场所。',
    back: '返回目的地',
    results: '附近的停车地点',
    noResults: '此搜索区域未找到停车地点。',
    unavailable: '目前无法加载停车地点。',
    providerChecked: '提供商检查时间',
    website: '网站',
    disclaimer:
      '这些是提供商在目的地附近归类为停车地点的场所。AttraVoya 不核实实时空位或占用情况、价格、限制、许可、付款方式、开放或进入时间、预订状态、电动车充电、车辆或限高、安全性或无障碍信息。',
  },
  ja: {
    eyebrow: '駐車場',
    title: '{destination}周辺の駐車場',
    intro: '設定済みの場所プロバイダーがこの目的地の近くで駐車場として分類した場所を確認できます。',
    back: '目的地に戻る',
    results: '近くの駐車場',
    noResults: 'この検索範囲では駐車場が見つかりませんでした。',
    unavailable: '現在、駐車場を読み込めません。',
    providerChecked: 'プロバイダー確認時刻',
    website: 'ウェブサイト',
    disclaimer:
      'これらはプロバイダーが目的地の近くで駐車場として分類した場所です。AttraVoya はリアルタイムの空きや利用状況、料金、制限、許可、支払い方法、営業時間や入場時間、予約状況、EV充電、車両や高さ制限、安全性、バリアフリー情報を確認していません。',
  },
  ko: {
    eyebrow: '주차',
    title: '{destination} 근처 주차장',
    intro: '설정된 장소 제공업체가 이 목적지 근처에서 주차장으로 분류한 장소를 확인하세요.',
    back: '목적지로 돌아가기',
    results: '근처 주차장',
    noResults: '이 검색 영역에서 주차장을 찾지 못했습니다.',
    unavailable: '현재 주차장을 불러올 수 없습니다.',
    providerChecked: '제공업체 확인 시간',
    website: '웹사이트',
    disclaimer:
      '이는 제공업체가 목적지 근처에서 주차장으로 분류한 장소입니다. AttraVoya는 실시간 빈자리나 점유 상태, 가격, 제한, 허가, 결제 방법, 운영 또는 출입 시간, 예약 상태, 전기차 충전, 차량 또는 높이 제한, 보안이나 접근성 정보를 확인하지 않습니다.',
  },
  hi: {
    eyebrow: 'पार्किंग',
    title: '{destination} के पास पार्किंग',
    intro:
      'इस गंतव्य के पास कॉन्फ़िगर किए गए स्थान प्रदाता द्वारा पार्किंग के रूप में वर्गीकृत स्थान देखें।',
    back: 'गंतव्य पर वापस जाएँ',
    results: 'पास की पार्किंग',
    noResults: 'इस खोज क्षेत्र में कोई पार्किंग स्थान नहीं मिला।',
    unavailable: 'अभी पार्किंग स्थान लोड नहीं किए जा सकते।',
    providerChecked: 'प्रदाता जाँचा गया',
    website: 'वेबसाइट',
    disclaimer:
      'ये गंतव्य के पास प्रदाता द्वारा पार्किंग के रूप में वर्गीकृत स्थान हैं। AttraVoya लाइव खाली जगह या उपयोग, कीमत, प्रतिबंध, परमिट, भुगतान विधि, खुलने या प्रवेश का समय, आरक्षण स्थिति, EV चार्जिंग, वाहन या ऊँचाई सीमा, सुरक्षा या पहुँच-योग्यता की पुष्टि नहीं करता।',
  },
});

export function getParkingPageCopy(locale) {
  return PARKING_PAGE_COPY[normalizeLocale(locale)] ?? PARKING_PAGE_COPY.en;
}
