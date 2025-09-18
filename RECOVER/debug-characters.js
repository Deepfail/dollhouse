/**
 * Simple debug script to inspect character rendering
 * Run this in your browser console to see what's happening with character display
 */

// Find all character cards on the page
console.log('=== CHARACTER CARD DEBUG ===');

const characterCards = document.querySelectorAll('[data-character-id], .character-card, [role="character"]');
console.log('Total character card elements found:', characterCards.length);

characterCards.forEach((card, index) => {
  console.log(`Card ${index + 1}:`, {
    element: card,
    dataCharacterId: card.getAttribute('data-character-id'),
    textContent: card.textContent?.slice(0, 50),
    className: card.className,
    parent: card.parentElement?.tagName,
    parentClass: card.parentElement?.className
  });
});

// Look for elements with character names
const characterNames = ['Ava', 'Lumi', 'Aria', 'Luna']; // Add your character names here
characterNames.forEach(name => {
  const elements = document.querySelectorAll(`*:contains("${name}")`);
  if (elements.length > 1) {
    console.log(`Found ${elements.length} elements containing "${name}":`, elements);
  }
});

// Check for React keys and duplicate rendering
const allDivs = document.querySelectorAll('div');
const characterDivs = Array.from(allDivs).filter(div => 
  div.textContent?.includes('Chat') && 
  (div.textContent?.includes('bartender') || div.textContent?.includes('stranger'))
);

console.log('Character-related divs:', characterDivs.length);
characterDivs.forEach((div, index) => {
  console.log(`Character div ${index + 1}:`, {
    textContent: div.textContent?.slice(0, 100),
    className: div.className,
    reactKey: div.getAttribute('key'),
    parent: div.parentElement?.className
  });
});

console.log('=== END DEBUG ===');