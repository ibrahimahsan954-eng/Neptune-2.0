import pkg from '@slack/bolt';
const { App } = pkg;
import Groq from 'groq-sdk';
import 'dotenv/config';

// 1. Environment Variables Validation
if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_APP_TOKEN || !process.env.GROQ_API_KEY) {
  console.error("❌ Error: Missing required env variables in .env file");
  process.exit(1);
}

// 2. Initialize Slack App (Socket Mode)
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

// 3. Initialize Groq AI Client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 4. Filtered Text-Only Chat Models
async function getLiveChatModels() {
  try {
    const response = await groq.models.list();
    const activeTextModels = response.data
      .map(m => m.id)
      .filter(id => {
        const lower = id.toLowerCase();
        return !lower.includes('guard') && 
               !lower.includes('whisper') && 
               !lower.includes('embed') && 
               !lower.includes('safetensors') &&
               !lower.includes('vision');
      });
    
    if (activeTextModels.length > 0) return activeTextModels;
  } catch (err) {
    console.warn("⚠️ Dynamic fetch failed, falling back:", err.message);
  }
  return ['deepseek-r1-distill-llama-70b', 'qwen-2.5-coder-32b'];
}

// 5. AI Response Generator
async function askGroq(prompt) {
  const modelsToTry = await getLiveChatModels();

  for (const model of modelsToTry) {
    try {
      const res = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are Neptune AI, a friendly and helpful assistant for Hack Club developers.' },
          { role: 'user', content: prompt }
        ],
        model: model,
      });
      
      const output = res.choices[0]?.message?.content?.trim();
      if (output && output.length > 2 && isNaN(Number(output))) {
        return output;
      }
    } catch (err) {
      console.warn(`⚠️ Model '${model}' skipped -> Reason:`, err.message || err);
    }
  }
  return "⚠️ Hey! I couldn't process that right now. Please try again.";
}

// 6. Slash Command Handler Helper
function registerCommand(cmd, defaultPrompt, label) {
  app.command(cmd, async ({ command, ack, respond }) => {
    try {
      await ack();
      await respond(`⏳ *Neptune AI: ${label}...*`);

      const query = command.text?.trim() || defaultPrompt;
      const aiReply = await askGroq(`${label}: ${query}`);

      await respond({ text: aiReply, replace_original: true });
    } catch (err) {
      console.error(`Error processing ${cmd}:`, err);
      await respond({ text: "⚠️ Internal processing error.", replace_original: true }).catch(() => {});
    }
  });
}

// 7. Stardance Compliant Slash Commands
registerCommand('/neptune-idea', 'Give me a cool hackathon project idea.', 'Generating Idea');
registerCommand('/neptune-stack', 'Suggest a modern full-stack tech setup.', 'Analyzing Stack');
registerCommand('/neptune-roast', 'Roast a generic AI wrapper project.', 'Preparing Roast');

// 8. General Message & Greetings Handler (Handles "hey", "hello", "hi" etc.)
app.message(async ({ message, say }) => {
  if (message.subtype || message.bot_id) return; // Ignore bot's own messages

  try {
    const text = message.text?.trim();
    if (!text) return;

    const aiReply = await askGroq(text);
    await say(aiReply);
  } catch (err) {
    console.error("Error handling direct message:", err);
  }
});

// 9. Start Bot
(async () => {
  await app.start();
  console.log('⚡ Neptune AI is live with Slash Commands & Chat support!');
})();