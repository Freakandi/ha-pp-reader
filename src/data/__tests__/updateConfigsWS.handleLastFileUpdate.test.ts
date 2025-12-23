import test from 'node:test';
import assert from 'node:assert/strict';
import { installDomEnvironment } from '../../__tests__/dom';
import { handleLastFileUpdate } from '../updateConfigsWS';

const MARKUP = `
<!doctype html>
<html>
  <body>
    <div id="root">
      <div class="header-card">
         <div class="meta"></div>
      </div>
      <div class="footer-card">
         <div class="last-file-update"></div>
      </div>
    </div>
  </body>
</html>
`;

void test('handleLastFileUpdate escapes XSS payload', () => {
  const env = installDomEnvironment(MARKUP);

  try {
    const root = env.document.getElementById('root');
    assert.ok(root);

    const maliciousPayload = '<img src=x onerror=alert(1)>';

    // Call the function with malicious payload
    handleLastFileUpdate({ last_file_update: maliciousPayload }, root);

    // Check if the payload was injected as HTML
    const el = root.querySelector('.last-file-update');
    assert.ok(el);

    // Check innerHTML for escaped content.
    // Browsers/JSDOM normalize '&lt;' to '&lt;' in innerHTML string.
    // The actual innerHTML should contain the escaped entities.

    const html = el.innerHTML;

    // It should NOT contain the raw tag
    assert.ok(!html.includes('<img src="x" onerror="alert(1)">'), 'Raw img tag found');
    assert.ok(!html.includes('<img src=x onerror=alert(1)>'), 'Raw img tag found');

    // It SHOULD contain the escaped version
    // Note: escapeHtml uses named entities or hex refs? Let's check src/utils/html.ts
    // Assuming standard &lt; etc.
    assert.ok(html.includes('&lt;img'), 'Escaped img tag not found');

  } finally {
    env.restore();
  }
});
