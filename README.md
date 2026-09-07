# Master-Interview

Welcome to the **Master-Interview** project! This repository contains the source code for the Master-Interview web application. Follow the steps below to set up and run the project locally on your machine.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
- [Docker](https://www.docker.com/products/docker-desktop) & Docker Compose
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- Git

---

## 🚀 Getting Started

Follow these step-by-step instructions to get the application running locally.

### Step 1: Create and Set Up the `.env` File
1. Clone the repository to your local machine.
2. Navigate to the `src` folder.
3. Copy the example environment file to create your own `.env` file:
   ```bash
   cp .env.example .env
   ```
4. Open the `.env` file and fill in the required environment variables (Database credentials, API keys, etc.).

### Step 2: Set Up OAuth2 Providers (Google & GitHub)
To enable social login authentication, configure the following OAuth providers:

**Google OAuth:**
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project and navigate to **APIs & Services > Credentials**.
3. Click **Create Credentials** and select **OAuth client ID**.
4. Configure the OAuth consent screen if prompted, and set the Application type to **Web application**.
5. Add your Authorized redirect URIs (`http://localhost:8080/auth/google/callback`).

**GitHub OAuth:**
1. Go to your [GitHub Developer Settings](https://github.com/settings/developers).
2. Select **OAuth Apps** and click **New OAuth App**.
3. Fill in the Application name and Homepage URL (`http://localhost:8080`).
4. Set the Authorization callback URL (`http://localhost:8080/auth/github/callback`).
5. Click **Register application** and generate a new client secret.

**Add the credentials to your `.env` file:**
   ```env
    GOOGLE_CLIENT_ID=
    GOOGLE_CLIENT_SECRET=
    GITHUB_CLIENT_ID=
    GITHUB_CLIENT_SECRET=
   ```

### Step 3: Set Up an Email Server
To enable email sending features (like user verification, notifications, or meeting invitations):
1. Choose an Gmail service provider.
2. Generate an **App Password** from your Google Account settings.
3. Add the SMTP credentials to your `.env` file:
   ```env
    MAIL_USERNAME=
    MAIL_PASSWORD=
   ```

### Step 4: Set Up Zoom Service
Master-Interview integrates with Zoom for scheduling and hosting online interviews.
1. Go to the [Zoom App Marketplace](https://marketplace.zoom.us/).
2. Create a **Server-to-Server OAuth** application.
3. Grant the necessary scopes (e.g., `meeting:write`, `meeting:read`).
4. Copy your credentials and add them to the `.env` file:
   ```env
    ZOOM_ACCOUNT_ID=
    ZOOM_CLIENT_ID=
    ZOOM_CLIENT_SECRET=
    ZOOM_WEBHOOK_SECRET_TOKEN=
   ```

### Step 5: Set Up Stripe & Stripe CLI
To handle payments and subscriptions locally:
1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/) and obtain your **Test API Keys** (Publishable Key and Secret Key).
2. Add these keys to your `.env` file.
3. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and authenticate:
   ```bash
   stripe login
   ```
4. Listen for Stripe webhook events and forward them to your local server by running this command in a new terminal window:
   ```bash
   stripe listen --forward-to http://localhost:8080/stripe/webhook
   ```
5. Copy the generated **Webhook Signing Secret** (usually starts with `whsec_`) from the terminal and add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`.

### Step 6: Run the Application with Docker
Once all the above configurations are complete, you can start the application using Docker.
1. Open your terminal.
2. Navigate to the `src` directory where the `docker-compose.yml` file is located:
   ```bash
   cd src
   ```
3. Build and start the containers (e.g., Node.js app, Database, Redis, etc.) in detached mode:
   ```bash
   docker compose up -d
   ```
4. Wait a few moments for the containers to fully start. You can view the logs using:
   ```bash
   docker compose logs -f
   ```
5. Your application should now be accessible in your web browser (default is usually `http://localhost`).