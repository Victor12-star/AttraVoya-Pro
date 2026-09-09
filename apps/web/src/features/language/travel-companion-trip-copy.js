import { normalizeLocale } from '@attravoya/localization';

const COPY = Object.freeze({
  en: {
    tripSelector: 'Your trip',
    chooseTrip: 'Choose a saved trip',
    activeTrip: 'Current trip',
    plannedTrip: 'Upcoming trip',
    tripApplied: 'Current destination selected from {trip}. You can change it manually.',
    unavailable:
      'Saved trip context is unavailable right now. Manual destination selection still works.',
  },
  sv: {
    tripSelector: 'Din resa',
    chooseTrip: 'Välj en sparad resa',
    activeTrip: 'Pågående resa',
    plannedTrip: 'Kommande resa',
    tripApplied: 'Nuvarande destination valdes från {trip}. Du kan ändra den manuellt.',
    unavailable:
      'Sparad reseinformation är inte tillgänglig just nu. Manuellt destinationsval fungerar fortfarande.',
  },
  es: {
    tripSelector: 'Tu viaje',
    chooseTrip: 'Elige un viaje guardado',
    activeTrip: 'Viaje actual',
    plannedTrip: 'Próximo viaje',
    tripApplied: 'El destino actual se seleccionó desde {trip}. Puedes cambiarlo manualmente.',
    unavailable:
      'El contexto del viaje guardado no está disponible ahora. La selección manual sigue funcionando.',
  },
  fr: {
    tripSelector: 'Votre voyage',
    chooseTrip: 'Choisir un voyage enregistré',
    activeTrip: 'Voyage en cours',
    plannedTrip: 'Voyage à venir',
    tripApplied:
      'La destination actuelle a été sélectionnée depuis {trip}. Vous pouvez la modifier manuellement.',
    unavailable:
      'Le contexte du voyage enregistré est indisponible pour le moment. La sélection manuelle reste disponible.',
  },
  de: {
    tripSelector: 'Deine Reise',
    chooseTrip: 'Gespeicherte Reise wählen',
    activeTrip: 'Aktuelle Reise',
    plannedTrip: 'Kommende Reise',
    tripApplied: 'Das aktuelle Reiseziel wurde aus {trip} gewählt. Du kannst es manuell ändern.',
    unavailable:
      'Gespeicherter Reisekontext ist derzeit nicht verfügbar. Die manuelle Zielauswahl funktioniert weiterhin.',
  },
  it: {
    tripSelector: 'Il tuo viaggio',
    chooseTrip: 'Scegli un viaggio salvato',
    activeTrip: 'Viaggio attuale',
    plannedTrip: 'Prossimo viaggio',
    tripApplied:
      'La destinazione attuale è stata selezionata da {trip}. Puoi cambiarla manualmente.',
    unavailable:
      'Il contesto del viaggio salvato non è disponibile al momento. La selezione manuale funziona comunque.',
  },
  pt: {
    tripSelector: 'A sua viagem',
    chooseTrip: 'Escolher uma viagem guardada',
    activeTrip: 'Viagem atual',
    plannedTrip: 'Próxima viagem',
    tripApplied: 'O destino atual foi selecionado a partir de {trip}. Pode alterá-lo manualmente.',
    unavailable:
      'O contexto da viagem guardada não está disponível agora. A seleção manual continua disponível.',
  },
  pl: {
    tripSelector: 'Twoja podróż',
    chooseTrip: 'Wybierz zapisaną podróż',
    activeTrip: 'Bieżąca podróż',
    plannedTrip: 'Nadchodząca podróż',
    tripApplied: 'Bieżący cel wybrano z {trip}. Możesz zmienić go ręcznie.',
    unavailable:
      'Kontekst zapisanej podróży jest teraz niedostępny. Ręczny wybór celu nadal działa.',
  },
  nl: {
    tripSelector: 'Je reis',
    chooseTrip: 'Kies een opgeslagen reis',
    activeTrip: 'Huidige reis',
    plannedTrip: 'Aankomende reis',
    tripApplied: 'De huidige bestemming is gekozen uit {trip}. Je kunt deze handmatig wijzigen.',
    unavailable:
      'Opgeslagen reiscontext is nu niet beschikbaar. Handmatige bestemmingskeuze blijft werken.',
  },
  no: {
    tripSelector: 'Reisen din',
    chooseTrip: 'Velg en lagret reise',
    activeTrip: 'Nåværende reise',
    plannedTrip: 'Kommende reise',
    tripApplied: 'Gjeldende reisemål ble valgt fra {trip}. Du kan endre det manuelt.',
    unavailable:
      'Lagret reisekontekst er ikke tilgjengelig nå. Manuelt valg av reisemål fungerer fortsatt.',
  },
  da: {
    tripSelector: 'Din rejse',
    chooseTrip: 'Vælg en gemt rejse',
    activeTrip: 'Aktuel rejse',
    plannedTrip: 'Kommende rejse',
    tripApplied: 'Den aktuelle destination blev valgt fra {trip}. Du kan ændre den manuelt.',
    unavailable:
      'Gemt rejsekontekst er ikke tilgængelig lige nu. Manuelt destinationsvalg virker stadig.',
  },
  fi: {
    tripSelector: 'Matkasi',
    chooseTrip: 'Valitse tallennettu matka',
    activeTrip: 'Nykyinen matka',
    plannedTrip: 'Tuleva matka',
    tripApplied: 'Nykyinen kohde valittiin matkasta {trip}. Voit muuttaa sitä käsin.',
    unavailable:
      'Tallennetun matkan tiedot eivät ole nyt käytettävissä. Kohteen voi silti valita käsin.',
  },
  tr: {
    tripSelector: 'Seyahatiniz',
    chooseTrip: 'Kayıtlı bir seyahat seçin',
    activeTrip: 'Mevcut seyahat',
    plannedTrip: 'Yaklaşan seyahat',
    tripApplied: 'Geçerli varış noktası {trip} seyahatinden seçildi. Elle değiştirebilirsiniz.',
    unavailable:
      'Kayıtlı seyahat bağlamı şu anda kullanılamıyor. Varış noktasını elle seçebilirsiniz.',
  },
  ar: {
    tripSelector: 'رحلتك',
    chooseTrip: 'اختر رحلة محفوظة',
    activeTrip: 'الرحلة الحالية',
    plannedTrip: 'الرحلة القادمة',
    tripApplied: 'تم اختيار الوجهة الحالية من {trip}. يمكنك تغييرها يدويًا.',
    unavailable: 'سياق الرحلة المحفوظة غير متاح الآن. لا يزال بإمكانك اختيار الوجهة يدويًا.',
  },
  zh: {
    tripSelector: '你的行程',
    chooseTrip: '选择已保存的行程',
    activeTrip: '当前行程',
    plannedTrip: '即将开始的行程',
    tripApplied: '当前目的地已根据 {trip} 选择。你仍可手动更改。',
    unavailable: '暂时无法读取已保存的行程信息。你仍可手动选择目的地。',
  },
  ja: {
    tripSelector: 'あなたの旅行',
    chooseTrip: '保存済みの旅行を選択',
    activeTrip: '現在の旅行',
    plannedTrip: '今後の旅行',
    tripApplied: '現在の目的地は {trip} から選択されました。手動で変更できます。',
    unavailable: '保存済みの旅行情報は現在利用できません。目的地は手動で選択できます。',
  },
  ko: {
    tripSelector: '내 여행',
    chooseTrip: '저장된 여행 선택',
    activeTrip: '현재 여행',
    plannedTrip: '예정된 여행',
    tripApplied: '현재 목적지가 {trip}에서 선택되었습니다. 직접 변경할 수 있습니다.',
    unavailable: '저장된 여행 정보를 지금 사용할 수 없습니다. 목적지는 직접 선택할 수 있습니다.',
  },
  hi: {
    tripSelector: 'आपकी यात्रा',
    chooseTrip: 'सेव की गई यात्रा चुनें',
    activeTrip: 'वर्तमान यात्रा',
    plannedTrip: 'आगामी यात्रा',
    tripApplied: 'वर्तमान गंतव्य {trip} से चुना गया है। आप इसे मैन्युअल रूप से बदल सकते हैं।',
    unavailable:
      'सेव की गई यात्रा की जानकारी अभी उपलब्ध नहीं है। मैन्युअल गंतव्य चयन अभी भी काम करता है।',
  },
});

export function getTravelCompanionTripCopy(locale) {
  return COPY[normalizeLocale(locale)] ?? COPY.en;
}

export function formatTravelCompanionTripCopy(template, tripTitle) {
  return String(template).replace('{trip}', String(tripTitle));
}
