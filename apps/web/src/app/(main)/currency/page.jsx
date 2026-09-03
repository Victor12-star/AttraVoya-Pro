import { FeaturePage } from '../../../components/common/feature-page.jsx';
import { getRequestLocale } from '../../../i18n/request-locale.js';
import { loadMessages } from '../../../i18n/messages.js';

export default async function Page() {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);

  return (
    <FeaturePage
      eyebrow={messages.common.chooseCurrency}
      title={messages.common.chooseCurrency}
      description={messages.home.budgetDescription}
      backLabel={messages.navigation.explore}
    />
  );
}
