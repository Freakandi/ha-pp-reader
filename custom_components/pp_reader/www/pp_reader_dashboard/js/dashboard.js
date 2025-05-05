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

async function renderTab() {
  const tab = tabs[currentPage];
  
  // Tab-Inhalt rendern
  let content = await tab.render();
  
  const root = document.querySelector("pp-reader-dashboard");
  root.innerHTML = content;

  // Die erste Header-Card im Tab-Inhalt finden und Navigation hinzufügen
  const headerCard = root.querySelector('.header-card');
  if (headerCard) {
    // Navigations-Pfeile hinzufügen - als erstes Element in die Karte
    const leftArrow = document.createElement('div');
    leftArrow.className = `swipe-arrow left ${currentPage > 0 ? '' : 'disabled'}`;
    headerCard.insertBefore(leftArrow, headerCard.firstChild);
    
    const rightArrow = document.createElement('div');
    rightArrow.className = `swipe-arrow right ${currentPage < tabs.length - 1 ? '' : 'disabled'}`;
    headerCard.appendChild(rightArrow);
    
    // Dot-Navigation nach der Header-Card einfügen, nicht innerhalb
    const dotNav = document.createElement('div');
    dotNav.className = 'dot-navigation';
    dotNav.innerHTML = tabs.map((tab, index) => `
      <span class="nav-dot ${index === currentPage ? 'active' : ''}" data-index="${index}"></span>
    `).join('');
    
    headerCard.parentNode.insertBefore(dotNav, headerCard.nextSibling);
    
    // Swipe-Events hinzufügen
    addSwipeEvents(
      headerCard,
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

    // Click-Events für Pfeile
    leftArrow.addEventListener('click', () => {
      if (currentPage > 0) {
        currentPage--;
        renderTab();
      }
    });

    rightArrow.addEventListener('click', () => {
      if (currentPage < tabs.length - 1) {
        currentPage++;
        renderTab();
      }
    });
  }
  
  // Event-Listener für die Punkt-Navigation
  root.querySelectorAll('.nav-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const index = parseInt(dot.getAttribute('data-index'), 10);
      if (index !== currentPage) {
        currentPage = index;
        renderTab();
      }
    });
  });
}

// Die renderDotNavigation Funktion kann entfernt werden, da sie nicht mehr benötigt wird

customElements.define('pp-reader-dashboard', class extends HTMLElement {
  connectedCallback() {
    renderTab();
  }
});