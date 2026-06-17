// ==========================================================================
// Global State
// ==========================================================================
let allNotes = [];
let filteredNotes = [];
let activeFilter = 'all';
let searchQuery = '';
let selectedNoteForTweet = null;
let selectedBlockText = '';

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialise Lucide Icons
    lucide.createIcons();
    
    // Fetch data
    fetchReleaseNotes();
    
    // Event Listeners
    document.getElementById('refresh-btn').addEventListener('click', () => fetchReleaseNotes(true));
    document.getElementById('retry-btn').addEventListener('click', () => fetchReleaseNotes(true));
    
    // Search input
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        applyFilterAndSearch();
    });
    
    // Filter click handlers
    const filterItems = document.querySelectorAll('.filter-item');
    filterItems.forEach(item => {
        item.addEventListener('click', () => {
            filterItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            activeFilter = item.getAttribute('data-filter');
            applyFilterAndSearch();
        });
    });
    
    // Modal Event Listeners
    document.getElementById('close-modal-btn').addEventListener('click', hideTweetModal);
    document.getElementById('tweet-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('tweet-modal')) {
            hideTweetModal();
        }
    });
    
    // Textarea input
    const textarea = document.getElementById('tweet-textarea');
    textarea.addEventListener('input', updateCharCount);
    
    // Post button
    document.getElementById('publish-tweet-btn').addEventListener('click', publishTweet);
});

// ==========================================================================
// Fetching Data
// ==========================================================================
function fetchReleaseNotes(forceRefresh = false) {
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = refreshBtn.querySelector('.icon-refresh');
    
    // UI Loading state
    refreshBtn.disabled = true;
    if (refreshIcon) refreshIcon.classList.add('spinning');
    
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const notesContainer = document.getElementById('notes-container');
    const emptyState = document.getElementById('empty-state');
    
    if (allNotes.length === 0) {
        loadingState.classList.remove('hidden');
        notesContainer.classList.add('hidden');
    }
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
    
    let url = '/api/release-notes';
    if (forceRefresh) {
        url += '?refresh=true';
    }
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            allNotes = processNotes(data.notes || []);
            updateLastUpdated(data.last_fetched);
            updateFilterCounts();
            applyFilterAndSearch();
        })
        .catch(err => {
            console.error('Error fetching release notes:', err);
            document.getElementById('error-message').textContent = err.message || 'Could not retrieve release notes feed.';
            errorState.classList.remove('hidden');
            notesContainer.classList.add('hidden');
            loadingState.classList.add('hidden');
        })
        .finally(() => {
            refreshBtn.disabled = false;
            if (refreshIcon) refreshIcon.classList.remove('spinning');
            loadingState.classList.add('hidden');
        });
}

// ==========================================================================
// Processing Data
// ==========================================================================
function processNotes(notes) {
    const parser = new DOMParser();
    
    return notes.map(note => {
        // Parse the HTML content to extract types of updates
        const doc = parser.parseFromString(`<div>${note.content}</div>`, 'text/html');
        const h3Elements = doc.querySelectorAll('h3');
        const categories = new Set();
        
        h3Elements.forEach(h3 => {
            const txt = h3.textContent.toLowerCase().trim();
            if (txt.includes('feature')) {
                categories.add('feature');
                h3.classList.add('feature-title');
            } else if (txt.includes('announcement')) {
                categories.add('announcement');
                h3.classList.add('announcement-title');
            } else if (txt.includes('deprecation')) {
                categories.add('deprecation');
                h3.classList.add('deprecation-title');
            } else if (txt.includes('fix') || txt.includes('change') || txt.includes('bug')) {
                categories.add('fix');
                h3.classList.add('fix-title');
            } else {
                categories.add('fix'); // default fallback category
                h3.classList.add('fix-title');
            }
        });
        
        // If there were no H3 headers, default to 'fix'
        if (categories.size === 0) {
            categories.add('fix');
        }
        
        // Return structured note object
        return {
            ...note,
            categories: Array.from(categories),
            processedContent: doc.querySelector('div').innerHTML
        };
    });
}

function updateLastUpdated(isoString) {
    if (!isoString) {
        document.getElementById('last-updated-text').textContent = 'Just updated';
        return;
    }
    
    const date = new Date(isoString);
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const timeStr = date.toLocaleTimeString(undefined, options);
    document.getElementById('last-updated-text').textContent = `Updated at ${timeStr}`;
}

// ==========================================================================
// Filter and Counts
// ==========================================================================
function updateFilterCounts() {
    const counts = {
        all: allNotes.length,
        feature: 0,
        announcement: 0,
        deprecation: 0,
        fix: 0
    };
    
    allNotes.forEach(note => {
        note.categories.forEach(cat => {
            if (counts.hasOwnProperty(cat)) {
                counts[cat]++;
            }
        });
    });
    
    document.getElementById('count-all').textContent = counts.all;
    document.getElementById('count-feature').textContent = counts.feature;
    document.getElementById('count-announcement').textContent = counts.announcement;
    document.getElementById('count-deprecation').textContent = counts.deprecation;
    document.getElementById('count-fix').textContent = counts.fix;
}

function applyFilterAndSearch() {
    filteredNotes = allNotes.filter(note => {
        // Filter by category
        const matchesFilter = activeFilter === 'all' || note.categories.includes(activeFilter);
        
        // Filter by search query
        const matchesSearch = !searchQuery || 
            note.title.toLowerCase().includes(searchQuery) || 
            note.content.toLowerCase().includes(searchQuery);
            
        return matchesFilter && matchesSearch;
    });
    
    renderNotes();
}

// ==========================================================================
// Rendering Card Lists
// ==========================================================================
function renderNotes() {
    const notesContainer = document.getElementById('notes-container');
    const emptyState = document.getElementById('empty-state');
    
    notesContainer.innerHTML = '';
    
    if (filteredNotes.length === 0) {
        notesContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    notesContainer.classList.remove('hidden');
    
    filteredNotes.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.id = `note-${note.id.split('#')[1] || note.title.replace(/\s+/g, '_')}`;
        
        // Tags markup
        const tagsMarkup = note.categories.map(cat => {
            return `<span class="tag bg-${cat}">${cat}</span>`;
        }).join('');
        
        card.innerHTML = `
            <div class="note-card-header">
                <div class="note-date-area">
                    <i data-lucide="calendar" class="calendar-icon"></i>
                    <span class="note-date">${note.title}</span>
                </div>
                <div class="note-tags">
                    ${tagsMarkup}
                </div>
            </div>
            
            <div class="note-card-body">
                ${note.processedContent}
            </div>
            
            <div class="note-card-actions">
                <a href="${note.link}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" title="View official GCloud release note link">
                    <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
                    <span>Source</span>
                </a>
                <button class="btn btn-primary btn-sm btn-tweet-trigger" data-id="${note.id}">
                    <i data-lucide="twitter" style="width: 14px; height: 14px; fill: white;"></i>
                    <span>Tweet this</span>
                </button>
            </div>
        `;
        
        notesContainer.appendChild(card);
    });
    
    // Re-trigger Lucide icon replacement for dynamic elements
    lucide.createIcons();
    
    // Add event listeners to Tweet buttons
    document.querySelectorAll('.btn-tweet-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const noteId = btn.getAttribute('data-id');
            const note = allNotes.find(n => n.id === noteId);
            if (note) {
                showTweetModal(note);
            }
        });
    });
}

// ==========================================================================
// Tweet Modal & Selection Logic
// ==========================================================================
function showTweetModal(note) {
    selectedNoteForTweet = note;
    const modal = document.getElementById('tweet-modal');
    const canvas = document.getElementById('tweet-selector-canvas');
    const textarea = document.getElementById('tweet-textarea');
    
    // Reset selection and text
    selectedBlockText = '';
    canvas.innerHTML = '';
    
    // Parse the HTML content to create selectable paragraphs
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${note.content}</div>`, 'text/html');
    
    // We want to chunk the HTML into logical update blocks:
    // Every h3 can pair with the following block or list, or each paragraph/list item is a block.
    // Let's iterate through child nodes and group them cleanly.
    const children = Array.from(doc.querySelector('div').childNodes);
    let currentBlock = null;
    let blockIndex = 0;
    
    children.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            
            if (tagName === 'h3') {
                // If there's an active block, append it before starting new
                if (currentBlock) {
                    canvas.appendChild(currentBlock);
                }
                currentBlock = createSelectableBlock(node.textContent + ': ', blockIndex++);
            } else if (tagName === 'p') {
                if (currentBlock) {
                    currentBlock.querySelector('.block-text').textContent += node.textContent;
                    currentBlock.setAttribute('data-fulltext', currentBlock.querySelector('.block-text').textContent);
                } else {
                    currentBlock = createSelectableBlock(node.textContent, blockIndex++);
                    canvas.appendChild(currentBlock);
                    currentBlock = null;
                }
            } else if (tagName === 'ul' || tagName === 'ol') {
                // For lists, we append the header if any, then make each list item a selectable block
                if (currentBlock) {
                    canvas.appendChild(currentBlock);
                    currentBlock = null;
                }
                
                const listItems = node.querySelectorAll('li');
                listItems.forEach(li => {
                    const liBlock = createSelectableBlock(`• ${li.textContent}`, blockIndex++);
                    canvas.appendChild(liBlock);
                });
            }
        }
    });
    
    // Append last block if any
    if (currentBlock) {
        canvas.appendChild(currentBlock);
    }
    
    // If the canvas is empty (no parsed blocks), just insert the text content
    if (canvas.children.length === 0) {
        const fallbackBlock = createSelectableBlock(doc.querySelector('div').textContent.trim(), 0);
        canvas.appendChild(fallbackBlock);
    }
    
    // Select the first block by default
    const firstBlock = canvas.querySelector('.selectable-block');
    if (firstBlock) {
        firstBlock.classList.add('selected');
        selectedBlockText = firstBlock.getAttribute('data-fulltext');
    } else {
        selectedBlockText = note.title;
    }
    
    // Populate textarea with default draft: Category tag + Selected Update text + Link
    generateDefaultTweetDraft();
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Lock background scroll
    
    // Initialise counter
    updateCharCount();
}

function createSelectableBlock(text, index) {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const div = document.createElement('div');
    div.className = 'selectable-block';
    div.setAttribute('data-index', index);
    div.setAttribute('data-fulltext', cleanText);
    div.innerHTML = `<span class="block-text">${cleanText}</span>`;
    
    div.addEventListener('click', () => {
        // Toggle selection
        document.querySelectorAll('.selectable-block').forEach(b => b.classList.remove('selected'));
        div.classList.add('selected');
        
        selectedBlockText = cleanText;
        generateDefaultTweetDraft();
        updateCharCount();
    });
    
    return div;
}

function generateDefaultTweetDraft() {
    const textarea = document.getElementById('tweet-textarea');
    let categoryEmoji = '🚀';
    
    // Select emoji based on categories
    if (selectedNoteForTweet.categories.includes('feature')) {
        categoryEmoji = '✨';
    } else if (selectedNoteForTweet.categories.includes('announcement')) {
        categoryEmoji = '📢';
    } else if (selectedNoteForTweet.categories.includes('deprecation')) {
        categoryEmoji = '⚠️';
    } else if (selectedNoteForTweet.categories.includes('fix')) {
        categoryEmoji = '🛠️';
    }
    
    // Format text: Emoji + Category + text + link
    const textPart = selectedBlockText.length > 180 ? selectedBlockText.slice(0, 180) + '...' : selectedBlockText;
    
    // We clean up starting colons from headings if needed
    let cleanText = textPart;
    if (cleanText.startsWith('Feature:')) cleanText = cleanText.replace(/^Feature:\s*/i, '');
    if (cleanText.startsWith('Announcement:')) cleanText = cleanText.replace(/^Announcement:\s*/i, '');
    if (cleanText.startsWith('Deprecation:')) cleanText = cleanText.replace(/^Deprecation:\s*/i, '');
    if (cleanText.startsWith('Fix:')) cleanText = cleanText.replace(/^Fix:\s*/i, '');
    if (cleanText.startsWith('Change:')) cleanText = cleanText.replace(/^Change:\s*/i, '');
    
    const categoryName = selectedNoteForTweet.categories[0].toUpperCase();
    
    textarea.value = `${categoryEmoji} BigQuery #${categoryName}:\n"${cleanText}"\n\nRead more: ${selectedNoteForTweet.link}`;
}

function hideTweetModal() {
    const modal = document.getElementById('tweet-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = ''; // Restore background scroll
    selectedNoteForTweet = null;
}

function updateCharCount() {
    const textarea = document.getElementById('tweet-textarea');
    const counterText = document.getElementById('char-count-text');
    const circle = document.getElementById('progress-circle');
    const publishBtn = document.getElementById('publish-tweet-btn');
    
    const len = textarea.value.length;
    const maxLen = 280;
    const remaining = maxLen - len;
    
    counterText.textContent = remaining;
    
    // Progress circle calculation
    // Circumference = 2 * PI * r = 2 * 3.14159 * 10 = 62.83 (use 63 for calculations)
    const circumference = 63;
    const progress = Math.min(len / maxLen, 1);
    const offset = circumference - (progress * circumference);
    
    circle.style.strokeDashoffset = offset;
    
    // Colour styling based on limit
    if (remaining < 0) {
        counterText.style.color = '#f87171'; // Red
        circle.style.stroke = '#f87171';
        publishBtn.disabled = true;
        publishBtn.style.opacity = 0.5;
    } else if (remaining <= 20) {
        counterText.style.color = '#fbbf24'; // Orange/Amber
        circle.style.stroke = '#fbbf24';
        publishBtn.disabled = false;
        publishBtn.style.opacity = 1;
    } else {
        counterText.style.color = 'var(--color-text-secondary)';
        circle.style.stroke = 'var(--color-accent)';
        publishBtn.disabled = false;
        publishBtn.style.opacity = 1;
    }
}

function publishTweet() {
    const textarea = document.getElementById('tweet-textarea');
    const tweetText = textarea.value;
    
    if (tweetText.length === 0) return;
    if (tweetText.length > 280) return;
    
    // Open X Web Intent
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(url, '_blank');
    
    // Auto-close modal after slight delay
    setTimeout(hideTweetModal, 500);
}
