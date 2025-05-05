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
  setTimeout(() => {
    setupNavigation();
  }, 0);
}

function setupNavigation() {
  const headerCard = document.querySelector('.header-card');
  if (!headerCard) {
    console.error("Header-Card nicht gefunden!");
    return;
  }

  // Originalinhalt speichern und Meta-Informationen ermitteln
  const originalTitle = headerCard.querySelector('h1')?.textContent || tabs[currentPage].title;
  const metaDiv = headerCard.querySelector('.meta');
  
  // Header-Card leeren
  headerCard.innerHTML = '';

  // Inline-HTML für Navigation mit reinem HTML und inline-Styles
  headerCard.innerHTML = `
    <div style="display: flex; width: 100%; align-items: center; justify-content: space-between;">
      <button id="nav-left" style="width: 36px; height: 36px; border-radius: 50%; background-color: ${currentPage <= 0 ? 'rgba(204, 204, 204, 0.9)' : 'rgba(85, 85, 85, 0.9)'}; border: none; display: flex; align-items: center; justify-content: center;"${currentPage <= 0 ? ' disabled="disabled"' : ''}>
        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
      </button>
      <h1 id="headerTitle" style="margin: 0; text-align: center; flex-grow: 1; font-size: 1.5rem; transition: font-size 0.3s ease;">${originalTitle}</h1>
      <button id="nav-right" style="width: 36px; height: 36px; border-radius: 50%; background-color: ${currentPage >= tabs.length - 1 ? 'rgba(204, 204, 204, 0.9)' : 'rgba(85, 85, 85, 0.9)'}; border: none; display: flex; align-items: center; justify-content: center;"${currentPage >= tabs.length - 1 ? ' disabled="disabled"' : ''}>
        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </button>
    </div>
  `;
  
  // Meta-Div direkt hinzufügen, wenn vorhanden
  if (metaDiv) {
    headerCard.appendChild(metaDiv);
  }

  // Event-Listener direkt hinzufügen
  document.getElementById('nav-left')?.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      renderTab();
    }
  });

  document.getElementById('nav-right')?.addEventListener('click', () => {
    if (currentPage < tabs.length - 1) {
      currentPage++;
      renderTab();
    }
  });
  
  // Scroll-Verhalten hinzufügen
  setupScrollBehavior();
  
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
}

// Funktion für das Scroll-Verhalten
function setupScrollBehavior() {
  const headerCard = document.querySelector('.header-card');
  const headerTitle = document.getElementById('headerTitle');
  if (!headerCard || !headerTitle) return;
  
  const initialPaddingTop = parseInt(getComputedStyle(headerCard).paddingTop);
  const initialPaddingBottom = parseInt(getComputedStyle(headerCard).paddingBottom);
  const initialTitleSize = parseInt(getComputedStyle(headerTitle).fontSize);
  
  let lastScrollTop = 0;
  let ticking = false;

  const onScroll = () => {
    // In einem iFrame ist window.scrollY möglicherweise nicht zuverlässig
    // Daher verwenden wir document.documentElement oder document.body
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop || 0;
    
    // Mindestens 20px scrollen, bevor die Änderung aktiviert wird
    if (scrollTop > 20) {
      headerCard.classList.add('sticky');
      headerTitle.style.fontSize = (initialTitleSize * 0.85) + 'px'; // Kleinerer Titel
    } else {
      headerCard.classList.remove('sticky');
      headerTitle.style.fontSize = initialTitleSize + 'px';
    }
    
    lastScrollTop = scrollTop;
    ticking = false;
  };

  // Event-Listener für scroll-Ereignis
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  });
  
  // Initialer Check, falls die Seite bereits gescrollt ist
  onScroll();
}

createThemeToggle();

customElements.define('pp-reader-dashboard', class extends HTMLElement {
  connectedCallback() {
    renderTab();
  }
});