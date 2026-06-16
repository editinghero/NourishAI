# NourishAI - AI Nutrition Journal

Log meals with photos, import week-long AI chats, and chat directly with your food diary. NourishAI tracks macros, flags hazards, and helps you understand your nutrition with beautiful daily breakdowns.

## Features

- **AI Chat & Timeline:** View your recent meals on a timeline or ask the AI directly about what you've eaten recently and adjust your calorie targets.
- **Gemini & Gemma Models:** Support for the latest Google AI models (Gemini 2.5 Flash, Gemini 3 Flash Preview, Gemma 4) with integrated Google Search Grounding for superior accuracy.
- **Macro Ring Visualizations:** Beautifully designed progress rings track your daily Calories, Protein, Carbs, Fat, and Sugar targets.
- **Privacy-First:** Secure login, encrypted API keys, and local SQLite/Cloudflare D1 databases keep your data yours.
- **PWA Ready:** Install NourishAI directly to your phone or desktop for an app-like experience.

## Getting Started

### 1. Create an Account
1. Open NourishAI and click on "Sign Up".
2. Choose a username and a strong password.

### 2. Configure Your AI
1. Go to **Settings** (gear icon).
2. Enter your Gemini API Key (get one from Google AI Studio).
3. Select your preferred AI Model from the dropdown list.
4. Set your daily macro targets (Calories, Protein, etc.).

### 3. Log Your Meals
**Method 1: Quick Add**
- Drop an image of your meal or paste a quick text description into the prompt box and hit "Analyze & Set Macros".

**Method 2: Multi-day Import**
- If you have an existing chat history of your diet, paste the entire week's transcript into the "Import" tab, and NourishAI will split and organize it by day.

## Install as App

NourishAI is a Progressive Web App (PWA).

**On Desktop:**
- Look for the install icon in your browser's address bar (Chrome/Edge).

**On Mobile:**
- Open the site in your mobile browser, tap "Share" (iOS) or the menu button (Android), and select "Add to Home Screen".

## Security & Privacy
- **Encrypted Keys:** Your Gemini API key is encrypted using AES-256 before being saved to the database.
- **Your Data:** Your nutrition logs are stored securely in Cloudflare D1.

## Need Help?

**Username taken or database error?**
- You might be using a username that is already taken. Try a different username.

**AI returned invalid data format?**
- Try adjusting your custom prompt to be clearer, or switch back to the default `gemini-2.5-flash` model which usually generates the most stable JSON data.

---

## For Developers

Want to run your own instance or contribute?

### Tech Stack
- **Frontend:** React, Vite, TailwindCSS, TanStack Router
- **Backend:** Hono, Cloudflare Pages Functions
- **Database:** Cloudflare D1 (SQLite)

### Quick Setup

```bash
npm install
npm run full-dev
```

### Database Setup

1. Create a local D1 database schema:
```bash
npx wrangler d1 execute NourishAi --local --file=schema.sql
```

2. Create a remote D1 database:
```bash
npx wrangler d1 create NourishAi
```

3. Copy the generated `database_id` into your `wrangler.toml` file under the `[[d1_databases]]` section.

4. Push the schema to your new remote database:
```bash
npx wrangler d1 execute NourishAi --remote --file=schema.sql
```

### Deploy to Cloudflare Pages

1. Build the production application:
```bash
npm run build
```

2. Deploy using Wrangler:
```bash
npx wrangler pages deploy dist --project-name nourishai
```

### Environment Variables

For the backend to encrypt API keys and control signups, you must configure secrets:

**Local Development (`.dev.vars`):**
```
ENCRYPTION_SECRET=your_super_secret_random_string_here
DISABLE_REGISTRATION=false
```

**Production (Cloudflare Dashboard or CLI):**
```bash
npx wrangler pages secret put ENCRYPTION_SECRET --project-name nourishai
npx wrangler pages secret put DISABLE_REGISTRATION --project-name nourishai
```

### Project Structure

```
functions/api/        Backend API built with Hono (runs on Cloudflare Pages)
src/components/       React UI components
src/lib/              Utilities (Gemini AI, Crypto, DB chunking)
src/routes/           Frontend application pages using TanStack Router
public/               PWA assets
schema.sql            Database schema
```

---

**Built with ❤️ for nutrition tracking**

[Report an Issue](https://github.com/username/repo/issues) • [Request a Feature](https://github.com/username/repo/issues/new)
