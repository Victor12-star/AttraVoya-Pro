import { FeaturePage } from '../../../components/common/feature-page.jsx';
import { getRequestLocale } from '../../../i18n/request-locale.js';
import { loadMessages } from '../../../i18n/messages.js';

export default async function Page() {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);

  return (
    <FeaturePage
      eyebrow={messages.navigation.thingsToDo}
      title={messages.navigation.thingsToDo}
      description={messages.home.local}
      backLabel={messages.navigation.explore}
    />
  );
}
