# DietMate
DietMate – Your Smart Diet Companion.  Plan meals, track calories, and balance nutrients effortlessly. Achieve your health goals with AI-powered recommendations. Eat smart, live better! 🍏

---

### Quick Start

Before running the application, configure the following environment variables in your shell:

```bash
REACT_APP_DOMAIN=http://localhost # For local development.
```
```bash
MONGO_CONNECTION_STRING=<<<MONGO_CONNECTION_STRING>>>
```
```bash
REDIS_CLOUD_HOST=<<<REDIS_HOST>>>
REDIS_CLOUD_PASSWORD=<<<REDIS_PASSWORD>>>
```
```bash
# Get your API key at https://console.groq.com/keys
GROQ_API_KEY=<<<API_KEY>>>
```
```bash
# Get your SECRETS at https://console.cloud.google.com/apis/api/customsearch.googleapis.com
GOOGLE_API_KEY=<<<GOOGLE_API_KEY>>>
GOOGLE_CX=<<<GOOGLE_CX>>>
```

These variables are essential for proper application functionality. Set them in your host shell environment before proceeding with deployment.

---

### How to Run Redis (locally)

To start Redis service:

```bash
docker compose up --build redis
```

**Note**: The Redis container will persist due to its `unless-stopped` restart policy.

---

### How to Run

There are three main ways to run DietMate:

1. Using VSCode Extension (recommended for development)
2. Using Docker Compose (recommended for production)
3. GitHub Workflow – production deployment in Microsoft Azure Cloud.

#### 1. VSCode Extension Method

1. Install "Restore Terminals" extension in VSCode
2. Restart VSCode
3. The extension will automatically run application.

#### 2. Docker Compose Method

Run all services with:
```bash
docker-compose up --build
```

#### 3. Trigger the CI/CD pipeline by pushing a pull request to the main branch.



