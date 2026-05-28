import request from 'supertest';

export type Agent = ReturnType<typeof request.agent>;

/**
 * GETs a page with the given agent (so the CSRF cookie is retained) and returns
 * the `_csrf` token rendered into its form. POST tests then send this token with
 * the same agent so csurf accepts the request.
 */
export async function csrfToken(agent: Agent, path: string): Promise<string> {
  const res = await agent.get(path);
  const match = /name="_csrf"[^>]*value="([^"]+)"/.exec(res.text);
  if (!match) {
    throw new Error(`No CSRF token found on ${path}`);
  }
  return match[1];
}
