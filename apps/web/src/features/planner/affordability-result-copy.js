export const AFFORDABILITY_RESULT_LOCALES = Object.freeze([
  'en',
  'sv',
  'es',
  'de',
  'fr',
  'it',
  'pt',
  'nl',
  'no',
  'da',
  'fi',
  'pl',
  'tr',
  'ar',
  'zh',
  'ja',
  'ko',
  'hi',
]);

const COPY = Object.freeze({
  en: {
    statuses: {
      COMFORTABLE: 'Within spendable budget',
      TIGHT: 'Budget range is tight',
      OVER_BUDGET: 'Verified range exceeds budget',
      NOT_EVALUATED: 'Affordability not evaluated',
    },
    summaries: {
      COMFORTABLE:
        'The complete verified cost range fits within the spendable budget after the safety reserve.',
      TIGHT:
        'The complete verified cost range crosses the spendable budget, so the final cost could fit or exceed it.',
      OVER_BUDGET:
        'The complete verified cost range starts above the spendable budget after the safety reserve.',
    },
    totalRange: 'Total verified cost range',
    spendableBudget: 'Spendable budget',
    boundary:
      'Budget fit is a verified cost comparison only. It does not mean this destination is ranked, recommended, available, bookable, or suitable for a specific traveller.',
  },
  sv: {
    statuses: {
      COMFORTABLE: 'Inom disponibel budget',
      TIGHT: 'Budgetintervallet är snävt',
      OVER_BUDGET: 'Verifierat intervall överskrider budgeten',
      NOT_EVALUATED: 'Prisvärdhet inte utvärderad',
    },
    summaries: {
      COMFORTABLE:
        'Det kompletta verifierade kostnadsintervallet ryms inom den disponibla budgeten efter säkerhetsreserven.',
      TIGHT:
        'Det kompletta verifierade kostnadsintervallet korsar den disponibla budgeten, så slutkostnaden kan hamna inom eller över den.',
      OVER_BUDGET:
        'Det kompletta verifierade kostnadsintervallet börjar över den disponibla budgeten efter säkerhetsreserven.',
    },
    totalRange: 'Totalt verifierat kostnadsintervall',
    spendableBudget: 'Disponibel budget',
    boundary:
      'Budgetpassning är endast en verifierad kostnadsjämförelse. Det betyder inte att destinationen är rankad, rekommenderad, tillgänglig, bokningsbar eller lämplig för en viss resenär.',
  },
  es: {
    statuses: {
      COMFORTABLE: 'Dentro del presupuesto disponible',
      TIGHT: 'El rango presupuestario es ajustado',
      OVER_BUDGET: 'El rango verificado supera el presupuesto',
      NOT_EVALUATED: 'Asequibilidad no evaluada',
    },
    summaries: {
      COMFORTABLE:
        'El rango completo de costes verificados cabe dentro del presupuesto disponible después de la reserva de seguridad.',
      TIGHT:
        'El rango completo de costes verificados cruza el presupuesto disponible, por lo que el coste final podría quedar dentro o superarlo.',
      OVER_BUDGET:
        'El rango completo de costes verificados comienza por encima del presupuesto disponible después de la reserva de seguridad.',
    },
    totalRange: 'Rango total de costes verificados',
    spendableBudget: 'Presupuesto disponible',
    boundary:
      'El ajuste al presupuesto es solo una comparación de costes verificados. No significa que el destino esté clasificado, recomendado, disponible, reservable o sea adecuado para una persona concreta.',
  },
  de: {
    statuses: {
      COMFORTABLE: 'Innerhalb des verfügbaren Budgets',
      TIGHT: 'Budgetspanne ist knapp',
      OVER_BUDGET: 'Verifizierte Spanne übersteigt das Budget',
      NOT_EVALUATED: 'Bezahlbarkeit nicht bewertet',
    },
    summaries: {
      COMFORTABLE:
        'Die vollständige verifizierte Kostenspanne liegt nach der Sicherheitsreserve innerhalb des verfügbaren Budgets.',
      TIGHT:
        'Die vollständige verifizierte Kostenspanne überschneidet sich mit dem verfügbaren Budget; die Endkosten können darunter oder darüber liegen.',
      OVER_BUDGET:
        'Die vollständige verifizierte Kostenspanne beginnt nach der Sicherheitsreserve oberhalb des verfügbaren Budgets.',
    },
    totalRange: 'Gesamte verifizierte Kostenspanne',
    spendableBudget: 'Verfügbares Budget',
    boundary:
      'Die Budgetpassung ist nur ein verifizierter Kostenvergleich. Sie bedeutet nicht, dass das Ziel gerankt, empfohlen, verfügbar, buchbar oder für eine bestimmte Person geeignet ist.',
  },
  fr: {
    statuses: {
      COMFORTABLE: 'Dans le budget disponible',
      TIGHT: 'Fourchette budgétaire serrée',
      OVER_BUDGET: 'La fourchette vérifiée dépasse le budget',
      NOT_EVALUATED: 'Abordabilité non évaluée',
    },
    summaries: {
      COMFORTABLE:
        'La fourchette complète des coûts vérifiés tient dans le budget disponible après la réserve de sécurité.',
      TIGHT:
        'La fourchette complète des coûts vérifiés traverse le budget disponible : le coût final peut donc rester dedans ou le dépasser.',
      OVER_BUDGET:
        'La fourchette complète des coûts vérifiés commence au-dessus du budget disponible après la réserve de sécurité.',
    },
    totalRange: 'Fourchette totale des coûts vérifiés',
    spendableBudget: 'Budget disponible',
    boundary:
      'L’ajustement au budget est uniquement une comparaison de coûts vérifiés. Il ne signifie pas que la destination est classée, recommandée, disponible, réservable ou adaptée à un voyageur précis.',
  },
  it: {
    statuses: {
      COMFORTABLE: 'Entro il budget disponibile',
      TIGHT: 'Intervallo di budget ristretto',
      OVER_BUDGET: 'L’intervallo verificato supera il budget',
      NOT_EVALUATED: 'Convenienza non valutata',
    },
    summaries: {
      COMFORTABLE:
        'L’intervallo completo dei costi verificati rientra nel budget disponibile dopo la riserva di sicurezza.',
      TIGHT:
        'L’intervallo completo dei costi verificati attraversa il budget disponibile, quindi il costo finale potrebbe rientrare o superarlo.',
      OVER_BUDGET:
        'L’intervallo completo dei costi verificati parte sopra il budget disponibile dopo la riserva di sicurezza.',
    },
    totalRange: 'Intervallo totale dei costi verificati',
    spendableBudget: 'Budget disponibile',
    boundary:
      'L’adattamento al budget è solo un confronto di costi verificati. Non significa che la destinazione sia classificata, consigliata, disponibile, prenotabile o adatta a una persona specifica.',
  },
  pt: {
    statuses: {
      COMFORTABLE: 'Dentro do orçamento disponível',
      TIGHT: 'Faixa de orçamento apertada',
      OVER_BUDGET: 'A faixa verificada excede o orçamento',
      NOT_EVALUATED: 'Acessibilidade não avaliada',
    },
    summaries: {
      COMFORTABLE:
        'A faixa completa de custos verificados cabe no orçamento disponível após a reserva de segurança.',
      TIGHT:
        'A faixa completa de custos verificados cruza o orçamento disponível, portanto o custo final pode caber ou excedê-lo.',
      OVER_BUDGET:
        'A faixa completa de custos verificados começa acima do orçamento disponível após a reserva de segurança.',
    },
    totalRange: 'Faixa total de custos verificados',
    spendableBudget: 'Orçamento disponível',
    boundary:
      'O ajuste ao orçamento é apenas uma comparação de custos verificados. Não significa que o destino seja classificado, recomendado, disponível, reservável ou adequado a um viajante específico.',
  },
  nl: {
    statuses: {
      COMFORTABLE: 'Binnen het besteedbare budget',
      TIGHT: 'Budgetbereik is krap',
      OVER_BUDGET: 'Geverifieerd bereik overschrijdt budget',
      NOT_EVALUATED: 'Betaalbaarheid niet beoordeeld',
    },
    summaries: {
      COMFORTABLE:
        'Het volledige geverifieerde kostenbereik past binnen het besteedbare budget na de veiligheidsreserve.',
      TIGHT:
        'Het volledige geverifieerde kostenbereik kruist het besteedbare budget, waardoor de uiteindelijke kosten erbinnen of erboven kunnen vallen.',
      OVER_BUDGET:
        'Het volledige geverifieerde kostenbereik begint boven het besteedbare budget na de veiligheidsreserve.',
    },
    totalRange: 'Totaal geverifieerd kostenbereik',
    spendableBudget: 'Besteedbaar budget',
    boundary:
      'Budgetpassing is alleen een geverifieerde kostenvergelijking. Het betekent niet dat de bestemming gerangschikt, aanbevolen, beschikbaar, boekbaar of geschikt voor een specifieke reiziger is.',
  },
  no: {
    statuses: {
      COMFORTABLE: 'Innenfor disponibelt budsjett',
      TIGHT: 'Budsjettområdet er stramt',
      OVER_BUDGET: 'Verifisert område overstiger budsjettet',
      NOT_EVALUATED: 'Rimelighet ikke vurdert',
    },
    summaries: {
      COMFORTABLE:
        'Det komplette verifiserte kostnadsområdet holder seg innenfor disponibelt budsjett etter sikkerhetsreserven.',
      TIGHT:
        'Det komplette verifiserte kostnadsområdet krysser disponibelt budsjett, så sluttkostnaden kan være innenfor eller over.',
      OVER_BUDGET:
        'Det komplette verifiserte kostnadsområdet starter over disponibelt budsjett etter sikkerhetsreserven.',
    },
    totalRange: 'Totalt verifisert kostnadsområde',
    spendableBudget: 'Disponibelt budsjett',
    boundary:
      'Budsjettilpasning er kun en verifisert kostnadssammenligning. Det betyr ikke at reisemålet er rangert, anbefalt, tilgjengelig, bestillbart eller egnet for en bestemt reisende.',
  },
  da: {
    statuses: {
      COMFORTABLE: 'Inden for disponibelt budget',
      TIGHT: 'Budgetintervallet er stramt',
      OVER_BUDGET: 'Verificeret interval overstiger budgettet',
      NOT_EVALUATED: 'Prisniveau ikke vurderet',
    },
    summaries: {
      COMFORTABLE:
        'Det komplette verificerede omkostningsinterval ligger inden for det disponible budget efter sikkerhedsreserven.',
      TIGHT:
        'Det komplette verificerede omkostningsinterval krydser det disponible budget, så slutprisen kan ligge inden for eller over.',
      OVER_BUDGET:
        'Det komplette verificerede omkostningsinterval starter over det disponible budget efter sikkerhedsreserven.',
    },
    totalRange: 'Samlet verificeret omkostningsinterval',
    spendableBudget: 'Disponibelt budget',
    boundary:
      'Budgettilpasning er kun en verificeret omkostningssammenligning. Det betyder ikke, at destinationen er rangeret, anbefalet, tilgængelig, bookbar eller egnet til en bestemt rejsende.',
  },
  fi: {
    statuses: {
      COMFORTABLE: 'Käytettävissä olevan budjetin sisällä',
      TIGHT: 'Budjettiväli on tiukka',
      OVER_BUDGET: 'Vahvistettu vaihteluväli ylittää budjetin',
      NOT_EVALUATED: 'Edullisuutta ei arvioitu',
    },
    summaries: {
      COMFORTABLE:
        'Täydellinen vahvistettu kustannusväli mahtuu käytettävissä olevaan budjettiin turvavaran jälkeen.',
      TIGHT:
        'Täydellinen vahvistettu kustannusväli ylittää käytettävissä olevan budjetin rajan, joten lopullinen kustannus voi mahtua budjettiin tai ylittää sen.',
      OVER_BUDGET:
        'Täydellinen vahvistettu kustannusväli alkaa käytettävissä olevan budjetin yläpuolelta turvavaran jälkeen.',
    },
    totalRange: 'Vahvistettu kokonaiskustannusväli',
    spendableBudget: 'Käytettävissä oleva budjetti',
    boundary:
      'Budjettiin sopivuus on vain vahvistettujen kustannusten vertailu. Se ei tarkoita, että kohde olisi järjestetty, suositeltu, saatavilla, varattavissa tai sopiva tietylle matkailijalle.',
  },
  pl: {
    statuses: {
      COMFORTABLE: 'W ramach dostępnego budżetu',
      TIGHT: 'Przedział budżetu jest napięty',
      OVER_BUDGET: 'Zweryfikowany zakres przekracza budżet',
      NOT_EVALUATED: 'Przystępność cenowa nieoceniona',
    },
    summaries: {
      COMFORTABLE:
        'Pełny zweryfikowany zakres kosztów mieści się w dostępnym budżecie po odjęciu rezerwy bezpieczeństwa.',
      TIGHT:
        'Pełny zweryfikowany zakres kosztów przecina dostępny budżet, więc koszt końcowy może się zmieścić lub go przekroczyć.',
      OVER_BUDGET:
        'Pełny zweryfikowany zakres kosztów zaczyna się powyżej dostępnego budżetu po odjęciu rezerwy bezpieczeństwa.',
    },
    totalRange: 'Łączny zweryfikowany zakres kosztów',
    spendableBudget: 'Dostępny budżet',
    boundary:
      'Dopasowanie do budżetu jest wyłącznie porównaniem zweryfikowanych kosztów. Nie oznacza rankingu, rekomendacji, dostępności, możliwości rezerwacji ani dopasowania do konkretnego podróżnego.',
  },
  tr: {
    statuses: {
      COMFORTABLE: 'Harcanabilir bütçe içinde',
      TIGHT: 'Bütçe aralığı dar',
      OVER_BUDGET: 'Doğrulanmış aralık bütçeyi aşıyor',
      NOT_EVALUATED: 'Uygunluk değerlendirilmedi',
    },
    summaries: {
      COMFORTABLE:
        'Eksiksiz doğrulanmış maliyet aralığı güvenlik payından sonra harcanabilir bütçenin içinde kalıyor.',
      TIGHT:
        'Eksiksiz doğrulanmış maliyet aralığı harcanabilir bütçe sınırını kesiyor; nihai maliyet bütçe içinde kalabilir veya aşabilir.',
      OVER_BUDGET:
        'Eksiksiz doğrulanmış maliyet aralığı güvenlik payından sonra harcanabilir bütçenin üzerinde başlıyor.',
    },
    totalRange: 'Toplam doğrulanmış maliyet aralığı',
    spendableBudget: 'Harcanabilir bütçe',
    boundary:
      'Bütçe uyumu yalnızca doğrulanmış bir maliyet karşılaştırmasıdır. Hedefin sıralandığı, önerildiği, müsait, rezerve edilebilir veya belirli bir gezgin için uygun olduğu anlamına gelmez.',
  },
  ar: {
    statuses: {
      COMFORTABLE: 'ضمن الميزانية القابلة للإنفاق',
      TIGHT: 'نطاق الميزانية ضيق',
      OVER_BUDGET: 'النطاق المتحقق يتجاوز الميزانية',
      NOT_EVALUATED: 'لم يتم تقييم الملاءمة للميزانية',
    },
    summaries: {
      COMFORTABLE:
        'يقع نطاق التكلفة المتحقق الكامل ضمن الميزانية القابلة للإنفاق بعد احتياطي الأمان.',
      TIGHT:
        'يتقاطع نطاق التكلفة المتحقق الكامل مع حد الميزانية القابلة للإنفاق، لذلك قد تقع التكلفة النهائية ضمنها أو تتجاوزها.',
      OVER_BUDGET:
        'يبدأ نطاق التكلفة المتحقق الكامل فوق الميزانية القابلة للإنفاق بعد احتياطي الأمان.',
    },
    totalRange: 'إجمالي نطاق التكلفة المتحقق',
    spendableBudget: 'الميزانية القابلة للإنفاق',
    boundary:
      'ملاءمة الميزانية هي مقارنة موثقة للتكلفة فقط. ولا تعني أن الوجهة مرتبة أو موصى بها أو متاحة أو قابلة للحجز أو مناسبة لمسافر بعينه.',
  },
  zh: {
    statuses: {
      COMFORTABLE: '在可支配预算内',
      TIGHT: '预算区间较紧',
      OVER_BUDGET: '已验证区间超出预算',
      NOT_EVALUATED: '尚未评估可负担性',
    },
    summaries: {
      COMFORTABLE: '完整的已验证费用区间在扣除安全预留后仍处于可支配预算内。',
      TIGHT: '完整的已验证费用区间跨越可支配预算，因此最终费用可能在预算内，也可能超出。',
      OVER_BUDGET: '完整的已验证费用区间起点已高于扣除安全预留后的可支配预算。',
    },
    totalRange: '已验证总费用区间',
    spendableBudget: '可支配预算',
    boundary:
      '预算匹配只是经过验证的费用比较，并不表示该目的地已排名、被推荐、可用、可预订或适合某位特定旅行者。',
  },
  ja: {
    statuses: {
      COMFORTABLE: '利用可能予算内',
      TIGHT: '予算範囲が厳しい',
      OVER_BUDGET: '検証済み範囲が予算超過',
      NOT_EVALUATED: '予算適合性は未評価',
    },
    summaries: {
      COMFORTABLE: '完全な検証済み費用範囲は、安全予備費を除いた利用可能予算内に収まっています。',
      TIGHT:
        '完全な検証済み費用範囲が利用可能予算をまたいでいるため、最終費用は予算内にも予算超過にもなり得ます。',
      OVER_BUDGET:
        '完全な検証済み費用範囲の下限が、安全予備費を除いた利用可能予算を上回っています。',
    },
    totalRange: '検証済み総費用範囲',
    spendableBudget: '利用可能予算',
    boundary:
      '予算適合性は検証済み費用の比較にすぎません。目的地の順位、推奨、空き状況、予約可能性、特定の旅行者への適合性を意味しません。',
  },
  ko: {
    statuses: {
      COMFORTABLE: '사용 가능 예산 이내',
      TIGHT: '예산 범위가 빠듯함',
      OVER_BUDGET: '검증된 범위가 예산 초과',
      NOT_EVALUATED: '예산 적합성 미평가',
    },
    summaries: {
      COMFORTABLE: '완전한 검증 비용 범위가 안전 예비비를 제외한 사용 가능 예산 안에 있습니다.',
      TIGHT:
        '완전한 검증 비용 범위가 사용 가능 예산 경계를 넘으므로 최종 비용이 예산 안이거나 초과할 수 있습니다.',
      OVER_BUDGET:
        '완전한 검증 비용 범위의 하한이 안전 예비비를 제외한 사용 가능 예산보다 높습니다.',
    },
    totalRange: '총 검증 비용 범위',
    spendableBudget: '사용 가능 예산',
    boundary:
      '예산 적합성은 검증된 비용 비교일 뿐입니다. 목적지의 순위, 추천, 이용 가능 여부, 예약 가능 여부 또는 특정 여행자에게 적합함을 의미하지 않습니다.',
  },
  hi: {
    statuses: {
      COMFORTABLE: 'खर्च योग्य बजट के भीतर',
      TIGHT: 'बजट सीमा तंग है',
      OVER_BUDGET: 'सत्यापित सीमा बजट से अधिक है',
      NOT_EVALUATED: 'वहनीयता का मूल्यांकन नहीं हुआ',
    },
    summaries: {
      COMFORTABLE: 'पूरी सत्यापित लागत सीमा सुरक्षा रिज़र्व के बाद खर्च योग्य बजट के भीतर है।',
      TIGHT:
        'पूरी सत्यापित लागत सीमा खर्च योग्य बजट की सीमा को पार करती है, इसलिए अंतिम लागत बजट में भी रह सकती है या उससे अधिक भी हो सकती है।',
      OVER_BUDGET:
        'पूरी सत्यापित लागत सीमा सुरक्षा रिज़र्व के बाद खर्च योग्य बजट से ऊपर शुरू होती है।',
    },
    totalRange: 'कुल सत्यापित लागत सीमा',
    spendableBudget: 'खर्च योग्य बजट',
    boundary:
      'बजट फिट केवल सत्यापित लागत की तुलना है। इसका अर्थ यह नहीं कि गंतव्य रैंक किया गया, सुझाया गया, उपलब्ध, बुक करने योग्य या किसी विशेष यात्री के लिए उपयुक्त है।',
  },
});

export function getAffordabilityResultCopy(locale) {
  return COPY[locale] ?? COPY.en;
}
