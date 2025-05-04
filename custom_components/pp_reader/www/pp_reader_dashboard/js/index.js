import { mainTab } from '../tabs/mainTab.js';
import { testTab } from '../tabs/testTab.js';
import { addSwipeEvents } from './swipe.js';

const tabs = [mainTab, testTab].sort((a, b) => a.index - b.index);
let currentPage = 0;

function renderHeaderCard(tab) {
  const leftArrow = currentPage > 0
    ? `<span class="swipe-arrow left">&lt;</span>`
    : `<span class="swipe-arrow left disabled">&lt;</span>`;
  const rightArrow = currentPage < tabs.length - 1
    ? `<span class="swipe-arrow right">&gt;</span>`
    : `<span class="swipe-arrow right disabled">&gt;</span>`;
  return `
    <div class="card header-card swipe-card">
      ${leftArrow}
      <h1>${tab.title}</h1>
      ${rightArrow}
    </div>
  `;
}

async function renderDashboard() {
  // Beispiel: Daten können hier geladen und an Tabs übergeben werden
  // const data = await fetchData();

  const tab = tabs[currentPage];
  let content = renderHeaderCard(tab);
  content += tab.render({ /* data */ });

  const root = document.querySelector("pp-reader-dashboard");
  root.innerHTML = content;

  // Swipe- und Pfeil-Events
  const swipeCard = root.querySelector('.swipe-card');
  addSwipeEvents(
    swipeCard,
    () => { // onSwipeLeft
      if (currentPage < tabs.length - 1) {
        currentPage++;
        renderDashboard();
      }
    },
    () => { // onSwipeRight
      if (currentPage > 0) {
        currentPage--;
        renderDashboard();
      }
    }
  );

  // Pfeil-Buttons
  swipeCard.querySelector('.swipe-arrow.left:not(.disabled)')?.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      renderDashboard();
    }
  });
  swipeCard.querySelector('.swipe-arrow.right:not(.disabled)')?.addEventListener('click', () => {
    if (currentPage < tabs.length - 1) {
      currentPage++;
      renderDashboard();
    }
  });
}

customElements.define('pp-reader-dashboard', class extends HTMLElement {
  connectedCallback() {
    renderDashboard();
  }
});