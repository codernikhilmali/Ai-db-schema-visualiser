# AI-Based Schema Visualizer & Designer 🚀

An intelligent, interactive database design studio that allows developers to generate, modify, and visualize database schemas visually and textually. The application combines a sleek, modern diagramming canvas with real-time Spring Boot JPA & SQL generation powered by Google's **Gemini LLM**.

---

## 📂 Project Architecture & Structure

The repository is structured as a monorepo containing two key systems:

```
ai_system_designer/
├── ai-system-designer/             # React Frontend (Vite + TS + Tailwind)
│   ├── src/                        # UI Components, Canvas, & Services
│   ├── .env.example                # Frontend environment template
│   └── package.json                # Frontend dependencies
│
└── ai-based-schema-visualiser/     # Spring Boot Backend (Java 21 + JPA)
    ├── src/                        # Controller, Configs, Services & Entities
    ├── .env.example                # Backend environment template
    ├── pom.xml                     # Maven project specification
    └── application.properties      # Backend Spring boot properties
```

### 1. 💻 React Frontend (`ai-system-designer`)
*   **Core Stack:** React 19, Vite 8, TypeScript, Tailwind CSS.
*   **Key Modules:** 
    *   **ReactFlow:** Powers the interactive, zoomable, drag-and-drop database schema canvas.
    *   **Monaco Editor:** Rich code editor for reviewing generated SQL, JPA, and Prisma schemas.
    *   **Framer Motion / Lucide:** Premium micro-animations and icon assets.
    *   **Zustand:** Elegant client-side state management.

### 2. ☕ Spring Boot Backend (`ai-based-schema-visualiser`)
*   **Core Stack:** Java 21, Spring Boot 4.0, Spring Security, JPA / Hibernate, MySQL.
*   **Key Modules:**
    *   **Gemini Service API Integration:** Communicates with Google's Generative Language REST endpoints.
    *   **Programmatic Key Rotation:** Automatically load-balances prompts across multiple API keys, handling failovers seamlessly.
    *   **JWT Authentication:** Secure user authentication using JSON Web Tokens (Access/Refresh pairs).
    *   **Programmatic `.env` Loader:** Dynamically boots and loads local `.env` configs into JVM properties on startup.

---

## ⚡ Quick Start

### Step 1: Environment Setup 🔐

Never commit actual API keys or database passwords. We've provided templates to configure your environment safely.

1.  **Frontend Config:**
    *   Go to `ai-system-designer/`
    *   Copy `.env.example` to `.env`
    ```env
    VITE_API_URL=http://localhost:8080
    ```

2.  **Backend Config:**
    *   Go to `ai-based-schema-visualiser/`
    *   Copy `.env.example` to `.env`
    ```env
    DB_URL=jdbc:mysql://localhost:3306/ai_schema_visualiser
    DB_USERNAME=root
    DB_PASSWORD=your_password
    PORT=8080
    JWT_SECRET=your_super_secret_signing_key_for_jwt
    GEMINI_API_KEYS=key1,key2,key3
    ```

---

### Step 2: Boot the Backend ☕

1.  Navigate to the backend directory:
    ```bash
    cd ai-based-schema-visualiser
    ```
2.  Run the application using Maven:
    ```bash
    mvn spring-boot:run
    ```
    *The server will boot on port `8080` (or the `PORT` specified in your `.env`).*

---

### Step 3: Launch the Frontend 💻

1.  Navigate to the frontend directory:
    ```bash
    cd ai-system-designer
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Launch the development server:
    ```bash
    npm run dev
    ```
    *Open the URL displayed in the terminal (usually `http://localhost:5173`) in your browser.*

---

## 🛡️ Best Practices & Security Notes

*   **Credential Shielding:** All `.env` files are ignored in the root-level `.gitignore`. Please check that you never stage `.env` changes.
*   **Backend Proxying:** The client React code **never** speaks to Google's API directly. All AI prompts pass securely through your Spring Boot controller to prevent API Key leakage.
*   **API Key Rotation & Fallback:** The backend includes built-in round-robin rotation. If one Gemini API key experiences an error or reaches a rate limit, the backend silently handles it and retries the next key automatically in under 1 second.
