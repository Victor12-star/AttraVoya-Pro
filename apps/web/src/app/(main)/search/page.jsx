import { FeaturePage } from '../../../components/common/feature-page.jsx';
import { getRequestLocale } from '../../../i18n/request-locale.js';
import { loadMessages } from '../../../i18n/messages.js';

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);
  const query = typeof params?.q === 'string' ? params.q.slice(0, 120) : '';

  return (
    <FeaturePage
      eyebrow={messages.common.search}
      title={query || messages.search.destinationQuestion}
      description={messages.common.unavailable}
      backLabel={messages.navigation.explore}
    >
      {query ? (
        <div className="query-summary">
          <strong>{messages.common.search}:</strong> {query}
        </div>
      ) : null}
    </FeaturePage>
  );
}
