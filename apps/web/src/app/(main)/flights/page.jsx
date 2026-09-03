import { FeaturePage } from '../../../components/common/feature-page.jsx';
import { getRequestLocale } from '../../../i18n/request-locale.js';
import { loadMessages } from '../../../i18n/messages.js';

export default async function Page() {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);

  return (
    <FeaturePage
      eyebrow={messages.navigation.flights}
      title={messages.navigation.flights}
      description={messages.common.unavailable}
      backLabel={messages.navigation.explore}
    />
  );
}
