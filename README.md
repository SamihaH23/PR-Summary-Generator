# 🚀 PR Summary Generator

An AI-powered internal tool that analyzes Git diffs or Pull Requests and generates concise, developer-friendly summaries.

The goal is to reduce the time spent reviewing large pull requests by automatically highlighting key changes, identifying potential risks, and suggesting relevant test cases.

---

## ✨ Features

- 🤖 AI-generated PR summaries
- 📄 Parse raw Git diffs
- ⚠️ Detect potential breaking changes
- 🧪 Generate suggested test cases
- 📊 Risk assessment (Low / Medium / High)
- ⚡ Fast custom Git diff parser
- 🌙 Modern dark glassmorphism UI

---

## Example Output

### Summary

- Added login validation
- Refactored authentication service
- Updated authentication API endpoint

### Risk

**Medium**

### Suggested Tests

- Invalid password
- Expired authentication token
- Remember Me functionality
- Existing login flow
- API authentication failure

---

# Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Vite + React + TypeScript |
| Styling | CSS Variables (Design Tokens), Glassmorphism UI |
| Fonts | Inter, JetBrains Mono |
| Icons | Lucide React |
| AI | Gemini REST API (`gemini-2.5-flash` / `gemini-2.5-pro`), offline heuristic fallback |
| Diff Parsing | Custom high-performance Git diff parser |

---

# Architecture

```
Git Diff / Pull Request
            │
            ▼
   Custom Diff Parser
            │
            ▼
  Structured Change Model
            │
            ▼
 Gemini AI Summarizer
            │
            ▼
 Summary
 Breaking Changes
 Suggested Tests
 Risk Analysis
```

---

## Project Structure

```
src/
│
├── components/     # Header, DiffInput, DiffViewer, SummaryOutput, modals
├── data/           # Sample diffs
├── styles/
├── types/
├── utils/
│   ├── diffParser.ts
│   └── aiSummarizer.ts   # Gemini calls + offline heuristics
└── App.tsx
```

---

## Getting Started

### Clone the repository

```bash
git clone https://github.com/<username>/PR-Summary-Generator.git
cd PR-Summary-Generator
```

### Install dependencies

```bash
npm install
```

### Configure your Gemini API key

Open the app, click the settings icon in the header, and paste your Gemini API key.
The key is stored in your browser's localStorage only. Without a key, the app uses a built-in offline analyzer.

---

## Running the Application

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

## Automated Verification

Verify the project builds successfully:

```bash
npm run build
```

Start the development server:

```bash
npm run dev
```

Open the local Vite URL shown in the terminal to verify the application is running correctly.

---

## MVP Scope

The first version focuses on the core workflow:

- Accept Git diff input
- Parse file changes
- Generate an AI-powered summary
- Highlight potential breaking changes
- Suggest test cases
- Display risk level

Future iterations may include:

- GitHub PR integration
- GitLab support
- Bitbucket support
- Commit history analysis
- Inline code explanations
- Team-specific prompt customization
- Export summaries as Markdown
- CI/CD integration

---

## Design

The application uses a modern developer-focused interface featuring:

- Dark mode
- Glassmorphism
- HSL design tokens
- Responsive layout
- JetBrains Mono for code and diffs
- Inter for UI typography

---

## Why This Project?

Code reviews often involve reading hundreds of changed lines before understanding the intent of a pull request.

PR Summary Generator accelerates this process by leveraging AI to provide reviewers with a concise overview, identify risky changes, and recommend test scenarios—allowing teams to review code more efficiently.

---

## License

This project is intended as an internal productivity tool and is provided for learning and experimentation. Developed by Samiha Hossain <3 
