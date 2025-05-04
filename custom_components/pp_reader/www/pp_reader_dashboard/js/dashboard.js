import { addSwipeEvents, goToTab } from './interaction/tab_control.js';
import { renderDashboard } from './tabs/overview.js';
import { renderTestTab } from './tabs/test_tab.js'; // Importiere den Test-Tab

const tabs = [
  {
    title: 'Dashboard',
    index: 0,
    render: renderDashboard
  },
  {
    title: 'Test Tab',
    index: 1,
    render: renderTestTab
  }
];

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

async function renderTab() {
  const tab = tabs[currentPage];
  let content = renderHeaderCard(tab);
  content += await tab.render();

  const root = document.querySelector("pp-reader-dashboard");
  root.innerHTML = content;

  const swipeCard = root.querySelector('.swipe-card');
  addSwipeEvents(
    swipeCard,
    () => { // onSwipeLeft
      if (currentPage < tabs.length - 1) {
        currentPage++;
        renderTab();
      }
    },
    () => { // onSwipeRight
      if (currentPage > 0) {
        currentPage--;
        renderTab();
      }
    }
  );

  swipeCard.querySelector('.swipe-arrow.left:not(.disabled)')?.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      renderTab();
    }
  });

  swipeCard.querySelector('.swipe-arrow.right:not(.disabled)')?.addEventListener('click', () => {
    if (currentPage < tabs.length - 1) {
      currentPage++;
      renderTab();
    }
  });
}

customElements.define('pp-reader-dashboard', class extends HTMLElement {
  connectedCallback() {
    renderTab();
  }
});