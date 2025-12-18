import assert from 'node:assert/strict';
import test from 'node:test';

import { formatValue, createInlineSpinner } from '../elements';

test('createInlineSpinner returns an SVG string', () => {
  const result = createInlineSpinner();
  assert.ok(result.includes('<svg'), 'Should contain an svg tag');
  assert.ok(result.includes('spinner-icon'), 'Should contain spinner-icon class');
  assert.ok(result.includes('width: 1em'), 'Should use 1em width for inline use');
});

test('formatValue keeps HTML markup intact for name cells', () => {
  const markup =
    '<span class="name-with-badges account-name"><span class="account-name__label">Haspa Giro</span><span class="meta-badge meta-badge--neutral" title="Quelle: Cache">Quelle: Cache</span></span>';

  const result = formatValue('name', markup);

  assert.strictEqual(
    result,
    markup,
    'name markup should not be truncated or escaped',
  );
});
