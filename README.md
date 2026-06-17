# BigQuery Release Notes Hub

A premium, modern web dashboard built with Python Flask, plain vanilla HTML5, CSS3, and JavaScript. The application fetches, caches, and formats Google Cloud's official BigQuery release notes and features an interactive selector allowing users to highlight and tweet updates with a single click.

---

## 📂 Project Architecture & Files

The application contains the following structure in the repository:

| Component | Path | Description |
| :--- | :--- | :--- |
| **Backend** | `app.py` | Flask server handles routing, fetches the XML Atom feed, caches responses in memory, and serves parsed updates as JSON. |
| **Template** | `templates/index.html` | Semantic HTML5 structure providing layouts for filters sidebar, search boxes, notes container, and the Tweet Composer overlay. |
| **Styles** | `static/css/style.css` | Custom styling system defining variables, dark mode styles, glassmorphic headers, status indicators, badges, and modal animations. |
| **Logic** | `static/js/app.js` | Frontend controller for state management, client-side filters/search, dynamic DOM rendering, HTML parsing, and Twitter Composer interactivity. |

---

## 🎨 UI & UX Design Features

### 1. Glassmorphism & Premium Dark Theme
- **Theme Palette:** Rich dark slate background (`#090d16`) accented with vibrant Google Cloud sky-blue (`#38bdf8`) and violet (`#c084fc`).
- **Visual Effects:** Dynamic blur (`backdrop-filter`) on cards and sidebar, custom scrollbars, and fine border glows on hover.
- **Micro-Animations:** Pulsing status dot indicating feed age, custom spinner rotations during fetch, and scale-up transitions on card hover and modal opening.

### 2. Intelligent Category Parsing
The app processes raw HTML contents to identify update categories by scanning header tags, dynamically assigning elegant tag classes:
- **Features:** Emerald green badge (`#34d399`)
- **Announcements:** Gold/Amber badge (`#fbbf24`)
- **Deprecations:** Rose red badge (`#f87171`)
- **Fixes/Changes:** Blue badge (`#60a5fa`)

### 3. Selection Canvas & Tweet Composer
When clicking **"Tweet this"** on a release note, the app launches an overlay modal:
- **Selection Canvas:** Automatically splits the release note's HTML content into distinct, selectable segments (individual headers, paragraphs, or bullet points).
- **Interactive Highlighting:** Selecting a paragraph immediately populates the draft area.
- **Draft Composer:** Includes a custom textarea prepended with category emojis/tags and links back to the Google Cloud documentation.
- **Char Counter & Gauge:** A SVG progress ring and counter showing 280-character Twitter limits (color-coded: Green -> Amber -> Red). Clicking **"Post to X"** triggers a Twitter Web Intent in a new tab.

---

## 🚀 Running the Web App

1. Ensure the Flask server dependencies are installed:
   ```bash
   pip install flask requests
   ```
2. Run the application:
   ```bash
   python app.py
   ```
3. Open your web browser and navigate to:
   [http://127.0.0.1:5000](http://127.0.0.1:5000)
4. Click the **Refresh** button next to the status dot to force a real-time retrieval from the feed.
