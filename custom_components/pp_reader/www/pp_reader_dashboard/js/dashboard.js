import { addSwipeEvents, goToTab } from './interaction/tab_control.js';
import { createThemeToggle } from './interaction/themeToggle.js';
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

  // DOM vollständig laden lassen und dann Navigation hinzufügen
  setTimeout(() => {
    addNavigation(root);
  }, 10);
}

function addNavigation(root) {
  // Die erste Header-Card im Tab-Inhalt finden
  const headerCard = root.querySelector('.header-card');
  if (headerCard) {
    console.log("Header-Card gefunden:", headerCard);
    
    // Den h1-Titel finden
    const titleElement = headerCard.querySelector('h1');
    if (titleElement) {
      // Einen Wrapper für den Titel und die Pfeile erstellen
      const titleWrapper = document.createElement('div');
      titleWrapper.className = 'title-navigation-wrapper';
      
      // Navigations-Pfeile erstellen
      const leftArrow = document.createElement('div');
      leftArrow.className = `swipe-arrow left ${currentPage > 0 ? '' : 'disabled'}`;
      leftArrow.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
      
      const rightArrow = document.createElement('div');
      rightArrow.className = `swipe-arrow right ${currentPage < tabs.length - 1 ? '' : 'disabled'}`;
      rightArrow.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';
      
      // Titel aus Header-Card entfernen
      const originalTitle = titleElement.cloneNode(true);
      titleElement.remove();
      
      // Elemente im Wrapper anordnen
      titleWrapper.appendChild(leftArrow);
      titleWrapper.appendChild(originalTitle);
      titleWrapper.appendChild(rightArrow);
      
      // Wrapper als erstes Element in die Header-Card einfügen
      headerCard.insertBefore(titleWrapper, headerCard.firstChild);
    
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
    
    // Dot-Navigation nach der Header-Card einfügen
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

    console.log("Navigation wurde hinzugefügt");
  } else {
    console.error("Header-Card nicht gefunden!");
  }
}

createThemeToggle();

customElements.define('pp-reader-dashboard', class extends HTMLElement {
  connectedCallback() {
    renderTab();
  }
});