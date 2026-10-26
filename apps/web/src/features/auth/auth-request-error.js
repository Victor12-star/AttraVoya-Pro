/** Map transport failures to safe actionable UI feedback without exposing account details. */
export function authRequestErrorMessage(error, { generic, unavailable, throttled }) {
  if (error?.status === 429) return throttled;
  if (!error?.status || error.status >= 500 || error.status === 404) return unavailable;
  return generic;
}
