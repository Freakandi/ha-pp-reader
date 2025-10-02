import { JSDOM } from 'jsdom';
import path from 'node:path';

const dom = new JSDOM(`
  <div class="portfolio-table">
    <table>
      <tbody></tbody>
    </table>
  </div>
`, { url: 'http://localhost' });

const { window } = dom;
const { document } = window;

global.window = window;
global.document = document;
global.navigator = window.navigator;
global.CustomEvent = window.CustomEvent;

const modulePath = path.resolve('custom_components/pp_reader/www/pp_reader_dashboard/js/data/updateConfigsWS.js');
const { handlePortfolioUpdate } = await import(`file://${modulePath}`);

const tbody = document.querySelector('.portfolio-table table tbody');

const row = document.createElement('tr');
row.className = 'portfolio-row';
row.dataset.portfolio = 'portfolio-1';
row.dataset.positionCount = '0';
row.dataset.currentValue = '0';
row.dataset.purchaseSum = '0';
row.dataset.gainAbs = '0';
row.dataset.gainPct = '0';
row.innerHTML = `
  <td>
    <button type="button" class="portfolio-toggle" data-portfolio="portfolio-1">
      <span class="caret">▶</span>
      <span class="portfolio-name">Test Portfolio</span>
    </button>
  </td>
  <td class="align-right">0</td>
  <td class="align-right"><span class="positive">0,00\u00A0€</span></td>
  <td class="align-right"><span class="positive">0,00\u00A0€</span></td>
  <td class="align-right"><span class="positive">0,00\u00A0%</span></td>
`;
tbody.appendChild(row);

const footer = document.createElement('tr');
footer.className = 'footer-row';
footer.innerHTML = `
  <td>Summe</td>
  <td class="align-right">0</td>
  <td class="align-right"><span class="positive">0,00\u00A0€</span></td>
  <td class="align-right"><span class="positive">0,00\u00A0€</span></td>
  <td class="align-right"><span class="positive">0,00\u00A0%</span></td>
`;
tbody.appendChild(footer);

const updatePayload = [
  {
    uuid: 'portfolio-1',
    position_count: 2,
    current_value: 1500,
    purchase_sum: 0
  }
];

handlePortfolioUpdate(updatePayload, document);

const updatedRow = document.querySelector('tr.portfolio-row');
const updatedGain = updatedRow.cells[3].textContent.trim();
const updatedFooterGain = document.querySelector('tr.footer-row').cells[3].textContent.trim();

console.log(JSON.stringify({
  rowGain: updatedGain,
  footerGain: updatedFooterGain
}));
