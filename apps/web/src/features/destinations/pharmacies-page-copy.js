import { normalizeLocale } from '@attravoya/localization';

const PHARMACIES_PAGE_COPY = Object.freeze({
  en: {
    eyebrow: 'Pharmacies',
    title: 'Pharmacies near {destination}',
    intro:
      'Browse places categorized as pharmacies by the configured places provider near this destination.',
    back: 'Back to destination',
    results: 'Nearby pharmacies',
    noResults: 'No pharmacies were found in this search area.',
    unavailable: 'Pharmacies could not be loaded right now.',
    providerChecked: 'Provider checked',
    website: 'Website',
    emergencyLink: 'Verified emergency contacts',
    disclaimer:
      'These are provider-returned places categorized as pharmacies near the destination. AttraVoya does not verify medication stock, prescription availability, pharmacist availability, opening status, prices, services, or suitability for urgent care. For a medical emergency, use the verified contacts in Safety & emergency.',
  },
  sv: {
    eyebrow: 'Apotek',
    title: 'Apotek nära {destination}',
    intro:
      'Se platser som den konfigurerade platsleverantören kategoriserar som apotek nära destinationen.',
    back: 'Tillbaka till destinationen',
    results: 'Apotek i närheten',
    noResults: 'Inga apotek hittades i sökområdet.',
    unavailable: 'Apotek kunde inte laddas just nu.',
    providerChecked: 'Leverantör kontrollerad',
    website: 'Webbplats',
    emergencyLink: 'Verifierade nödkontakter',
    disclaimer:
      'Detta är platser som leverantören kategoriserar som apotek nära destinationen. AttraVoya verifierar inte läkemedelslager, recepttillgänglighet, farmaceuttillgänglighet, öppetstatus, priser, tjänster eller lämplighet för akut vård. Vid en medicinsk nödsituation, använd de verifierade kontakterna under Säkerhet och nödläge.',
  },
  es: {
    eyebrow: 'Farmacias',
    title: 'Farmacias cerca de {destination}',
    intro:
      'Consulta lugares que el proveedor configurado clasifica como farmacias cerca de este destino.',
    back: 'Volver al destino',
    results: 'Farmacias cercanas',
    noResults: 'No se encontraron farmacias en esta zona de búsqueda.',
    unavailable: 'Las farmacias no se pueden cargar ahora.',
    providerChecked: 'Proveedor comprobado',
    website: 'Sitio web',
    emergencyLink: 'Contactos de emergencia verificados',
    disclaimer:
      'Estos son lugares que el proveedor clasifica como farmacias cerca del destino. AttraVoya no verifica existencias de medicamentos, disponibilidad de recetas o farmacéuticos, estado de apertura, precios, servicios ni idoneidad para atención urgente. En una emergencia médica, utiliza los contactos verificados de Seguridad y emergencia.',
  },
  fr: {
    eyebrow: 'Pharmacies',
    title: 'Pharmacies près de {destination}',
    intro:
      'Consultez les lieux classés comme pharmacies par le fournisseur configuré près de cette destination.',
    back: 'Retour à la destination',
    results: 'Pharmacies à proximité',
    noResults: 'Aucune pharmacie n’a été trouvée dans cette zone de recherche.',
    unavailable: 'Les pharmacies ne peuvent pas être chargées actuellement.',
    providerChecked: 'Fournisseur vérifié',
    website: 'Site web',
    emergencyLink: 'Contacts d’urgence vérifiés',
    disclaimer:
      'Ces lieux sont classés comme pharmacies par le fournisseur près de la destination. AttraVoya ne vérifie pas les stocks de médicaments, la disponibilité des ordonnances ou des pharmaciens, l’ouverture, les prix, les services ni l’aptitude aux soins urgents. En cas d’urgence médicale, utilisez les contacts vérifiés de Sécurité et urgence.',
  },
  de: {
    eyebrow: 'Apotheken',
    title: 'Apotheken nahe {destination}',
    intro:
      'Sieh dir Orte an, die der konfigurierte Anbieter nahe diesem Reiseziel als Apotheken einordnet.',
    back: 'Zurück zum Reiseziel',
    results: 'Apotheken in der Nähe',
    noResults: 'In diesem Suchgebiet wurden keine Apotheken gefunden.',
    unavailable: 'Apotheken können derzeit nicht geladen werden.',
    providerChecked: 'Anbieter geprüft',
    website: 'Website',
    emergencyLink: 'Verifizierte Notfallkontakte',
    disclaimer:
      'Diese Orte werden vom Anbieter nahe dem Reiseziel als Apotheken eingestuft. AttraVoya prüft weder Medikamentenbestand, Rezept- oder Apothekerverfügbarkeit, Öffnungsstatus, Preise, Leistungen noch die Eignung für dringende Versorgung. Nutze bei einem medizinischen Notfall die verifizierten Kontakte unter Sicherheit und Notfall.',
  },
  it: {
    eyebrow: 'Farmacie',
    title: 'Farmacie vicino a {destination}',
    intro:
      'Consulta i luoghi classificati come farmacie dal fornitore configurato vicino a questa destinazione.',
    back: 'Torna alla destinazione',
    results: 'Farmacie nelle vicinanze',
    noResults: 'Nessuna farmacia è stata trovata in questa area di ricerca.',
    unavailable: 'Le farmacie non possono essere caricate al momento.',
    providerChecked: 'Fornitore controllato',
    website: 'Sito web',
    emergencyLink: 'Contatti di emergenza verificati',
    disclaimer:
      'Questi luoghi sono classificati come farmacie dal fornitore vicino alla destinazione. AttraVoya non verifica scorte di farmaci, disponibilità di prescrizioni o farmacisti, stato di apertura, prezzi, servizi o idoneità alle cure urgenti. In caso di emergenza medica usa i contatti verificati in Sicurezza ed emergenza.',
  },
  pt: {
    eyebrow: 'Farmácias',
    title: 'Farmácias perto de {destination}',
    intro:
      'Consulte locais classificados como farmácias pelo fornecedor configurado perto deste destino.',
    back: 'Voltar ao destino',
    results: 'Farmácias próximas',
    noResults: 'Não foram encontradas farmácias nesta área de pesquisa.',
    unavailable: 'As farmácias não podem ser carregadas agora.',
    providerChecked: 'Fornecedor verificado',
    website: 'Site',
    emergencyLink: 'Contactos de emergência verificados',
    disclaimer:
      'Estes locais são classificados como farmácias pelo fornecedor perto do destino. A AttraVoya não verifica stock de medicamentos, disponibilidade de receitas ou farmacêuticos, estado de abertura, preços, serviços nem adequação a cuidados urgentes. Numa emergência médica, use os contactos verificados em Segurança e emergência.',
  },
  pl: {
    eyebrow: 'Apteki',
    title: 'Apteki w pobliżu {destination}',
    intro:
      'Przeglądaj miejsca oznaczone przez skonfigurowanego dostawcę jako apteki w pobliżu celu podróży.',
    back: 'Wróć do celu podróży',
    results: 'Apteki w pobliżu',
    noResults: 'W tym obszarze wyszukiwania nie znaleziono aptek.',
    unavailable: 'Nie można teraz wczytać aptek.',
    providerChecked: 'Dostawca sprawdzony',
    website: 'Strona internetowa',
    emergencyLink: 'Zweryfikowane kontakty alarmowe',
    disclaimer:
      'Są to miejsca oznaczone przez dostawcę jako apteki w pobliżu celu podróży. AttraVoya nie weryfikuje zapasów leków, dostępności recept lub farmaceutów, statusu otwarcia, cen, usług ani przydatności do pilnej opieki. W nagłym przypadku medycznym użyj zweryfikowanych kontaktów w sekcji Bezpieczeństwo i alarm.',
  },
  nl: {
    eyebrow: 'Apotheken',
    title: 'Apotheken bij {destination}',
    intro:
      'Bekijk plaatsen die de ingestelde locatiesprovider als apotheek classificeert nabij deze bestemming.',
    back: 'Terug naar bestemming',
    results: 'Apotheken in de buurt',
    noResults: 'Er zijn geen apotheken gevonden in dit zoekgebied.',
    unavailable: 'Apotheken kunnen momenteel niet worden geladen.',
    providerChecked: 'Provider gecontroleerd',
    website: 'Website',
    emergencyLink: 'Geverifieerde noodcontacten',
    disclaimer:
      'Deze plaatsen worden door de provider als apotheken nabij de bestemming geclassificeerd. AttraVoya verifieert geen medicijnvoorraad, beschikbaarheid van recepten of apothekers, openingsstatus, prijzen, diensten of geschiktheid voor spoedzorg. Gebruik bij een medisch noodgeval de geverifieerde contacten onder Veiligheid en nood.',
  },
  no: {
    eyebrow: 'Apotek',
    title: 'Apotek nær {destination}',
    intro:
      'Se steder som den konfigurerte stedsleverandøren kategoriserer som apotek nær dette reisemålet.',
    back: 'Tilbake til reisemålet',
    results: 'Apotek i nærheten',
    noResults: 'Ingen apotek ble funnet i dette søkeområdet.',
    unavailable: 'Apotek kan ikke lastes akkurat nå.',
    providerChecked: 'Leverandør kontrollert',
    website: 'Nettsted',
    emergencyLink: 'Verifiserte nødkontakter',
    disclaimer:
      'Dette er steder leverandøren kategoriserer som apotek nær reisemålet. AttraVoya verifiserer ikke legemiddellager, tilgjengelighet av resepter eller farmasøyter, åpningsstatus, priser, tjenester eller egnethet for akutt behandling. Ved en medisinsk nødsituasjon bruker du de verifiserte kontaktene under Sikkerhet og nød.',
  },
  da: {
    eyebrow: 'Apoteker',
    title: 'Apoteker nær {destination}',
    intro:
      'Se steder, som den konfigurerede stedudbyder kategoriserer som apoteker nær denne destination.',
    back: 'Tilbage til destinationen',
    results: 'Apoteker i nærheden',
    noResults: 'Der blev ikke fundet apoteker i dette søgeområde.',
    unavailable: 'Apoteker kan ikke indlæses lige nu.',
    providerChecked: 'Udbyder kontrolleret',
    website: 'Websted',
    emergencyLink: 'Bekræftede nødkontakter',
    disclaimer:
      'Dette er steder, som udbyderen kategoriserer som apoteker nær destinationen. AttraVoya bekræfter ikke medicinlager, tilgængelighed af recepter eller farmaceuter, åbningsstatus, priser, tjenester eller egnethed til akut behandling. Brug de bekræftede kontakter under Sikkerhed og nødsituation ved en medicinsk nødsituation.',
  },
  fi: {
    eyebrow: 'Apteekit',
    title: 'Apteekit lähellä kohdetta {destination}',
    intro:
      'Selaa paikkoja, jotka määritetty paikkapalvelu luokittelee apteekeiksi tämän kohteen lähellä.',
    back: 'Takaisin kohteeseen',
    results: 'Lähellä olevat apteekit',
    noResults: 'Tältä hakualueelta ei löytynyt apteekkeja.',
    unavailable: 'Apteekkeja ei voida ladata juuri nyt.',
    providerChecked: 'Palvelu tarkistettu',
    website: 'Verkkosivusto',
    emergencyLink: 'Vahvistetut hätäyhteystiedot',
    disclaimer:
      'Nämä ovat palveluntarjoajan apteekeiksi luokittelemia paikkoja kohteen lähellä. AttraVoya ei vahvista lääkevarastoa, reseptien tai farmaseuttien saatavuutta, aukiolotilaa, hintoja, palveluja tai soveltuvuutta kiireelliseen hoitoon. Lääketieteellisessä hätätilanteessa käytä Turvallisuus ja hätätilanne -osion vahvistettuja yhteystietoja.',
  },
  tr: {
    eyebrow: 'Eczaneler',
    title: '{destination} yakınındaki eczaneler',
    intro:
      'Yapılandırılmış yer sağlayıcısının bu hedefin yakınında eczane olarak sınıflandırdığı yerleri görüntüleyin.',
    back: 'Hedefe dön',
    results: 'Yakındaki eczaneler',
    noResults: 'Bu arama alanında eczane bulunamadı.',
    unavailable: 'Eczaneler şu anda yüklenemiyor.',
    providerChecked: 'Sağlayıcı kontrol edildi',
    website: 'Web sitesi',
    emergencyLink: 'Doğrulanmış acil durum kişileri',
    disclaimer:
      'Bunlar sağlayıcının hedef yakınında eczane olarak sınıflandırdığı yerlerdir. AttraVoya ilaç stokunu, reçete veya eczacı bulunabilirliğini, açık olma durumunu, fiyatları, hizmetleri ya da acil bakıma uygunluğu doğrulamaz. Tıbbi acil durumda Güvenlik ve acil durum bölümündeki doğrulanmış kişileri kullanın.',
  },
  ar: {
    eyebrow: 'الصيدليات',
    title: 'صيدليات بالقرب من {destination}',
    intro: 'تصفح الأماكن التي يصنفها مزود الأماكن المكوّن كصيدليات بالقرب من هذه الوجهة.',
    back: 'العودة إلى الوجهة',
    results: 'صيدليات قريبة',
    noResults: 'لم يتم العثور على صيدليات في منطقة البحث هذه.',
    unavailable: 'تعذر تحميل الصيدليات الآن.',
    providerChecked: 'تم فحص المزود',
    website: 'الموقع الإلكتروني',
    emergencyLink: 'جهات اتصال طوارئ موثقة',
    disclaimer:
      'هذه أماكن يصنفها المزود كصيدليات بالقرب من الوجهة. لا تتحقق AttraVoya من مخزون الأدوية أو توفر الوصفات أو الصيادلة أو حالة الفتح أو الأسعار أو الخدمات أو الملاءمة للرعاية العاجلة. في حالة طبية طارئة استخدم جهات الاتصال الموثقة في قسم السلامة والطوارئ.',
  },
  zh: {
    eyebrow: '药房',
    title: '{destination}附近的药房',
    intro: '查看已配置地点提供商在此目的地附近归类为药房的地点。',
    back: '返回目的地',
    results: '附近药房',
    noResults: '此搜索区域未找到药房。',
    unavailable: '目前无法加载药房。',
    providerChecked: '提供商检查时间',
    website: '网站',
    emergencyLink: '已核实的紧急联系方式',
    disclaimer:
      '这些是提供商在目的地附近归类为药房的地点。AttraVoya 不核实药品库存、处方或药剂师可用性、营业状态、价格、服务或是否适合紧急医疗需求。遇到医疗紧急情况时，请使用“安全与紧急情况”中的已核实联系方式。',
  },
  ja: {
    eyebrow: '薬局',
    title: '{destination}周辺の薬局',
    intro: '設定済みの場所プロバイダーがこの目的地の近くで薬局として分類した場所を確認できます。',
    back: '目的地に戻る',
    results: '近くの薬局',
    noResults: 'この検索範囲では薬局が見つかりませんでした。',
    unavailable: '現在、薬局を読み込めません。',
    providerChecked: 'プロバイダー確認時刻',
    website: 'ウェブサイト',
    emergencyLink: '確認済み緊急連絡先',
    disclaimer:
      'これらはプロバイダーが目的地の近くで薬局として分類した場所です。AttraVoya は医薬品在庫、処方箋や薬剤師の利用可能性、営業状況、価格、サービス、緊急医療への適性を確認していません。医療上の緊急時は「安全と緊急」の確認済み連絡先を使用してください。',
  },
  ko: {
    eyebrow: '약국',
    title: '{destination} 근처 약국',
    intro: '설정된 장소 제공업체가 이 목적지 근처에서 약국으로 분류한 장소를 확인하세요.',
    back: '목적지로 돌아가기',
    results: '근처 약국',
    noResults: '이 검색 영역에서 약국을 찾지 못했습니다.',
    unavailable: '현재 약국을 불러올 수 없습니다.',
    providerChecked: '제공업체 확인 시간',
    website: '웹사이트',
    emergencyLink: '확인된 긴급 연락처',
    disclaimer:
      '이는 제공업체가 목적지 근처에서 약국으로 분류한 장소입니다. AttraVoya는 의약품 재고, 처방전 또는 약사 이용 가능 여부, 영업 상태, 가격, 서비스, 긴급 진료 적합성을 확인하지 않습니다. 의료 응급 상황에서는 안전 및 긴급 섹션의 확인된 연락처를 사용하세요.',
  },
  hi: {
    eyebrow: 'फार्मेसी',
    title: '{destination} के पास फार्मेसी',
    intro:
      'इस गंतव्य के पास कॉन्फ़िगर किए गए स्थान प्रदाता द्वारा फार्मेसी के रूप में वर्गीकृत स्थान देखें।',
    back: 'गंतव्य पर वापस जाएँ',
    results: 'पास की फार्मेसी',
    noResults: 'इस खोज क्षेत्र में कोई फार्मेसी नहीं मिली।',
    unavailable: 'अभी फार्मेसी लोड नहीं की जा सकतीं।',
    providerChecked: 'प्रदाता जाँचा गया',
    website: 'वेबसाइट',
    emergencyLink: 'सत्यापित आपातकालीन संपर्क',
    disclaimer:
      'ये गंतव्य के पास प्रदाता द्वारा फार्मेसी के रूप में वर्गीकृत स्थान हैं। AttraVoya दवा स्टॉक, पर्चे या फार्मासिस्ट की उपलब्धता, खुला होने की स्थिति, कीमतों, सेवाओं या तत्काल देखभाल की उपयुक्तता की पुष्टि नहीं करता। चिकित्सकीय आपातकाल में सुरक्षा और आपातकाल अनुभाग के सत्यापित संपर्कों का उपयोग करें।',
  },
});

export function getPharmaciesPageCopy(locale) {
  return PHARMACIES_PAGE_COPY[normalizeLocale(locale)] ?? PHARMACIES_PAGE_COPY.en;
}
