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

function renderDotNavigation() {
  return `
    <div class="dot-navigation">
      ${tabs.map((tab, index) => `
        <span class="nav-dot ${index === currentPage ? 'active' : ''}" data-index="${index}"></span>
      `).join('')}
    </div>
  `;
}

async function renderTab() {
  const tab = tabs[currentPage];
  
  // Tab-Inhalt rendern (ohne Header-Card von dashboard.js)
  let content = await tab.render();
  
  // Punkt-Navigation nach dem Inhalt einfügen
  // Der Tab-Inhalt sollte eine Header-Card enthalten, die wir später ansprechen können
  content += renderDotNavigation();

  const root = document.querySelector("pp-reader-dashboard");
  root.innerHTML = content;

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

  // Die erste Header-Card im Tab-Inhalt finden und Swipe-Funktionalität hinzufügen
  const headerCard = root.querySelector('.header-card');
  if (headerCard) {
    // Navigations-Pfeile hinzufügen
    const leftArrow = document.createElement('span');
    leftArrow.className = `swipe-arrow left ${currentPage > 0 ? '' : 'disabled'}`;
    leftArrow.innerHTML = '&lt;';
    
    const rightArrow = document.createElement('span');
    rightArrow.className = `swipe-arrow right ${currentPage < tabs.length - 1 ? '' : 'disabled'}`;
    rightArrow.innerHTML = '&gt;';
    
    // Pfeile an den Anfang und das Ende der Header-Card einfügen
    headerCard.insertBefore(leftArrow, headerCard.firstChild);
    headerCard.appendChild(rightArrow);
    
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
}

customElements.define('pp-reader-dashboard', class extends HTMLElement {
  connectedCallback() {
    renderTab();
  }
});