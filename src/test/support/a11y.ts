/**
 * Strips `<script>`/`<link>` tags from rendered HTML so jsdom does not try to
 * fetch the bundled assets (which would log cross-origin noise and leave open
 * handles). Removing them does not affect the accessibility of the markup.
 */
export function stripAssets(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<link\b[^>]*>/gi, '');
}

/**
 * axe run options for our pages. The GOV.UK back link is rendered in
 * `beforeContent`, which sits outside `<main>` by design; axe's best-practice
 * "region" rule flags that even though it is not a WCAG A/AA failure. We assert
 * WCAG conformance, so the region best-practice rule is disabled.
 */
export const axeOptions = {
  rules: {
    region: { enabled: false },
  },
};
