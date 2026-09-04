import { FeaturePage } from './feature-page.jsx';
import { getRequestLocale } from '../../i18n/request-locale.js';
import { loadMessages } from '../../i18n/messages.js';

/**
 * Honest fallback for scaffolded routes that are intentionally not live yet.
 * Keeping one shared implementation prevents empty Next.js route modules while
 * avoiding fake travel data or fake functionality.
 */
export default async function UnavailablePage() {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);

  return (
    <FeaturePage
      eyebrow={messages.common.unavailable}
      title={messages.common.unavailable}
      description={messages.common.unavailable}
      backLabel={messages.navigation.explore}
    />
  );
}
