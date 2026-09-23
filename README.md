# Neptune AI - Slack Bot

Neptune AI is a simple slack bot built for Hack Club Stardance challenge. Its made with Node.js, @slack/bolt and groq-sdk. It generates project ideas, tech stack suggestions and roasts using dynamic groq model fallbacks.

## Features
- Dynamic model fetching: automatically checks active groq models at runtime and skips broken or decommissioned models
- Stardance compliant: custom slash commands starting with /neptune- prefix with quick ack response
- Socket mode enabled: secure connection without exposing public endpoints
- Direct chat support: works in DMs and direct mentions

## Slash Commmands
- /neptune-idea - Gives a cool hackathon project idea
- /neptune-stack - Suggests a modern fullstack setup
- /neptune-roast - Roasts a generic AI wrapper idea

## Tech Stack
- Node.js
- @slack/bolt
- groq-sdk
- dotenv

## Quick Setup

1. Clone the repo:
git clone https://github.com/ibrahimahsan954-eng/neptune-slack-bot.git
cd neptune-slack-bot

2. Install packages:
npm install

3. Setup environment variables in .env file:
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
GROQ_API_KEY=gsk_...

4. Run the bot:
node index.js
