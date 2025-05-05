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

  // Navigation sofort hinzufügen
  addNavigation(root);
}

function addNavigation(root) {
  // Die erste Header-Card im Tab-Inhalt finden
  const headerCard = root.querySelector('.header-card');
  if (headerCard) {
    console.log("Header-Card gefunden:", headerCard);
    
    // Den h1-Titel finden
    const titleElement = headerCard.querySelector('h1');
    
    // Wrapper für Navigation erstellen
    const titleNavWrapper = document.createElement('div');
    titleNavWrapper.className = 'title-navigation-wrapper';
    
    // Navigations-Buttons
    const leftArrow = document.createElement('div');
    leftArrow.className = `swipe-arrow left ${currentPage > 0 ? '' : 'disabled'}`;
    leftArrow.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
    
    const rightArrow = document.createElement('div');
    rightArrow.className = `swipe-arrow right ${currentPage < tabs.length - 1 ? '' : 'disabled'}`;
    rightArrow.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';
    
    // Verarbeite den Titel und baue den Wrapper
    if (titleElement) {
      // Titel aus Header-Card entfernen
      titleElement.remove();
      
      // Wrapper zusammenbauen
      titleNavWrapper.appendChild(leftArrow);
      titleNavWrapper.appendChild(titleElement);
      titleNavWrapper.appendChild(rightArrow);
      
      // Wrapper als erstes Element einfügen
      headerCard.insertBefore(titleNavWrapper, headerCard.firstChild);
    } else {
      // Falls kein Titel vorhanden ist, erstellen wir einen Default-Titel
      const defaultTitle = document.createElement('h1');
      defaultTitle.textContent = tabs[currentPage].title || "Tab " + (currentPage + 1);
      
      titleNavWrapper.appendChild(leftArrow);
      titleNavWrapper.appendChild(defaultTitle);
      titleNavWrapper.appendChild(rightArrow);
      
      headerCard.insertBefore(titleNavWrapper, headerCard.firstChild);
    }
    
    // Event-Handler für Links/Rechts-Navigation
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
    
    // Swipe-Events für die ganze Header-Card
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
    
    // Dot-Navigation nach der Header-Card
    const dotNav = document.createElement('div');
    dotNav.className = 'dot-navigation';
    dotNav.innerHTML = tabs.map((tab, index) => `
      <span class="nav-dot ${index === currentPage ? 'active' : ''}" data-index="${index}"></span>
    `).join('');
    
    headerCard.parentNode.insertBefore(dotNav, headerCard.nextSibling);
    
    // Event-Listener für Dots
    dotNav.querySelectorAll('.nav-dot').forEach(dot => {
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