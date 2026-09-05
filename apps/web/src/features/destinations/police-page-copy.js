import { normalizeLocale } from '@attravoya/localization';

const POLICE_PAGE_COPY = Object.freeze({
  en: {
    eyebrow: 'Police stations',
    title: 'Police stations near {destination}',
    intro:
      'Browse places categorized as police by the configured places provider near this destination.',
    back: 'Back to destination',
    results: 'Nearby police stations',
    noResults: 'No police stations were found in this search area.',
    unavailable: 'Police stations could not be loaded right now.',
    providerChecked: 'Provider checked',
    website: 'Website',
    emergencyLink: 'Verified emergency contacts',
    disclaimer:
      'These are provider-returned places categorized as police near the destination. AttraVoya does not verify station type, opening status, staffing, response availability, phone availability, emergency handling, or whether a location accepts walk-ins. For an emergency, use the verified contacts in Safety & emergency.',
  },
  sv: {
    eyebrow: 'Polisstationer',
    title: 'Polisstationer nära {destination}',
    intro:
      'Se platser som den konfigurerade platsleverantören kategoriserar som polis nära destinationen.',
    back: 'Tillbaka till destinationen',
    results: 'Polisstationer i närheten',
    noResults: 'Inga polisstationer hittades i sökområdet.',
    unavailable: 'Polisstationer kunde inte laddas just nu.',
    providerChecked: 'Leverantör kontrollerad',
    website: 'Webbplats',
    emergencyLink: 'Verifierade nödkontakter',
    disclaimer:
      'Detta är platser som leverantören kategoriserar som polis nära destinationen. AttraVoya verifierar inte stationstyp, öppetstatus, bemanning, insatstillgänglighet, telefontillgänglighet, hantering av nödsituationer eller om platsen tar emot besök utan bokning. Vid en nödsituation, använd de verifierade kontakterna under Säkerhet och nödläge.',
  },
  es: {
    eyebrow: 'Comisarías',
    title: 'Comisarías cerca de {destination}',
    intro:
      'Consulta lugares que el proveedor configurado clasifica como policía cerca de este destino.',
    back: 'Volver al destino',
    results: 'Comisarías cercanas',
    noResults: 'No se encontraron comisarías en esta zona de búsqueda.',
    unavailable: 'Las comisarías no se pueden cargar ahora.',
    providerChecked: 'Proveedor comprobado',
    website: 'Sitio web',
    emergencyLink: 'Contactos de emergencia verificados',
    disclaimer:
      'Estos son lugares que el proveedor clasifica como policía cerca del destino. AttraVoya no verifica el tipo de comisaría, estado de apertura, personal, disponibilidad de respuesta, disponibilidad telefónica, atención de emergencias ni si se admiten visitas sin cita. En una emergencia, utiliza los contactos verificados de Seguridad y emergencia.',
  },
  fr: {
    eyebrow: 'Postes de police',
    title: 'Postes de police près de {destination}',
    intro:
      'Consultez les lieux classés comme police par le fournisseur configuré près de cette destination.',
    back: 'Retour à la destination',
    results: 'Postes de police à proximité',
    noResults: 'Aucun poste de police n’a été trouvé dans cette zone de recherche.',
    unavailable: 'Les postes de police ne peuvent pas être chargés actuellement.',
    providerChecked: 'Fournisseur vérifié',
    website: 'Site web',
    emergencyLink: 'Contacts d’urgence vérifiés',
    disclaimer:
      'Ces lieux sont classés comme police par le fournisseur près de la destination. AttraVoya ne vérifie pas le type de poste, l’ouverture, les effectifs, la disponibilité des interventions, la disponibilité téléphonique, la prise en charge des urgences ni l’accueil sans rendez-vous. En cas d’urgence, utilisez les contacts vérifiés de Sécurité et urgence.',
  },
  de: {
    eyebrow: 'Polizeistationen',
    title: 'Polizeistationen nahe {destination}',
    intro:
      'Sieh dir Orte an, die der konfigurierte Anbieter nahe diesem Reiseziel als Polizei einordnet.',
    back: 'Zurück zum Reiseziel',
    results: 'Polizeistationen in der Nähe',
    noResults: 'In diesem Suchgebiet wurden keine Polizeistationen gefunden.',
    unavailable: 'Polizeistationen können derzeit nicht geladen werden.',
    providerChecked: 'Anbieter geprüft',
    website: 'Website',
    emergencyLink: 'Verifizierte Notfallkontakte',
    disclaimer:
      'Diese Orte werden vom Anbieter nahe dem Reiseziel als Polizei eingestuft. AttraVoya prüft weder Stationsart, Öffnungsstatus, Besetzung, Einsatzbereitschaft, telefonische Erreichbarkeit, Notfallbearbeitung noch die Annahme unangemeldeter Besuche. Nutze im Notfall die verifizierten Kontakte unter Sicherheit und Notfall.',
  },
  it: {
    eyebrow: 'Stazioni di polizia',
    title: 'Stazioni di polizia vicino a {destination}',
    intro:
      'Consulta i luoghi classificati come polizia dal fornitore configurato vicino a questa destinazione.',
    back: 'Torna alla destinazione',
    results: 'Stazioni di polizia nelle vicinanze',
    noResults: 'Nessuna stazione di polizia è stata trovata in questa area di ricerca.',
    unavailable: 'Le stazioni di polizia non possono essere caricate al momento.',
    providerChecked: 'Fornitore controllato',
    website: 'Sito web',
    emergencyLink: 'Contatti di emergenza verificati',
    disclaimer:
      'Questi luoghi sono classificati come polizia dal fornitore vicino alla destinazione. AttraVoya non verifica tipo di stazione, apertura, personale, disponibilità di intervento, disponibilità telefonica, gestione delle emergenze o accesso senza appuntamento. In caso di emergenza usa i contatti verificati in Sicurezza ed emergenza.',
  },
  pt: {
    eyebrow: 'Esquadras de polícia',
    title: 'Esquadras de polícia perto de {destination}',
    intro:
      'Consulte locais classificados como polícia pelo fornecedor configurado perto deste destino.',
    back: 'Voltar ao destino',
    results: 'Esquadras de polícia próximas',
    noResults: 'Não foram encontradas esquadras de polícia nesta área de pesquisa.',
    unavailable: 'As esquadras de polícia não podem ser carregadas agora.',
    providerChecked: 'Fornecedor verificado',
    website: 'Site',
    emergencyLink: 'Contactos de emergência verificados',
    disclaimer:
      'Estes locais são classificados como polícia pelo fornecedor perto do destino. A AttraVoya não verifica tipo de esquadra, estado de abertura, pessoal, disponibilidade de resposta, disponibilidade telefónica, tratamento de emergências ou atendimento sem marcação. Numa emergência, use os contactos verificados em Segurança e emergência.',
  },
  pl: {
    eyebrow: 'Posterunki policji',
    title: 'Posterunki policji w pobliżu {destination}',
    intro:
      'Przeglądaj miejsca oznaczone przez skonfigurowanego dostawcę jako policja w pobliżu celu podróży.',
    back: 'Wróć do celu podróży',
    results: 'Posterunki policji w pobliżu',
    noResults: 'W tym obszarze wyszukiwania nie znaleziono posterunków policji.',
    unavailable: 'Nie można teraz wczytać posterunków policji.',
    providerChecked: 'Dostawca sprawdzony',
    website: 'Strona internetowa',
    emergencyLink: 'Zweryfikowane kontakty alarmowe',
    disclaimer:
      'Są to miejsca oznaczone przez dostawcę jako policja w pobliżu celu podróży. AttraVoya nie weryfikuje rodzaju placówki, godzin otwarcia, obsady, dostępności interwencji, dostępności telefonicznej, obsługi nagłych zdarzeń ani przyjmowania osób bez umówienia. W nagłym przypadku użyj zweryfikowanych kontaktów w sekcji Bezpieczeństwo i alarm.',
  },
  nl: {
    eyebrow: 'Politiebureaus',
    title: 'Politiebureaus bij {destination}',
    intro:
      'Bekijk plaatsen die de ingestelde locatiesprovider als politie classificeert nabij deze bestemming.',
    back: 'Terug naar bestemming',
    results: 'Politiebureaus in de buurt',
    noResults: 'Er zijn geen politiebureaus gevonden in dit zoekgebied.',
    unavailable: 'Politiebureaus kunnen momenteel niet worden geladen.',
    providerChecked: 'Provider gecontroleerd',
    website: 'Website',
    emergencyLink: 'Geverifieerde noodcontacten',
    disclaimer:
      'Deze plaatsen worden door de provider als politie nabij de bestemming geclassificeerd. AttraVoya verifieert geen bureautype, openingsstatus, bezetting, beschikbaarheid van respons, telefonische bereikbaarheid, noodafhandeling of inloopmogelijkheden. Gebruik bij een noodgeval de geverifieerde contacten onder Veiligheid en nood.',
  },
  no: {
    eyebrow: 'Politistasjoner',
    title: 'Politistasjoner nær {destination}',
    intro:
      'Se steder som den konfigurerte stedsleverandøren kategoriserer som politi nær dette reisemålet.',
    back: 'Tilbake til reisemålet',
    results: 'Politistasjoner i nærheten',
    noResults: 'Ingen politistasjoner ble funnet i dette søkeområdet.',
    unavailable: 'Politistasjoner kan ikke lastes akkurat nå.',
    providerChecked: 'Leverandør kontrollert',
    website: 'Nettsted',
    emergencyLink: 'Verifiserte nødkontakter',
    disclaimer:
      'Dette er steder leverandøren kategoriserer som politi nær reisemålet. AttraVoya verifiserer ikke stasjonstype, åpningsstatus, bemanning, responstilgjengelighet, telefontilgjengelighet, nødhåndtering eller om stedet tar imot besøk uten avtale. Ved en nødsituasjon bruker du de verifiserte kontaktene under Sikkerhet og nød.',
  },
  da: {
    eyebrow: 'Politistationer',
    title: 'Politistationer nær {destination}',
    intro:
      'Se steder, som den konfigurerede stedudbyder kategoriserer som politi nær denne destination.',
    back: 'Tilbage til destinationen',
    results: 'Politistationer i nærheden',
    noResults: 'Der blev ikke fundet politistationer i dette søgeområde.',
    unavailable: 'Politistationer kan ikke indlæses lige nu.',
    providerChecked: 'Udbyder kontrolleret',
    website: 'Websted',
    emergencyLink: 'Bekræftede nødkontakter',
    disclaimer:
      'Dette er steder, som udbyderen kategoriserer som politi nær destinationen. AttraVoya bekræfter ikke stationstype, åbningsstatus, bemanding, responstilgængelighed, telefontilgængelighed, nødhåndtering eller om stedet modtager besøgende uden aftale. Brug de bekræftede kontakter under Sikkerhed og nødsituation ved en nødsituation.',
  },
  fi: {
    eyebrow: 'Poliisiasemat',
    title: 'Poliisiasemat lähellä kohdetta {destination}',
    intro:
      'Selaa paikkoja, jotka määritetty paikkapalvelu luokittelee poliisiksi tämän kohteen lähellä.',
    back: 'Takaisin kohteeseen',
    results: 'Lähellä olevat poliisiasemat',
    noResults: 'Tältä hakualueelta ei löytynyt poliisiasemia.',
    unavailable: 'Poliisiasemia ei voida ladata juuri nyt.',
    providerChecked: 'Palvelu tarkistettu',
    website: 'Verkkosivusto',
    emergencyLink: 'Vahvistetut hätäyhteystiedot',
    disclaimer:
      'Nämä ovat palveluntarjoajan poliisiksi luokittelemia paikkoja kohteen lähellä. AttraVoya ei vahvista aseman tyyppiä, aukiolotilaa, miehitystä, reagointivalmiutta, puhelimen saatavuutta, hätätilanteiden käsittelyä tai ilman ajanvarausta asiointia. Hätätilanteessa käytä Turvallisuus ja hätätilanne -osion vahvistettuja yhteystietoja.',
  },
  tr: {
    eyebrow: 'Polis merkezleri',
    title: '{destination} yakınındaki polis merkezleri',
    intro:
      'Yapılandırılmış yer sağlayıcısının bu hedefin yakınında polis olarak sınıflandırdığı yerleri görüntüleyin.',
    back: 'Hedefe dön',
    results: 'Yakındaki polis merkezleri',
    noResults: 'Bu arama alanında polis merkezi bulunamadı.',
    unavailable: 'Polis merkezleri şu anda yüklenemiyor.',
    providerChecked: 'Sağlayıcı kontrol edildi',
    website: 'Web sitesi',
    emergencyLink: 'Doğrulanmış acil durum kişileri',
    disclaimer:
      'Bunlar sağlayıcının hedef yakınında polis olarak sınıflandırdığı yerlerdir. AttraVoya merkez türünü, açık olma durumunu, personel durumunu, müdahale kullanılabilirliğini, telefon erişimini, acil durum işlemlerini veya randevusuz başvuruyu doğrulamaz. Acil durumda Güvenlik ve acil durum bölümündeki doğrulanmış kişileri kullanın.',
  },
  ar: {
    eyebrow: 'مراكز الشرطة',
    title: 'مراكز الشرطة بالقرب من {destination}',
    intro: 'تصفح الأماكن التي يصنفها مزود الأماكن المكوّن كشرطة بالقرب من هذه الوجهة.',
    back: 'العودة إلى الوجهة',
    results: 'مراكز شرطة قريبة',
    noResults: 'لم يتم العثور على مراكز شرطة في منطقة البحث هذه.',
    unavailable: 'تعذر تحميل مراكز الشرطة الآن.',
    providerChecked: 'تم فحص المزود',
    website: 'الموقع الإلكتروني',
    emergencyLink: 'جهات اتصال طوارئ موثقة',
    disclaimer:
      'هذه أماكن يصنفها المزود كشرطة بالقرب من الوجهة. لا تتحقق AttraVoya من نوع المركز أو حالة الفتح أو توفر الموظفين أو الاستجابة أو الهاتف أو طريقة التعامل مع الطوارئ أو قبول الزيارات من دون موعد. في حالة طارئة استخدم جهات الاتصال الموثقة في قسم السلامة والطوارئ.',
  },
  zh: {
    eyebrow: '警察局',
    title: '{destination}附近的警察局',
    intro: '查看已配置地点提供商在此目的地附近归类为警察的地点。',
    back: '返回目的地',
    results: '附近警察局',
    noResults: '此搜索区域未找到警察局。',
    unavailable: '目前无法加载警察局。',
    providerChecked: '提供商检查时间',
    website: '网站',
    emergencyLink: '已核实的紧急联系方式',
    disclaimer:
      '这些是提供商在目的地附近归类为警察的地点。AttraVoya 不核实机构类型、营业状态、人员配置、响应能力、电话可用性、紧急事件处理方式或是否接受无预约到访。遇到紧急情况时，请使用“安全与紧急情况”中的已核实联系方式。',
  },
  ja: {
    eyebrow: '警察署',
    title: '{destination}周辺の警察署',
    intro: '設定済みの場所プロバイダーがこの目的地の近くで警察として分類した場所を確認できます。',
    back: '目的地に戻る',
    results: '近くの警察署',
    noResults: 'この検索範囲では警察署が見つかりませんでした。',
    unavailable: '現在、警察署を読み込めません。',
    providerChecked: 'プロバイダー確認時刻',
    website: 'ウェブサイト',
    emergencyLink: '確認済み緊急連絡先',
    disclaimer:
      'これらはプロバイダーが目的地の近くで警察として分類した場所です。AttraVoya は施設の種類、営業状況、人員配置、対応可能性、電話の利用可能性、緊急時の対応方法、予約なし訪問の可否を確認していません。緊急時は「安全と緊急」の確認済み連絡先を使用してください。',
  },
  ko: {
    eyebrow: '경찰서',
    title: '{destination} 근처 경찰서',
    intro: '설정된 장소 제공업체가 이 목적지 근처에서 경찰로 분류한 장소를 확인하세요.',
    back: '목적지로 돌아가기',
    results: '근처 경찰서',
    noResults: '이 검색 영역에서 경찰서를 찾지 못했습니다.',
    unavailable: '현재 경찰서를 불러올 수 없습니다.',
    providerChecked: '제공업체 확인 시간',
    website: '웹사이트',
    emergencyLink: '확인된 긴급 연락처',
    disclaimer:
      '이는 제공업체가 목적지 근처에서 경찰로 분류한 장소입니다. AttraVoya는 기관 유형, 영업 상태, 인력 배치, 대응 가능 여부, 전화 이용 가능 여부, 긴급 상황 처리 방식 또는 예약 없는 방문 가능 여부를 확인하지 않습니다. 긴급 상황에서는 안전 및 긴급 섹션의 확인된 연락처를 사용하세요.',
  },
  hi: {
    eyebrow: 'पुलिस स्टेशन',
    title: '{destination} के पास पुलिस स्टेशन',
    intro:
      'इस गंतव्य के पास कॉन्फ़िगर किए गए स्थान प्रदाता द्वारा पुलिस के रूप में वर्गीकृत स्थान देखें।',
    back: 'गंतव्य पर वापस जाएँ',
    results: 'पास के पुलिस स्टेशन',
    noResults: 'इस खोज क्षेत्र में कोई पुलिस स्टेशन नहीं मिला।',
    unavailable: 'अभी पुलिस स्टेशन लोड नहीं किए जा सकते।',
    providerChecked: 'प्रदाता जाँचा गया',
    website: 'वेबसाइट',
    emergencyLink: 'सत्यापित आपातकालीन संपर्क',
    disclaimer:
      'ये गंतव्य के पास प्रदाता द्वारा पुलिस के रूप में वर्गीकृत स्थान हैं। AttraVoya स्टेशन का प्रकार, खुला होने की स्थिति, स्टाफ, प्रतिक्रिया उपलब्धता, फोन उपलब्धता, आपातकालीन प्रक्रिया या बिना अपॉइंटमेंट आगमन की पुष्टि नहीं करता। आपातकाल में सुरक्षा और आपातकाल अनुभाग के सत्यापित संपर्कों का उपयोग करें।',
  },
});

export function getPolicePageCopy(locale) {
  return POLICE_PAGE_COPY[normalizeLocale(locale)] ?? POLICE_PAGE_COPY.en;
}
