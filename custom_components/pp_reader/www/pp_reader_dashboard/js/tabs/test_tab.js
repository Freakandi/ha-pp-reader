export async function renderTestTab() {
  return `
    <div class="card">
      <h2>Test Card</h2>
      <p>Inhalt des Test-Tabs</p>
    </div>
  `;
}

export async function getHeaderContent() {
  return {
    title: 'Test Tab',
    meta: `
      <div>Dies ist ein Test-Tab</div>
    `
  };
}