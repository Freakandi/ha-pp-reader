import { addSwipeEvents, goToTab } from './interaction/tab_control.js';
import { createThemeToggle } from './interaction/themeToggle.js';
import { renderDashboard } from './tabs/overview.js';
import { renderTestTab } from './tabs/test_tab.js';

const tabs = [
  { title: 'Dashboard', render: renderDashboard },
  { title: 'Test Tab', render: renderTestTab }
];

let currentPage = 0;

async function renderTab() {
  const tab = tabs[currentPage];
  
  // Tab-Inhalt rendern
  let content = await tab.render();
  
  const root = document.querySelector("pp-reader-dashboard");
  root.innerHTML = content;

  // Erst aufrufen, wenn DOM vollständig geladen ist
  setTimeout(() => setupNavigation(), 0);
}

function setupNavigation() {
  const headerCard = document.querySelector('.header-card');
  if (!headerCard) {
    console.error("Header-Card nicht gefunden!");
    return;
  }

  // Originalinhalt speichern und Meta-Informationen ermitteln
  const originalContent = headerCard.innerHTML;
  const originalTitle = headerCard.querySelector('h1')?.textContent || tabs[currentPage].title;
  const metaDiv = headerCard.querySelector('.meta');
  
  // Header-Card leeren
  headerCard.innerHTML = '';

  // Header-Navigation Container erstellen
  const navHeader = document.createElement('div');
  navHeader.className = 'header-nav';

  // Linker Pfeil
  const leftArrow = document.createElement('button');
  leftArrow.className = `nav-arrow left ${currentPage <= 0 ? 'disabled' : ''}`;
  leftArrow.innerHTML = '<svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
  leftArrow.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      renderTab();
    }
  });

  // Titel neu erstellen
  const title = document.createElement('h1');
  title.textContent = originalTitle;

  // Rechter Pfeil
  const rightArrow = document.createElement('button');
  rightArrow.className = `nav-arrow right ${currentPage >= tabs.length - 1 ? 'disabled' : ''}`;
  rightArrow.innerHTML = '<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';
  rightArrow.addEventListener('click', () => {
    if (currentPage < tabs.length - 1) {
      currentPage++;
      renderTab();
    }
  });

  // Navigation zusammenbauen
  navHeader.appendChild(leftArrow);
  navHeader.appendChild(title);
  navHeader.appendChild(rightArrow);
  headerCard.appendChild(navHeader);
  
  // Meta-Div neu hinzufügen, falls vorhanden
  if (metaDiv) {
    headerCard.appendChild(metaDiv);
  }

  // Content-Container für Meta-Informationen erstellen
  const contentContainer = document.createElement('div');
  contentContainer.className = 'header-content';
  contentContainer.innerHTML = originalContent;

  // Alles außer <h1> entfernen (Titel haben wir schon verarbeitet)
  const h1Element = contentContainer.querySelector('h1');
  if (h1Element) h1Element.remove();

  headerCard.appendChild(contentContainer);
  
  // ----- DOT-NAVIGATION -----
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
  
  // ----- SWIPE-FUNKTIONALITÄT -----
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

  // Debug-Information
  console.log("Navigation eingerichtet:", {
    headerCard: headerCard,
    navigationElements: headerCard.querySelectorAll('.nav-arrow'),
    title: headerCard.querySelector('h1')
  });

  // Inline-Styles für Debug erzwingen
  const titleElement = headerCard.querySelector('h1');
  if (titleElement) {
    titleElement.style.textAlign = 'center';
    titleElement.style.width = '100%';
    titleElement.style.color = 'red'; // Temporär zur Überprüfung
  }

  const leftArrowElement = headerCard.querySelector('.nav-arrow.left');
  if (leftArrowElement) {
    leftArrowElement.style.backgroundColor = 'blue'; // Temporär zur Überprüfung
  }
}

createThemeToggle();

customElements.define('pp-reader-dashboard', class extends HTMLElement {
  connectedCallback() {
    renderTab();
  }
});