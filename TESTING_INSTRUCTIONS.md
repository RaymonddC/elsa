# Testing Instructions for AI Log Analysis Agent

Follow these steps to run and test your application.

## 1. Environment Setup
- [ ] **Docker**: Ensure Docker Desktop is running.
- [ ] **Env Vars**:
    - Copy `.env.example` to `.env` in the root directory.
    - Add your `OPENAI_API_KEY` to `.env`.

## 2. Start Infrastructure
Open a terminal in the project root:
```bash
docker-compose up -d
```
*Wait 30 seconds for Elasticsearch to initialize.*

## 3. Backend Setup & Data Seeding
In the same terminal:
```bash
# Install dependencies
npm install

# Initialize Elasticsearch Index
npm run init-index

# Generate Incident Data (The "Story")
npm run generate-logs

# Start the Backend Server
npm run dev
```
*Backend should be running at http://localhost:3000*

## 4. Frontend Setup
Open a **NEW** terminal:
```bash
cd frontend
npm install
npm run dev
```
*Frontend should be running at http://localhost:5173*

## 5. How to Test (The "Wow" Demo)
1.  Open http://localhost:5173 in your browser.
2.  **Scenario 1: General Health**
    - Ask: *"What happened in the last 15 minutes?"*
    - **Verify**: The "Glass Box" panel opens and shows the ES query. The agent summarizes the errors.
3.  **Scenario 2: Drill Down**
    - Ask: *"Which service is failing?"*
    - **Verify**: Agent identifies `auth-service` as the culprit.
4.  **Scenario 3: Root Cause**
    - Ask: *"Why is the auth service failing?"*
    - **Verify**: Agent mentions `DB_TIMEOUT` and explains the connection pool issue.

## Troubleshooting
- **ES Errors**: Run `docker-compose down` then `docker-compose up -d` to reset.
- **No Data**: Run `npm run generate-logs` again.
