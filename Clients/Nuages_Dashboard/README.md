# Nuages Dashboard

This guide walks you through running the Dashboard, connecting to a server, and using the core workflow.

## What You Need

- Node.js 18 or newer
- npm 9 or newer
- A running Nuages server (example: http://localhost:3030)

## Step 1: Install and Start the Dashboard

From the repository root:

```bash
cd Clients/Nuages_Dashboard
npm install
npm run dev
```

What to expect:
- Vite prints a local URL in the terminal.
- Opening that URL shows the Connect screen.

## Step 2: Connect and Authenticate

On the Connect screen:
1. Enter a Profile name (example: Local Server).
2. Enter the Server URL (example: http://localhost:3030).
3. Enter your Username and Password.
4. Select Connect and authenticate.

## Step 3: Use the Workspace

After login, use the left navigation rail:
- Overview: quick status cards and recent activity.
- Implants: browse implants and open interactive sessions.
- Jobs: inspect job history and open job session tabs.
- Files, Modules, Handlers, Listeners, Tunnels, Channels, Webhooks, Settings: infrastructure and operations views.

Tip:
- Opening implant and job sessions creates tabs so you can work across multiple contexts quickly.
