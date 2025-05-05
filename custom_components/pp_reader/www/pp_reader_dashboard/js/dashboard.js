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
  
  // Position als wichtigste Eigenschaft zuerst setzen (für sticky)
  headerCard.setAttribute('style', 'position: sticky !important; top: 0 !important; z-index: 100 !important;');
  
  // Erweitern wir die Styles
  headerCard.style.boxSizing = 'border-box';
  headerCard.style.backgroundColor = 'var(--card-background-color, white)';
  headerCard.style.padding = '16px';
  
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
      <h1 id="headerTitle" style="margin: 0; text-align: center; flex-grow: 1; font-size: 1.5rem;">${originalTitle}</h1>
      <button id="nav-right" style="width: 36px; height: 36px; border-radius: 50%; background-color: ${currentPage >= tabs.length - 1 ? 'rgba(204, 204, 204, 0.9)' : 'rgba(85, 85, 85, 0.9)'}; border: none; display: flex; align-items: center; justify-content: center;"${currentPage >= tabs.length - 1 ? ' disabled="disabled"' : ''}>
        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </button>
    </div>
  `;
  
  // Meta-Container erstellen
  const metaContainer = document.createElement('div');
  metaContainer.id = 'metaContainer';
  metaContainer.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
  
  if (metaDiv) {
    metaContainer.appendChild(metaDiv);
    headerCard.appendChild(metaContainer);
  }

  // Event-Listener
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
  
  // Verbinde mit erfolgreichem Verkleinerungscode
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
}

// Funktion mit dem erfolgreichen Verkleinerungscode
function setupScrollBehavior() {
  const headerCard = document.querySelector('.header-card');
  const headerTitle = document.getElementById('headerTitle');
  const metaContainer = document.getElementById('metaContainer');
  
  if (!headerCard || !headerTitle) return;
  
  const initialPaddingTop = parseInt(getComputedStyle(headerCard).paddingTop || '16');
  const initialPaddingBottom = parseInt(getComputedStyle(headerCard).paddingBottom || '16');
  const initialTitleSize = parseInt(getComputedStyle(headerTitle).fontSize || '24');
  
  let lastScrollTop = 0;
  let ticking = false;

  const onScroll = () => {
    // In einem iFrame ist window.scrollY möglicherweise nicht zuverlässig
    // Daher verwenden wir document.documentElement oder document.body
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop || 0;
    
    // Mindestens 20px scrollen, bevor die Änderung aktiviert wird
    if (scrollTop > 20) {
      // Header verkleinern
      headerCard.style.padding = `${Math.max(8, initialPaddingTop/2)}px ${initialPaddingTop}px`;
      headerCard.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      headerTitle.style.fontSize = `${initialTitleSize * 0.85}px`;
      
      // Meta-Container ausblenden
      if (metaContainer) {
        metaContainer.style.maxHeight = '0';
        metaContainer.style.opacity = '0';
        setTimeout(() => {
          metaContainer.style.display = 'none';
        }, 300);
      }
      
    } else {
      // Header wieder vergrößern
      headerCard.style.padding = `${initialPaddingTop}px ${initialPaddingTop}px`;
      headerCard.style.boxShadow = 'none';
      headerTitle.style.fontSize = `${initialTitleSize}px`;
      
      // Meta-Container wieder einblenden
      if (metaContainer) {
        metaContainer.style.display = 'block';
        // Kurze Verzögerung für bessere Animation
        setTimeout(() => {
          metaContainer.style.maxHeight = '200px';
          metaContainer.style.opacity = '1';
        }, 10);
      }
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
  
  // Debug-Ausgaben
  console.log("ScrollBehavior eingerichtet:", {
    headerCard: headerCard,
    headerPositions: {
      position: getComputedStyle(headerCard).position,
      top: getComputedStyle(headerCard).top,
      zIndex: getComputedStyle(headerCard).zIndex
    },
    initialValues: {
      paddingTop: initialPaddingTop,
      paddingBottom: initialPaddingBottom,
      titleSize: initialTitleSize
    }
  });
}

// iFrame-kompatible Scrollbehandlung
function setupIframeCompatibility() {
  // Dashboard-Container mit Inline-Styles versehen
  const dashboardElement = document.querySelector('pp-reader-dashboard');
  if (dashboardElement) {
    dashboardElement.style.position = 'relative';
    dashboardElement.style.display = 'block';
    dashboardElement.style.maxHeight = '100vh';
    dashboardElement.style.overflowY = 'auto';
    dashboardElement.style.overflowX = 'hidden';
  }
  
  // Body- und HTML-Styles für bessere iFrame-Integration
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.overflowX = 'hidden';
  document.documentElement.style.overflowX = 'hidden';
}

createThemeToggle();

customElements.define('pp-reader-dashboard', class extends HTMLElement {
  connectedCallback() {
    renderTab();
  }
});

// Nach der Definition aufrufen
setupIframeCompatibility();