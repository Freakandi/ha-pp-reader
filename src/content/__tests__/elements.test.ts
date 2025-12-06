import assert from 'node:assert/strict';
import test from 'node:test';

import { formatValue } from '../elements';

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
