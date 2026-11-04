// Experimental adapter: configuration and session storage are supplied by the caller.
// Never put a Supabase secret/service-role key in a browser.
export function createTransport({url, publishableKey, storage, sessionKey, fetchImpl = fetch, now = Date.now}) {
  let authFlight = null;
  const endpoint = url.replace(/\/$/, '');
  async function request(path, body, token) {
    const headers = {'content-type':'application/json', apikey:publishableKey};
    if (token) headers.authorization = 'Bearer ' + token;
    const response = await fetchImpl(endpoint + path, {method:'POST', headers, body:JSON.stringify(body)});
    if (!response.ok) throw new Error('Supabase request failed (' + response.status + ')');
    return response.json();
  }
  function readSession() {
    const raw = storage.getItem(sessionKey);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session.access_token || !session.refresh_token || !Number.isFinite(session.expires_at)) {
      throw new Error('Invalid saved authentication session');
    }
    return session;
  }
  async function authenticate() {
    if (authFlight) return authFlight;
    authFlight = (async () => {
      let session = readSession();
      if (session && session.expires_at * 1000 > now() + 60000) return session;
      // Never silently replace a failed existing identity with a new anonymous user.
      session = session
        ? await request('/auth/v1/token?grant_type=refresh_token', {refresh_token:session.refresh_token})
        : await request('/auth/v1/signup', {});
      if (!Number.isFinite(session.expires_at) && Number.isFinite(session.expires_in)) {
        session.expires_at = Math.floor(now() / 1000) + session.expires_in;
      }
      if (!session.access_token || !session.refresh_token || !Number.isFinite(session.expires_at)) {
        throw new Error('Invalid authentication response');
      }
      storage.setItem(sessionKey, JSON.stringify(session));
      return session;
    })();
    try { return await authFlight; } finally { authFlight = null; }
  }
  return async function send(batch) {
    const session = await authenticate();
    return request('/rest/v1/rpc/nt_sync_batch', {items:batch}, session.access_token);
  };
}
