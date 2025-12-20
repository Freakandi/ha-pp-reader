import assert from 'node:assert/strict';
import test from 'node:test';
import { formatValue } from '../elements';

test('formatValue security bypass check', async (t) => {
  await t.test('blocks input tag (vulnerability)', () => {
    // Input without event handlers should bypass the current 'onX' check
    // but SHOULD be blocked because inputs are dangerous in content.
    const malicious = '<input type="text" value="Phishing">';
    const result = formatValue('name', malicious);

    assert.ok(!result.includes('<input'), 'Should NOT contain raw input tag');
    assert.ok(result.includes('&lt;input'), 'Should be escaped');
  });

  await t.test('blocks img tag (vulnerability)', () => {
    // Img without onerror should bypass current check
    const malicious = '<img src="http://evil.com/track">';
    const result = formatValue('name', malicious);
    assert.ok(!result.includes('<img'), 'Should NOT contain raw img tag');
  });

  await t.test('blocks button tag (vulnerability)', () => {
    const malicious = '<button>Click me</button>';
    const result = formatValue('name', malicious);
    assert.ok(!result.includes('<button'), 'Should NOT contain raw button tag');
    assert.ok(result.includes('&lt;button'), 'Should be escaped');
  });

  await t.test('blocks details tag (vulnerability)', () => {
     const malicious = '<details><summary>Click me</summary>Hidden</details>';
     const result = formatValue('name', malicious);
     assert.ok(!result.includes('<details'), 'Should NOT contain raw details tag');
     assert.ok(result.includes('&lt;details'), 'Should be escaped');
  });
});
