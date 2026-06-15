# DocRx — Offline-First Patient Records System

🔗 **Live Deployment:** [https://ravitejbondada.github.io/DocRx/](https://ravitejbondada.github.io/DocRx/)

DocRx is a completely offline, secure, and privacy-focused Electronic Medical Records (EMR) application built specifically for solo General Practitioners (GPs). 

Because DocRx operates entirely within the browser and stores data securely on the local device, **no patient data is ever transmitted to a third-party server**.

## 🌟 Key Features

*   **100% Offline-First:** Runs entirely in the browser using SQLite (WASM) and IndexedDB.
*   **Privacy by Design:** Zero cloud backend required for daily operations. Data stays on the doctor's device.
*   **Comprehensive Visit Management:** Track vitals, chief complaints, clinical notes, and calculate BMI automatically.
*   **Intelligent Prescribing:** Features an auto-suggesting prescription tool that builds a personalized medicine library as you type.
*   **Diagnostic Test Tracking:** Track ordered tests, instructions, and flag them as urgent.
*   **Advanced Print Engine:** Beautifully formatted A4 prescriptions and investigation orders with custom letterheads and auto-sizing.
*   **Attachment Stitching:** Seamlessly attach multiple images or PDFs to a visit; DocRx automatically stitches them into a single master PDF.
*   **Partner Recommendations:** Seamlessly recommend specific diagnostic centers or medical shops dynamically on your printed prescriptions.
*   **Secure Backups:** AES-GCM encrypted Google Drive backups. Restore your entire practice onto any device using just your encrypted zip file and your secure recovery key.

## 🛠️ Technology Stack

*   **Core:** Vanilla JavaScript (ES Modules), HTML5, CSS3.
*   **Database:** `sql.js` (SQLite compiled to WebAssembly) with `idb-keyval` for persistent storage.
*   **File Processing:** `pdf-lib` and `jsPDF` for client-side document processing and image stitching.
*   **Cryptography:** Web Crypto API (`AES-GCM`, `PBKDF2`) for encrypting backups.
*   **Build Tool:** Vite, configured as a Progressive Web App (PWA).

## 🚀 Getting Started Locally

### Prerequisites
*   Node.js (v16 or higher)
*   npm (or yarn/pnpm)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/docrx.git
   cd docrx
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:5173/`. 

## 🌐 Deploying to GitHub Pages

Since DocRx operates completely client-side, you can host it for free using GitHub Pages.

1. **Build the production bundle:**
   ```bash
   npm run build
   ```
   *This generates a `dist/` directory containing all optimized assets.*

2. **Deploy via GitHub Actions:**
   The easiest way to host this automatically is to enable GitHub Actions in your repository.
   - Go to your GitHub repository **Settings** -> **Pages**.
   - Under **Build and deployment**, change the Source to **GitHub Actions**.
   - Use the **Static HTML** starter workflow, but change the upload path to `dist`.

Alternatively, if you're using the standard deploy branch method, simply deploy the contents of the `dist/` folder to your `gh-pages` branch.

## 🔒 Security & Data Persistence
- **Local Storage Limit:** Migrated to IndexedDB, removing standard `localStorage` 5MB limitations.
- **Backups:** Because data is stored in the browser cache, it is critical that the user sets up Google Drive backups in the app's Settings to prevent accidental data loss if browser history is cleared.

## 📄 License
This project is licensed under the MIT License.
