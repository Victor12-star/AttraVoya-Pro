import { normalizeLocale } from '@attravoya/localization';

const COPY = Object.freeze({
  en: {
    title: 'Embassy & consular help',
    intro:
      'Find nearby embassy facilities using place data, then confirm the right representation and official procedure for your passport country.',
    passportCountry: 'Passport or citizenship country',
    passportHint:
      'This selection does not filter Geoapify results. Confirm that a facility represents your country before relying on it.',
    nearbyTitle: 'Find nearby embassy facilities',
    locationPrivacy:
      'Your precise location is used only for this search and is not saved by this tool.',
    useLocation: 'Use my current location',
    manualLabel: 'Or search a city or place',
    manualPlaceholder: 'City, airport, or area',
    searchPlace: 'Search place',
    choosePlace: 'Choose this place',
    sourceNotice:
      'Source: Geoapify place data. These results are not official government verification and may be incomplete or outdated.',
    empty:
      'No nearby embassy facilities were found. Search the official foreign ministry or embassy website for your passport country and current destination.',
    error:
      'Nearby diplomatic facilities could not be retrieved right now. No embassy contact or procedure was invented.',
    permissionDenied:
      'Location was unavailable or not allowed. You can search a city or place manually instead.',
    navigation: 'Open directions',
    distance: 'Distance',
    lostTitle: 'Lost or stolen passport',
    lostIntro:
      'Requirements vary by nationality and location. Use these general steps, then confirm the exact procedure with the relevant embassy or consulate.',
    lostSteps: [
      'Work out whether the passport is lost or stolen.',
      'If it was stolen, consider contacting local police.',
      'Gather any identity and travel evidence you still have.',
      'Find an embassy or consulate that represents your passport or citizenship country.',
      'Contact that office for the exact replacement or emergency-document procedure.',
      'Check how the loss may affect onward travel.',
      'Protect other identity or payment documents if they were lost at the same time.',
    ],
    lostDisclaimer:
      'A police report is not always mandatory. Exact documents, photos, fees, processing time, and emergency-document eligibility must be confirmed with the responsible authority.',
    findEmbassy: 'Find embassy help',
  },
  sv: {
    title: 'Ambassad- och konsulär hjälp',
    intro:
      'Hitta närliggande ambassader med platsdata och bekräfta sedan rätt representation och officiell process för ditt passland.',
    passportCountry: 'Pass- eller medborgarskapsland',
    passportHint:
      'Valet filtrerar inte Geoapify-resultat. Bekräfta att en beskickning företräder ditt land innan du förlitar dig på den.',
    nearbyTitle: 'Hitta närliggande ambassader',
    locationPrivacy:
      'Din exakta plats används endast för denna sökning och sparas inte av verktyget.',
    useLocation: 'Använd min nuvarande plats',
    manualLabel: 'Eller sök efter en stad eller plats',
    manualPlaceholder: 'Stad, flygplats eller område',
    searchPlace: 'Sök plats',
    choosePlace: 'Välj denna plats',
    sourceNotice:
      'Källa: Geoapify platsdata. Resultaten är inte officiellt myndighetsverifierade och kan vara ofullständiga eller inaktuella.',
    empty:
      'Inga närliggande ambassader hittades. Sök på den officiella webbplatsen för utrikesministeriet eller ambassaden för ditt passland och din aktuella destination.',
    error:
      'Närliggande diplomatiska beskickningar kunde inte hämtas just nu. Ingen ambassadkontakt eller process har hittats på.',
    permissionDenied:
      'Platsen var inte tillgänglig eller tillåten. Du kan söka efter en stad eller plats manuellt.',
    navigation: 'Öppna vägbeskrivning',
    distance: 'Avstånd',
    lostTitle: 'Förlorat eller stulet pass',
    lostIntro:
      'Kraven varierar beroende på nationalitet och plats. Följ dessa allmänna steg och bekräfta sedan den exakta processen med rätt ambassad eller konsulat.',
    lostSteps: [
      'Ta reda på om passet är förlorat eller stulet.',
      'Om det stals, överväg att kontakta lokal polis.',
      'Samla den identitets- och reseinformation du fortfarande har.',
      'Hitta en ambassad eller ett konsulat som företräder ditt pass- eller medborgarskapsland.',
      'Kontakta beskickningen för exakt process för ersättningspass eller nödhandling.',
      'Kontrollera hur förlusten kan påverka fortsatt resa.',
      'Skydda andra identitets- eller betalningshandlingar om de förlorades samtidigt.',
    ],
    lostDisclaimer:
      'En polisanmälan är inte alltid obligatorisk. Exakta handlingar, foton, avgifter, handläggningstid och rätt till nödhandling måste bekräftas med ansvarig myndighet.',
    findEmbassy: 'Hitta ambassadhjälp',
  },
  es: {
    title: 'Ayuda de embajada y consular',
    intro:
      'Busca embajadas cercanas con datos de lugares y confirma después la representación correcta y el procedimiento oficial para tu país de pasaporte.',
    passportCountry: 'País del pasaporte o ciudadanía',
    passportHint:
      'Esta selección no filtra los resultados de Geoapify. Confirma que una sede representa a tu país antes de confiar en ella.',
    nearbyTitle: 'Buscar embajadas cercanas',
    locationPrivacy:
      'Tu ubicación precisa se usa solo para esta búsqueda y esta herramienta no la guarda.',
    useLocation: 'Usar mi ubicación actual',
    manualLabel: 'O busca una ciudad o lugar',
    manualPlaceholder: 'Ciudad, aeropuerto o zona',
    searchPlace: 'Buscar lugar',
    choosePlace: 'Elegir este lugar',
    sourceNotice:
      'Fuente: datos de lugares de Geoapify. Estos resultados no son una verificación oficial del gobierno y pueden estar incompletos o desactualizados.',
    empty:
      'No se encontraron embajadas cercanas. Busca el sitio oficial del ministerio de exteriores o de la embajada de tu país de pasaporte y destino actual.',
    error:
      'No se pudieron obtener sedes diplomáticas cercanas. No se inventó ningún contacto ni procedimiento.',
    permissionDenied:
      'La ubicación no estaba disponible o no fue permitida. Puedes buscar una ciudad o lugar manualmente.',
    navigation: 'Abrir indicaciones',
    distance: 'Distancia',
    lostTitle: 'Pasaporte perdido o robado',
    lostIntro:
      'Los requisitos varían según nacionalidad y lugar. Sigue estos pasos generales y confirma el procedimiento exacto con la embajada o consulado correspondiente.',
    lostSteps: [
      'Determina si el pasaporte se perdió o fue robado.',
      'Si fue robado, considera contactar con la policía local.',
      'Reúne las pruebas de identidad y viaje que aún tengas.',
      'Busca una embajada o consulado que represente a tu país de pasaporte o ciudadanía.',
      'Contacta con esa oficina para conocer el procedimiento exacto de sustitución o documento de emergencia.',
      'Comprueba cómo puede afectar la pérdida a tu viaje posterior.',
      'Protege otros documentos de identidad o pago si también se perdieron.',
    ],
    lostDisclaimer:
      'Un informe policial no siempre es obligatorio. Los documentos, fotos, tasas, plazos y la elegibilidad para documentos de emergencia deben confirmarse con la autoridad responsable.',
    findEmbassy: 'Buscar ayuda de embajada',
  },
  fr: {
    title: 'Aide ambassade et consulaire',
    intro:
      'Trouvez des ambassades proches grâce aux données de lieux, puis confirmez la bonne représentation et la procédure officielle pour votre pays de passeport.',
    passportCountry: 'Pays du passeport ou de citoyenneté',
    passportHint:
      'Ce choix ne filtre pas les résultats Geoapify. Vérifiez qu’un établissement représente votre pays avant de vous y fier.',
    nearbyTitle: 'Trouver des ambassades proches',
    locationPrivacy:
      'Votre position précise sert uniquement à cette recherche et n’est pas enregistrée par cet outil.',
    useLocation: 'Utiliser ma position actuelle',
    manualLabel: 'Ou rechercher une ville ou un lieu',
    manualPlaceholder: 'Ville, aéroport ou zone',
    searchPlace: 'Rechercher le lieu',
    choosePlace: 'Choisir ce lieu',
    sourceNotice:
      'Source : données de lieux Geoapify. Ces résultats ne constituent pas une vérification officielle et peuvent être incomplets ou obsolètes.',
    empty:
      'Aucune ambassade proche n’a été trouvée. Consultez le site officiel du ministère des Affaires étrangères ou de l’ambassade de votre pays de passeport et de votre destination actuelle.',
    error:
      'Les établissements diplomatiques proches n’ont pas pu être récupérés. Aucun contact ni aucune procédure n’a été inventé.',
    permissionDenied:
      'La position était indisponible ou non autorisée. Vous pouvez rechercher manuellement une ville ou un lieu.',
    navigation: 'Ouvrir l’itinéraire',
    distance: 'Distance',
    lostTitle: 'Passeport perdu ou volé',
    lostIntro:
      'Les exigences varient selon la nationalité et le lieu. Suivez ces étapes générales puis confirmez la procédure exacte auprès de l’ambassade ou du consulat concerné.',
    lostSteps: [
      'Déterminez si le passeport est perdu ou volé.',
      'S’il a été volé, envisagez de contacter la police locale.',
      'Rassemblez les preuves d’identité et de voyage dont vous disposez encore.',
      'Trouvez une ambassade ou un consulat représentant votre pays de passeport ou de citoyenneté.',
      'Contactez ce bureau pour connaître la procédure exacte de remplacement ou de document d’urgence.',
      'Vérifiez les conséquences possibles sur la suite du voyage.',
      'Protégez les autres documents d’identité ou de paiement perdus en même temps.',
    ],
    lostDisclaimer:
      'Un rapport de police n’est pas toujours obligatoire. Les documents, photos, frais, délais et l’éligibilité à un document d’urgence doivent être confirmés auprès de l’autorité compétente.',
    findEmbassy: 'Trouver une aide consulaire',
  },
  de: {
    title: 'Botschafts- und Konsularhilfe',
    intro:
      'Finden Sie Botschaften in der Nähe anhand von Ortsdaten und bestätigen Sie anschließend die zuständige Vertretung und das offizielle Verfahren für Ihr Passland.',
    passportCountry: 'Pass- oder Staatsangehörigkeitsland',
    passportHint:
      'Diese Auswahl filtert Geoapify-Ergebnisse nicht. Bestätigen Sie, dass eine Vertretung Ihr Land vertritt, bevor Sie sich darauf verlassen.',
    nearbyTitle: 'Botschaften in der Nähe finden',
    locationPrivacy:
      'Ihr genauer Standort wird nur für diese Suche verwendet und von diesem Tool nicht gespeichert.',
    useLocation: 'Meinen aktuellen Standort verwenden',
    manualLabel: 'Oder Stadt bzw. Ort suchen',
    manualPlaceholder: 'Stadt, Flughafen oder Gebiet',
    searchPlace: 'Ort suchen',
    choosePlace: 'Diesen Ort wählen',
    sourceNotice:
      'Quelle: Geoapify-Ortsdaten. Diese Ergebnisse sind keine offizielle Behördenbestätigung und können unvollständig oder veraltet sein.',
    empty:
      'Keine Botschaft in der Nähe gefunden. Suchen Sie die offizielle Website des Außenministeriums oder der Botschaft für Ihr Passland und Ihren aktuellen Aufenthaltsort.',
    error:
      'Diplomatische Einrichtungen in der Nähe konnten nicht geladen werden. Es wurden keine Kontakte oder Verfahren erfunden.',
    permissionDenied:
      'Der Standort war nicht verfügbar oder nicht freigegeben. Sie können eine Stadt oder einen Ort manuell suchen.',
    navigation: 'Route öffnen',
    distance: 'Entfernung',
    lostTitle: 'Verlorener oder gestohlener Reisepass',
    lostIntro:
      'Anforderungen unterscheiden sich nach Staatsangehörigkeit und Ort. Nutzen Sie diese allgemeinen Schritte und bestätigen Sie das genaue Verfahren bei der zuständigen Botschaft oder dem Konsulat.',
    lostSteps: [
      'Klären Sie, ob der Reisepass verloren oder gestohlen wurde.',
      'Bei Diebstahl sollten Sie erwägen, die örtliche Polizei zu kontaktieren.',
      'Sammeln Sie vorhandene Identitäts- und Reiseunterlagen.',
      'Finden Sie eine Botschaft oder ein Konsulat, das Ihr Pass- oder Staatsangehörigkeitsland vertritt.',
      'Fragen Sie dort nach dem genauen Ersatz- oder Notdokumentverfahren.',
      'Prüfen Sie die Auswirkungen auf Ihre Weiterreise.',
      'Schützen Sie weitere Identitäts- oder Zahlungsdokumente, falls sie ebenfalls verloren gingen.',
    ],
    lostDisclaimer:
      'Ein Polizeibericht ist nicht immer zwingend. Dokumente, Fotos, Gebühren, Bearbeitungszeit und Berechtigung für Notdokumente müssen bei der zuständigen Behörde bestätigt werden.',
    findEmbassy: 'Botschaftshilfe finden',
  },
  it: {
    title: 'Aiuto ambasciata e consolare',
    intro:
      'Trova ambasciate vicine tramite dati sui luoghi, poi conferma la rappresentanza corretta e la procedura ufficiale per il tuo Paese di passaporto.',
    passportCountry: 'Paese del passaporto o cittadinanza',
    passportHint:
      'Questa scelta non filtra i risultati Geoapify. Verifica che una sede rappresenti il tuo Paese prima di farvi affidamento.',
    nearbyTitle: 'Trova ambasciate vicine',
    locationPrivacy:
      'La tua posizione precisa viene usata solo per questa ricerca e non viene salvata da questo strumento.',
    useLocation: 'Usa la mia posizione attuale',
    manualLabel: 'Oppure cerca una città o un luogo',
    manualPlaceholder: 'Città, aeroporto o area',
    searchPlace: 'Cerca luogo',
    choosePlace: 'Scegli questo luogo',
    sourceNotice:
      'Fonte: dati sui luoghi Geoapify. I risultati non sono una verifica ufficiale governativa e possono essere incompleti o non aggiornati.',
    empty:
      'Nessuna ambasciata vicina trovata. Cerca il sito ufficiale del ministero degli esteri o dell’ambasciata per il tuo Paese di passaporto e la destinazione attuale.',
    error:
      'Non è stato possibile recuperare sedi diplomatiche vicine. Non è stato inventato alcun contatto o procedimento.',
    permissionDenied:
      'La posizione non era disponibile o autorizzata. Puoi cercare manualmente una città o un luogo.',
    navigation: 'Apri indicazioni',
    distance: 'Distanza',
    lostTitle: 'Passaporto perso o rubato',
    lostIntro:
      'I requisiti variano in base a nazionalità e luogo. Segui questi passaggi generali e conferma la procedura esatta con l’ambasciata o il consolato competente.',
    lostSteps: [
      'Verifica se il passaporto è perso o rubato.',
      'Se è stato rubato, valuta di contattare la polizia locale.',
      'Raccogli le prove di identità e viaggio ancora disponibili.',
      'Trova un’ambasciata o consolato che rappresenti il tuo Paese di passaporto o cittadinanza.',
      'Contatta quell’ufficio per la procedura esatta di sostituzione o documento di emergenza.',
      'Controlla l’impatto sulla prosecuzione del viaggio.',
      'Proteggi altri documenti di identità o pagamento persi insieme al passaporto.',
    ],
    lostDisclaimer:
      'Una denuncia alla polizia non è sempre obbligatoria. Documenti, foto, costi, tempi ed eleggibilità per documenti di emergenza vanno confermati con l’autorità competente.',
    findEmbassy: 'Trova aiuto dell’ambasciata',
  },
  pt: {
    title: 'Ajuda de embaixada e consular',
    intro:
      'Encontre embaixadas próximas através de dados de locais e depois confirme a representação correta e o procedimento oficial para o país do seu passaporte.',
    passportCountry: 'País do passaporte ou cidadania',
    passportHint:
      'Esta seleção não filtra os resultados Geoapify. Confirme que uma representação serve o seu país antes de confiar nela.',
    nearbyTitle: 'Encontrar embaixadas próximas',
    locationPrivacy:
      'A sua localização exata é usada apenas nesta pesquisa e não é guardada por esta ferramenta.',
    useLocation: 'Usar a minha localização atual',
    manualLabel: 'Ou pesquisar uma cidade ou local',
    manualPlaceholder: 'Cidade, aeroporto ou zona',
    searchPlace: 'Pesquisar local',
    choosePlace: 'Escolher este local',
    sourceNotice:
      'Fonte: dados de locais Geoapify. Estes resultados não são verificação oficial do governo e podem estar incompletos ou desatualizados.',
    empty:
      'Não foram encontradas embaixadas próximas. Procure o site oficial do ministério dos negócios estrangeiros ou da embaixada do seu país de passaporte e destino atual.',
    error:
      'Não foi possível obter representações diplomáticas próximas. Nenhum contacto ou procedimento foi inventado.',
    permissionDenied:
      'A localização estava indisponível ou não foi autorizada. Pode pesquisar manualmente uma cidade ou local.',
    navigation: 'Abrir direções',
    distance: 'Distância',
    lostTitle: 'Passaporte perdido ou roubado',
    lostIntro:
      'Os requisitos variam conforme a nacionalidade e o local. Siga estes passos gerais e confirme o procedimento exato com a embaixada ou consulado responsável.',
    lostSteps: [
      'Determine se o passaporte foi perdido ou roubado.',
      'Se foi roubado, considere contactar a polícia local.',
      'Reúna as provas de identidade e viagem que ainda possui.',
      'Encontre uma embaixada ou consulado que represente o seu país de passaporte ou cidadania.',
      'Contacte esse posto para saber o procedimento exato de substituição ou documento de emergência.',
      'Verifique como a perda pode afetar a continuação da viagem.',
      'Proteja outros documentos de identidade ou pagamento que tenham sido perdidos ao mesmo tempo.',
    ],
    lostDisclaimer:
      'Um relatório policial nem sempre é obrigatório. Documentos, fotos, taxas, prazos e elegibilidade para documentos de emergência devem ser confirmados com a autoridade responsável.',
    findEmbassy: 'Encontrar ajuda da embaixada',
  },
  pl: {
    title: 'Pomoc ambasady i konsularna',
    intro:
      'Znajdź pobliskie ambasady na podstawie danych o miejscach, a następnie potwierdź właściwe przedstawicielstwo i oficjalną procedurę dla kraju paszportu.',
    passportCountry: 'Kraj paszportu lub obywatelstwa',
    passportHint:
      'Ten wybór nie filtruje wyników Geoapify. Potwierdź, że placówka reprezentuje Twój kraj, zanim na niej polegniesz.',
    nearbyTitle: 'Znajdź pobliskie ambasady',
    locationPrivacy:
      'Dokładna lokalizacja jest używana tylko do tego wyszukiwania i nie jest zapisywana przez to narzędzie.',
    useLocation: 'Użyj mojej bieżącej lokalizacji',
    manualLabel: 'Lub wyszukaj miasto albo miejsce',
    manualPlaceholder: 'Miasto, lotnisko lub obszar',
    searchPlace: 'Szukaj miejsca',
    choosePlace: 'Wybierz to miejsce',
    sourceNotice:
      'Źródło: dane miejsc Geoapify. Wyniki nie są oficjalną weryfikacją rządową i mogą być niepełne lub nieaktualne.',
    empty:
      'Nie znaleziono pobliskiej ambasady. Wyszukaj oficjalną stronę ministerstwa spraw zagranicznych lub ambasady dla kraju paszportu i obecnego miejsca pobytu.',
    error:
      'Nie udało się pobrać pobliskich placówek dyplomatycznych. Nie wymyślono żadnego kontaktu ani procedury.',
    permissionDenied:
      'Lokalizacja była niedostępna lub niedozwolona. Możesz ręcznie wyszukać miasto lub miejsce.',
    navigation: 'Otwórz wskazówki',
    distance: 'Odległość',
    lostTitle: 'Zgubiony lub skradziony paszport',
    lostIntro:
      'Wymagania różnią się zależnie od obywatelstwa i miejsca. Wykonaj te ogólne kroki, a dokładną procedurę potwierdź w odpowiedniej ambasadzie lub konsulacie.',
    lostSteps: [
      'Ustal, czy paszport został zgubiony czy skradziony.',
      'Jeśli został skradziony, rozważ kontakt z lokalną policją.',
      'Zbierz dostępne dowody tożsamości i podróży.',
      'Znajdź ambasadę lub konsulat reprezentujący kraj Twojego paszportu lub obywatelstwa.',
      'Skontaktuj się z placówką po dokładną procedurę wymiany lub dokumentu awaryjnego.',
      'Sprawdź wpływ utraty paszportu na dalszą podróż.',
      'Zabezpiecz inne dokumenty tożsamości lub płatnicze utracone w tym samym czasie.',
    ],
    lostDisclaimer:
      'Raport policyjny nie zawsze jest obowiązkowy. Dokładne dokumenty, zdjęcia, opłaty, czas i uprawnienie do dokumentu awaryjnego potwierdź u właściwego organu.',
    findEmbassy: 'Znajdź pomoc ambasady',
  },
  nl: {
    title: 'Ambassade- en consulaire hulp',
    intro:
      'Vind ambassades in de buurt met plaatsgegevens en bevestig daarna de juiste vertegenwoordiging en officiële procedure voor je paspoortland.',
    passportCountry: 'Paspoort- of staatsburgerschapsland',
    passportHint:
      'Deze keuze filtert Geoapify-resultaten niet. Bevestig dat een locatie jouw land vertegenwoordigt voordat je erop vertrouwt.',
    nearbyTitle: 'Vind ambassades in de buurt',
    locationPrivacy:
      'Je precieze locatie wordt alleen voor deze zoekopdracht gebruikt en niet door deze tool opgeslagen.',
    useLocation: 'Mijn huidige locatie gebruiken',
    manualLabel: 'Of zoek een stad of plaats',
    manualPlaceholder: 'Stad, luchthaven of gebied',
    searchPlace: 'Plaats zoeken',
    choosePlace: 'Deze plaats kiezen',
    sourceNotice:
      'Bron: Geoapify-plaatsgegevens. Deze resultaten zijn geen officiële overheidsverificatie en kunnen onvolledig of verouderd zijn.',
    empty:
      'Geen ambassade in de buurt gevonden. Zoek de officiële website van het ministerie van Buitenlandse Zaken of de ambassade voor je paspoortland en huidige bestemming.',
    error:
      'Diplomatieke locaties in de buurt konden niet worden opgehaald. Er is geen contact of procedure verzonnen.',
    permissionDenied:
      'Locatie was niet beschikbaar of toegestaan. Je kunt handmatig een stad of plaats zoeken.',
    navigation: 'Route openen',
    distance: 'Afstand',
    lostTitle: 'Verloren of gestolen paspoort',
    lostIntro:
      'Eisen verschillen per nationaliteit en locatie. Volg deze algemene stappen en bevestig de exacte procedure bij de juiste ambassade of het consulaat.',
    lostSteps: [
      'Bepaal of het paspoort verloren of gestolen is.',
      'Overweeg bij diefstal contact op te nemen met de lokale politie.',
      'Verzamel de identiteits- en reisbewijzen die je nog hebt.',
      'Vind een ambassade of consulaat dat je paspoort- of staatsburgerschapsland vertegenwoordigt.',
      'Neem contact op voor de exacte vervangings- of nooddocumentprocedure.',
      'Controleer de gevolgen voor je verdere reis.',
      'Bescherm andere identiteits- of betaaldocumenten die tegelijk verloren zijn.',
    ],
    lostDisclaimer:
      'Een politierapport is niet altijd verplicht. Documenten, foto’s, kosten, verwerkingstijd en geschiktheid voor nooddocumenten moeten bij de bevoegde instantie worden bevestigd.',
    findEmbassy: 'Ambassadehulp vinden',
  },
  no: {
    title: 'Ambassade- og konsulær hjelp',
    intro:
      'Finn ambassader i nærheten med stedsdata, og bekreft deretter riktig representasjon og offisiell prosedyre for passlandet ditt.',
    passportCountry: 'Pass- eller statsborgerskapsland',
    passportHint:
      'Valget filtrerer ikke Geoapify-resultater. Bekreft at et sted representerer landet ditt før du stoler på det.',
    nearbyTitle: 'Finn ambassader i nærheten',
    locationPrivacy:
      'Den nøyaktige posisjonen brukes bare til dette søket og lagres ikke av verktøyet.',
    useLocation: 'Bruk min nåværende posisjon',
    manualLabel: 'Eller søk etter en by eller et sted',
    manualPlaceholder: 'By, flyplass eller område',
    searchPlace: 'Søk sted',
    choosePlace: 'Velg dette stedet',
    sourceNotice:
      'Kilde: Geoapify-stedsdata. Resultatene er ikke offisiell myndighetsverifisering og kan være ufullstendige eller utdaterte.',
    empty:
      'Ingen ambassade i nærheten ble funnet. Søk på den offisielle nettsiden til utenriksdepartementet eller ambassaden for passlandet ditt og nåværende reisemål.',
    error:
      'Diplomatiske steder i nærheten kunne ikke hentes. Ingen kontakt eller prosedyre ble funnet på.',
    permissionDenied:
      'Posisjonen var utilgjengelig eller ikke tillatt. Du kan søke etter en by eller et sted manuelt.',
    navigation: 'Åpne veibeskrivelse',
    distance: 'Avstand',
    lostTitle: 'Mistet eller stjålet pass',
    lostIntro:
      'Krav varierer etter nasjonalitet og sted. Følg disse generelle stegene og bekreft den nøyaktige prosedyren med riktig ambassade eller konsulat.',
    lostSteps: [
      'Finn ut om passet er mistet eller stjålet.',
      'Hvis det ble stjålet, vurder å kontakte lokalt politi.',
      'Samle identitets- og reisedokumentasjonen du fortsatt har.',
      'Finn en ambassade eller et konsulat som representerer pass- eller statsborgerskapslandet ditt.',
      'Kontakt kontoret for nøyaktig prosedyre for erstatning eller nøddokument.',
      'Sjekk hvordan tapet kan påvirke videre reise.',
      'Beskytt andre identitets- eller betalingsdokumenter som ble borte samtidig.',
    ],
    lostDisclaimer:
      'Politirapport er ikke alltid obligatorisk. Dokumenter, bilder, gebyrer, behandlingstid og rett til nøddokument må bekreftes med ansvarlig myndighet.',
    findEmbassy: 'Finn ambassadehjelp',
  },
  da: {
    title: 'Ambassade- og konsulær hjælp',
    intro:
      'Find ambassader i nærheden med steddata, og bekræft derefter den rigtige repræsentation og officielle procedure for dit pasland.',
    passportCountry: 'Pas- eller statsborgerskabsland',
    passportHint:
      'Valget filtrerer ikke Geoapify-resultater. Bekræft, at en repræsentation dækker dit land, før du stoler på den.',
    nearbyTitle: 'Find ambassader i nærheden',
    locationPrivacy:
      'Din præcise placering bruges kun til denne søgning og gemmes ikke af værktøjet.',
    useLocation: 'Brug min aktuelle placering',
    manualLabel: 'Eller søg efter en by eller et sted',
    manualPlaceholder: 'By, lufthavn eller område',
    searchPlace: 'Søg sted',
    choosePlace: 'Vælg dette sted',
    sourceNotice:
      'Kilde: Geoapify-steddata. Resultaterne er ikke officiel myndighedsverifikation og kan være ufuldstændige eller forældede.',
    empty:
      'Ingen ambassade i nærheden blev fundet. Søg på den officielle hjemmeside for udenrigsministeriet eller ambassaden for dit pasland og aktuelle rejsemål.',
    error:
      'Diplomatiske steder i nærheden kunne ikke hentes. Ingen kontakt eller procedure blev opfundet.',
    permissionDenied:
      'Placeringen var utilgængelig eller ikke tilladt. Du kan søge efter en by eller et sted manuelt.',
    navigation: 'Åbn rutevejledning',
    distance: 'Afstand',
    lostTitle: 'Mistet eller stjålet pas',
    lostIntro:
      'Krav varierer efter nationalitet og sted. Brug disse generelle trin og bekræft den præcise procedure med den relevante ambassade eller konsulat.',
    lostSteps: [
      'Afgør, om passet er mistet eller stjålet.',
      'Hvis det blev stjålet, overvej at kontakte det lokale politi.',
      'Saml den identitets- og rejsedokumentation, du stadig har.',
      'Find en ambassade eller et konsulat, der repræsenterer dit pas- eller statsborgerskabsland.',
      'Kontakt kontoret for den præcise procedure for erstatning eller nøddokument.',
      'Kontrollér hvordan tabet kan påvirke den videre rejse.',
      'Beskyt andre identitets- eller betalingsdokumenter, hvis de blev mistet samtidig.',
    ],
    lostDisclaimer:
      'En politirapport er ikke altid obligatorisk. Dokumenter, fotos, gebyrer, behandlingstid og ret til nøddokument skal bekræftes hos den ansvarlige myndighed.',
    findEmbassy: 'Find ambassadehjælp',
  },
  fi: {
    title: 'Suurlähetystö- ja konsuliapu',
    intro:
      'Etsi lähialueen suurlähetystöjä paikkatietojen avulla ja vahvista sitten oikea edustusto sekä passimaasi virallinen menettely.',
    passportCountry: 'Passi- tai kansalaisuusmaa',
    passportHint:
      'Valinta ei suodata Geoapify-tuloksia. Varmista, että edustusto edustaa maatasi ennen kuin luotat siihen.',
    nearbyTitle: 'Etsi lähellä olevia suurlähetystöjä',
    locationPrivacy:
      'Tarkkaa sijaintiasi käytetään vain tähän hakuun eikä tämä työkalu tallenna sitä.',
    useLocation: 'Käytä nykyistä sijaintiani',
    manualLabel: 'Tai hae kaupunkia tai paikkaa',
    manualPlaceholder: 'Kaupunki, lentoasema tai alue',
    searchPlace: 'Hae paikkaa',
    choosePlace: 'Valitse tämä paikka',
    sourceNotice:
      'Lähde: Geoapify-paikkatiedot. Tulokset eivät ole viranomaisen virallinen vahvistus ja voivat olla puutteellisia tai vanhentuneita.',
    empty:
      'Lähistöltä ei löytynyt suurlähetystöä. Hae passimaasi ja nykyisen kohteesi ulkoministeriön tai suurlähetystön virallinen verkkosivusto.',
    error:
      'Lähialueen diplomaattisia toimipisteitä ei voitu hakea. Yhteystietoja tai menettelyä ei keksitty.',
    permissionDenied:
      'Sijainti ei ollut saatavilla tai sallittu. Voit hakea kaupungin tai paikan käsin.',
    navigation: 'Avaa reittiohje',
    distance: 'Etäisyys',
    lostTitle: 'Kadonnut tai varastettu passi',
    lostIntro:
      'Vaatimukset vaihtelevat kansalaisuuden ja sijainnin mukaan. Noudata yleisiä vaiheita ja varmista tarkka menettely oikeasta suurlähetystöstä tai konsulaatista.',
    lostSteps: [
      'Selvitä, onko passi kadonnut vai varastettu.',
      'Jos se varastettiin, harkitse yhteydenottoa paikalliseen poliisiin.',
      'Kerää jäljellä olevat henkilöllisyys- ja matkatodisteet.',
      'Etsi passi- tai kansalaisuusmaatasi edustava suurlähetystö tai konsulaatti.',
      'Kysy toimipisteestä tarkka korvaavan passin tai hätäasiakirjan menettely.',
      'Tarkista vaikutus matkan jatkumiseen.',
      'Suojaa muut henkilöllisyys- tai maksuvälineet, jos ne katosivat samalla.',
    ],
    lostDisclaimer:
      'Poliisiraportti ei ole aina pakollinen. Tarkat asiakirjat, valokuvat, maksut, käsittelyaika ja hätäasiakirjan ehdot on varmistettava vastuulliselta viranomaiselta.',
    findEmbassy: 'Etsi suurlähetystöapua',
  },
  tr: {
    title: 'Büyükelçilik ve konsolosluk yardımı',
    intro:
      'Konum verileriyle yakındaki büyükelçilikleri bulun, ardından pasaport ülkeniz için doğru temsilciliği ve resmi prosedürü doğrulayın.',
    passportCountry: 'Pasaport veya vatandaşlık ülkesi',
    passportHint:
      'Bu seçim Geoapify sonuçlarını filtrelemez. Güvenmeden önce temsilciliğin ülkenizi temsil ettiğini doğrulayın.',
    nearbyTitle: 'Yakındaki büyükelçilikleri bul',
    locationPrivacy:
      'Kesin konumunuz yalnızca bu arama için kullanılır ve bu araç tarafından kaydedilmez.',
    useLocation: 'Mevcut konumumu kullan',
    manualLabel: 'Veya şehir ya da yer arayın',
    manualPlaceholder: 'Şehir, havaalanı veya bölge',
    searchPlace: 'Yer ara',
    choosePlace: 'Bu yeri seç',
    sourceNotice:
      'Kaynak: Geoapify konum verileri. Bu sonuçlar resmi devlet doğrulaması değildir ve eksik veya eski olabilir.',
    empty:
      'Yakında büyükelçilik bulunamadı. Pasaport ülkeniz ve bulunduğunuz yer için dışişleri bakanlığı veya büyükelçiliğin resmi sitesini arayın.',
    error:
      'Yakındaki diplomatik tesisler alınamadı. Hiçbir iletişim bilgisi veya prosedür uydurulmadı.',
    permissionDenied:
      'Konum kullanılamadı veya izin verilmedi. Bir şehir ya da yeri elle arayabilirsiniz.',
    navigation: 'Yol tarifini aç',
    distance: 'Mesafe',
    lostTitle: 'Kayıp veya çalınmış pasaport',
    lostIntro:
      'Gereklilikler vatandaşlığa ve konuma göre değişir. Bu genel adımları izleyin ve kesin prosedürü ilgili büyükelçilik veya konsolosluktan doğrulayın.',
    lostSteps: [
      'Pasaportun kayıp mı yoksa çalınmış mı olduğunu belirleyin.',
      'Çalındıysa yerel polisle iletişime geçmeyi düşünün.',
      'Elinizde kalan kimlik ve seyahat kanıtlarını toplayın.',
      'Pasaport veya vatandaşlık ülkenizi temsil eden bir büyükelçilik ya da konsolosluk bulun.',
      'Kesin yenileme veya acil belge prosedürü için o makamla iletişime geçin.',
      'Kaybın sonraki seyahatinizi nasıl etkileyebileceğini kontrol edin.',
      'Aynı anda kaybolan diğer kimlik veya ödeme belgelerini koruyun.',
    ],
    lostDisclaimer:
      'Polis raporu her zaman zorunlu değildir. Belgeler, fotoğraflar, ücretler, süre ve acil belge uygunluğu sorumlu makamdan doğrulanmalıdır.',
    findEmbassy: 'Büyükelçilik yardımı bul',
  },
  ar: {
    title: 'مساعدة السفارة والقنصلية',
    intro:
      'اعثر على سفارات قريبة باستخدام بيانات الأماكن، ثم تأكد من الجهة التي تمثل بلد جواز سفرك والإجراء الرسمي الصحيح.',
    passportCountry: 'بلد جواز السفر أو الجنسية',
    passportHint:
      'هذا الاختيار لا يرشح نتائج Geoapify. تأكد من أن الجهة تمثل بلدك قبل الاعتماد عليها.',
    nearbyTitle: 'العثور على سفارات قريبة',
    locationPrivacy: 'يُستخدم موقعك الدقيق لهذا البحث فقط ولا تحفظه هذه الأداة.',
    useLocation: 'استخدام موقعي الحالي',
    manualLabel: 'أو ابحث عن مدينة أو مكان',
    manualPlaceholder: 'مدينة أو مطار أو منطقة',
    searchPlace: 'البحث عن مكان',
    choosePlace: 'اختيار هذا المكان',
    sourceNotice:
      'المصدر: بيانات الأماكن من Geoapify. هذه النتائج ليست تحققاً حكومياً رسمياً وقد تكون ناقصة أو قديمة.',
    empty:
      'لم يتم العثور على سفارات قريبة. ابحث عن الموقع الرسمي لوزارة الخارجية أو السفارة الخاصة ببلد جواز سفرك ووجهتك الحالية.',
    error: 'تعذر جلب المرافق الدبلوماسية القريبة. لم يتم اختلاق أي جهة اتصال أو إجراء.',
    permissionDenied: 'الموقع غير متاح أو لم يُسمح به. يمكنك البحث يدوياً عن مدينة أو مكان.',
    navigation: 'فتح الاتجاهات',
    distance: 'المسافة',
    lostTitle: 'جواز سفر مفقود أو مسروق',
    lostIntro:
      'تختلف المتطلبات حسب الجنسية والموقع. اتبع هذه الخطوات العامة ثم أكد الإجراء الدقيق مع السفارة أو القنصلية المختصة.',
    lostSteps: [
      'حدد ما إذا كان جواز السفر مفقوداً أم مسروقاً.',
      'إذا كان مسروقاً، ففكر في الاتصال بالشرطة المحلية.',
      'اجمع ما لديك من إثباتات الهوية والسفر.',
      'اعثر على سفارة أو قنصلية تمثل بلد جواز سفرك أو جنسيتك.',
      'اتصل بالمكتب لمعرفة الإجراء الدقيق للاستبدال أو وثيقة الطوارئ.',
      'تحقق من تأثير الفقدان على متابعة السفر.',
      'احمِ وثائق الهوية أو الدفع الأخرى إذا فُقدت في الوقت نفسه.',
    ],
    lostDisclaimer:
      'بلاغ الشرطة ليس إلزامياً دائماً. يجب تأكيد الوثائق والصور والرسوم والمدة وأهلية وثيقة الطوارئ مع الجهة المسؤولة.',
    findEmbassy: 'العثور على مساعدة السفارة',
  },
  zh: {
    title: '使馆与领事协助',
    intro: '使用地点数据查找附近使馆，然后确认代表您护照国家的正确机构和官方办理流程。',
    passportCountry: '护照或国籍国家',
    passportHint: '此选择不会筛选 Geoapify 结果。依赖某机构前，请确认其确实代表您的国家。',
    nearbyTitle: '查找附近使馆',
    locationPrivacy: '您的精确位置仅用于本次搜索，本工具不会保存。',
    useLocation: '使用我的当前位置',
    manualLabel: '或搜索城市或地点',
    manualPlaceholder: '城市、机场或区域',
    searchPlace: '搜索地点',
    choosePlace: '选择此地点',
    sourceNotice: '来源：Geoapify 地点数据。结果并非政府官方核实，可能不完整或已过时。',
    empty: '未找到附近使馆。请查找您护照国家及当前目的地对应的外交部或使馆官方网站。',
    error: '目前无法获取附近外交机构。系统没有编造任何联系方式或办理流程。',
    permissionDenied: '位置不可用或未获授权。您可以手动搜索城市或地点。',
    navigation: '打开路线',
    distance: '距离',
    lostTitle: '护照遗失或被盗',
    lostIntro: '要求会因国籍和所在地而异。请先参考以下一般步骤，再向相关使馆或领事馆确认准确流程。',
    lostSteps: [
      '确认护照是遗失还是被盗。',
      '如被盗，可考虑联系当地警方。',
      '整理仍持有的身份证明和旅行凭证。',
      '查找代表您护照或国籍国家的使馆或领事馆。',
      '联系该机构确认补发或紧急旅行证件的准确流程。',
      '确认遗失对后续行程的影响。',
      '如果其他身份或支付证件同时遗失，请及时保护相关账户和资料。',
    ],
    lostDisclaimer:
      '警方报案并非在所有情况下都强制要求。所需文件、照片、费用、处理时间及紧急证件资格必须向主管机构确认。',
    findEmbassy: '查找使馆帮助',
  },
  ja: {
    title: '大使館・領事支援',
    intro:
      '場所データで近くの大使館を探し、その後、旅券国を担当する正しい在外公館と公式手続きを確認してください。',
    passportCountry: '旅券または国籍の国',
    passportHint:
      'この選択は Geoapify の結果を絞り込みません。利用する前に、その公館が自国を担当していることを確認してください。',
    nearbyTitle: '近くの大使館を探す',
    locationPrivacy: '正確な位置情報はこの検索にのみ使用され、このツールには保存されません。',
    useLocation: '現在地を使用',
    manualLabel: 'または都市・場所を検索',
    manualPlaceholder: '都市、空港、地域',
    searchPlace: '場所を検索',
    choosePlace: 'この場所を選ぶ',
    sourceNotice:
      '出典: Geoapify の場所データ。政府による公式確認ではなく、不完全または古い場合があります。',
    empty:
      '近くの大使館が見つかりませんでした。旅券国と現在地に対応する外務省または大使館の公式サイトを検索してください。',
    error: '近くの外交施設を取得できませんでした。連絡先や手続きは推測していません。',
    permissionDenied:
      '位置情報を利用できないか、許可されませんでした。都市や場所を手動で検索できます。',
    navigation: '経路を開く',
    distance: '距離',
    lostTitle: '旅券の紛失・盗難',
    lostIntro:
      '必要条件は国籍と場所により異なります。以下の一般的な手順を参考にし、正確な手続きは担当の大使館または領事館で確認してください。',
    lostSteps: [
      '旅券が紛失か盗難かを確認します。',
      '盗難の場合は現地警察への連絡を検討します。',
      '手元にある本人確認資料と旅行資料を集めます。',
      '旅券国または国籍国を担当する大使館・領事館を探します。',
      '再発行または緊急文書の正確な手続きをその公館に確認します。',
      '今後の旅行への影響を確認します。',
      '同時に紛失した他の身分証明書や支払手段も保護します。',
    ],
    lostDisclaimer:
      '警察への届出が常に必須とは限りません。必要書類、写真、料金、処理時間、緊急文書の対象条件は担当当局に確認してください。',
    findEmbassy: '大使館の支援を探す',
  },
  ko: {
    title: '대사관 및 영사 지원',
    intro:
      '장소 데이터로 가까운 대사관을 찾은 뒤 여권 국가를 담당하는 올바른 공관과 공식 절차를 확인하세요.',
    passportCountry: '여권 또는 시민권 국가',
    passportHint:
      '이 선택은 Geoapify 결과를 필터링하지 않습니다. 이용하기 전에 해당 시설이 본인 국가를 대표하는지 확인하세요.',
    nearbyTitle: '가까운 대사관 찾기',
    locationPrivacy: '정확한 위치는 이 검색에만 사용되며 이 도구에 저장되지 않습니다.',
    useLocation: '현재 위치 사용',
    manualLabel: '또는 도시나 장소 검색',
    manualPlaceholder: '도시, 공항 또는 지역',
    searchPlace: '장소 검색',
    choosePlace: '이 장소 선택',
    sourceNotice:
      '출처: Geoapify 장소 데이터. 정부의 공식 검증이 아니며 정보가 불완전하거나 오래되었을 수 있습니다.',
    empty:
      '가까운 대사관을 찾지 못했습니다. 여권 국가와 현재 목적지에 해당하는 외교부 또는 대사관 공식 웹사이트를 검색하세요.',
    error: '가까운 외교 시설을 불러오지 못했습니다. 연락처나 절차를 임의로 만들지 않았습니다.',
    permissionDenied:
      '위치를 사용할 수 없거나 허용되지 않았습니다. 도시나 장소를 직접 검색할 수 있습니다.',
    navigation: '길찾기 열기',
    distance: '거리',
    lostTitle: '여권 분실 또는 도난',
    lostIntro:
      '요건은 국적과 위치에 따라 다릅니다. 아래 일반 단계를 참고한 뒤 정확한 절차를 관련 대사관이나 영사관에 확인하세요.',
    lostSteps: [
      '여권이 분실되었는지 도난당했는지 확인합니다.',
      '도난이라면 현지 경찰에 연락하는 것을 고려합니다.',
      '남아 있는 신원 및 여행 증빙을 모읍니다.',
      '여권 또는 시민권 국가를 대표하는 대사관이나 영사관을 찾습니다.',
      '재발급 또는 긴급 문서의 정확한 절차를 해당 공관에 문의합니다.',
      '분실이 이후 여행에 미칠 영향을 확인합니다.',
      '동시에 잃어버린 다른 신분 또는 결제 문서도 보호합니다.',
    ],
    lostDisclaimer:
      '경찰 신고가 항상 의무인 것은 아닙니다. 필요한 문서, 사진, 수수료, 처리 시간 및 긴급 문서 자격은 담당 기관에 확인해야 합니다.',
    findEmbassy: '대사관 지원 찾기',
  },
  hi: {
    title: 'दूतावास और वाणिज्य दूतावास सहायता',
    intro:
      'स्थान डेटा से पास के दूतावास खोजें, फिर अपने पासपोर्ट देश के लिए सही प्रतिनिधित्व और आधिकारिक प्रक्रिया की पुष्टि करें।',
    passportCountry: 'पासपोर्ट या नागरिकता का देश',
    passportHint:
      'यह चयन Geoapify परिणामों को फ़िल्टर नहीं करता। भरोसा करने से पहले पुष्टि करें कि कार्यालय आपके देश का प्रतिनिधित्व करता है।',
    nearbyTitle: 'पास के दूतावास खोजें',
    locationPrivacy:
      'आपका सटीक स्थान केवल इस खोज के लिए उपयोग होता है और यह टूल इसे सेव नहीं करता।',
    useLocation: 'मेरी वर्तमान लोकेशन उपयोग करें',
    manualLabel: 'या शहर अथवा स्थान खोजें',
    manualPlaceholder: 'शहर, हवाई अड्डा या क्षेत्र',
    searchPlace: 'स्थान खोजें',
    choosePlace: 'यह स्थान चुनें',
    sourceNotice:
      'स्रोत: Geoapify स्थान डेटा। ये परिणाम सरकारी आधिकारिक सत्यापन नहीं हैं और अधूरे या पुराने हो सकते हैं।',
    empty:
      'पास में कोई दूतावास नहीं मिला। अपने पासपोर्ट देश और वर्तमान गंतव्य के लिए विदेश मंत्रालय या दूतावास की आधिकारिक वेबसाइट खोजें।',
    error:
      'पास की राजनयिक सुविधाएँ अभी प्राप्त नहीं हो सकीं। कोई संपर्क या प्रक्रिया बनाई नहीं गई।',
    permissionDenied:
      'लोकेशन उपलब्ध नहीं थी या अनुमति नहीं मिली। आप शहर या स्थान को मैन्युअल रूप से खोज सकते हैं।',
    navigation: 'दिशा खोलें',
    distance: 'दूरी',
    lostTitle: 'पासपोर्ट खो गया या चोरी हो गया',
    lostIntro:
      'आवश्यकताएँ राष्ट्रीयता और स्थान के अनुसार बदलती हैं। इन सामान्य चरणों का उपयोग करें और सटीक प्रक्रिया संबंधित दूतावास या वाणिज्य दूतावास से पुष्टि करें।',
    lostSteps: [
      'तय करें कि पासपोर्ट खोया है या चोरी हुआ है।',
      'यदि चोरी हुआ है तो स्थानीय पुलिस से संपर्क करने पर विचार करें।',
      'जो पहचान और यात्रा प्रमाण आपके पास हैं उन्हें इकट्ठा करें।',
      'अपने पासपोर्ट या नागरिकता देश का प्रतिनिधित्व करने वाला दूतावास या वाणिज्य दूतावास खोजें।',
      'बदलाव या आपातकालीन दस्तावेज की सटीक प्रक्रिया के लिए उस कार्यालय से संपर्क करें।',
      'जाँचें कि इसका आगे की यात्रा पर क्या प्रभाव पड़ सकता है।',
      'यदि अन्य पहचान या भुगतान दस्तावेज भी खो गए हों तो उन्हें सुरक्षित करें।',
    ],
    lostDisclaimer:
      'पुलिस रिपोर्ट हमेशा अनिवार्य नहीं होती। आवश्यक दस्तावेज, फोटो, शुल्क, समय और आपात दस्तावेज की पात्रता जिम्मेदार प्राधिकरण से पुष्टि करें।',
    findEmbassy: 'दूतावास सहायता खोजें',
  },
});

export function getConsularAssistanceCopy(locale) {
  return COPY[normalizeLocale(locale)] ?? COPY.en;
}
