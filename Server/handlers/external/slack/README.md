## Setup

### 1. Install Dependencies

```bash
virtualenv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Create a Slack App

#### Server

1. Go to Slack API: <https://api.slack.com/apps> and click Create New App -> From Scratch
2. Name your app i.e., "Nuages Server" and select your workspace
3. Configure Bot Token:
   - Navigate to OAuth & Permissions
   - Add the `chat:write` and `channels:history` scopes under Bot Token Scopes
   - On the same page, under OAuth Tokens, click Install to \<Workspace Name\>
      - Copy the Bot User OAuth Token
4. Get Signing Secret:
   - Navigate to Basic Information
   - Copy the Signing Secret

#### Implant

1. Same as 1 and 2 above but name your app i.e., "Nuages Implant"
2. Same as 3 above

### 3. Add Bots to Channel

1. Go to the Slack APP: <https://app.slack.com> and add the bots to a new or existing public channel `/invite @bot-name`
2. Get the Channel ID by right-clicking on the channel name and selecting view channel details
   - Copy the Channel ID
3. Get the server bot ID by right-clicking on the bot name i.e., "Nuages Server" and selecting view app details
   - Copy the Member ID

### 4. Configure the Listener

```node
!use external/slack/aes256_py
!set token <xoxb-server-bot-token>
!set bot <server-bot-id>
!set secret <server-signing-secret>
!set key password
!run
```

### 5. Enable Event Subscriptions

- In the Slack API, for the "Nuages Server" app:
  - Go to Event Subscriptions
  - Turn on Enable Events
  - Set the Request URL to your server's `/slack/event-handler` endpoint (e.g., `https://your-domain/slack/event-handler`)
  - Subscribe to `message.channels` in the Bot Events section
  - Save Changes

### 6. Configure the Implant

- Initialize a new instance of the SLACKAES256Connection class with the "Nuages Implant" bot token and the channel ID
