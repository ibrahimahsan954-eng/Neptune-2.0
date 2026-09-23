import pkg from '@slack/bolt';
const { App } = pkg;
import Groq from 'groq-sdk';
import 'dotenv/config';

// check envs before starting
if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_APP_TOKEN || !process.env.GROQ_API_KEY) {
  console.error("Missing required env variables!");
  process.exit(1);
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// grab working text models dynamically, fallback if it fails
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
    console.warn("Dynamic fetch failed, using fallback:", err.message);
  }
  return ['deepseek-r1-distill-llama-70b', 'qwen-2.5-coder-32b'];
}

async function askGroq(prompt) {
  const models = await getLiveChatModels();

  for (const model of models) {
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
      console.warn(`Model ${model} failed:`, err.message || err);
    }
  }
  return "⚠️ Hey! I couldn't process that right now. Please try again.";
}

// helper to setup slash commands quickly
function registerCommand(cmd, defaultPrompt, label) {
  app.command(cmd, async ({ command, ack, respond }) => {
    try {
      await ack();
      await respond(`⏳ *Neptune AI: ${label}...*`);

      const query = command.text?.trim() || defaultPrompt;
      const reply = await askGroq(`${label}: ${query}`);

      await respond({ text: reply, replace_original: true });
    } catch (err) {
      console.error(`Error in ${cmd}:`, err);
      await respond({ text: "⚠️ Internal processing error.", replace_original: true }).catch(() => {});
    }
  });
}

registerCommand('/neptune-idea', 'Give me a cool hackathon project idea.', 'Generating Idea');
registerCommand('/neptune-stack', 'Suggest a modern full-stack tech setup.', 'Analyzing Stack');
registerCommand('/neptune-roast', 'Roast a generic AI wrapper project.', 'Preparing Roast');

// basic DM/message handler
app.message(async ({ message, say }) => {
  if (message.subtype || message.bot_id) return;

  try {
    const text = message.text?.trim();
    if (!text) return;

    const reply = await askGroq(text);
    await say(reply);
  } catch (err) {
    console.error("DM error:", err);
  }
});

(async () => {
  await app.start();
  console.log('⚡ Neptune AI is live!');
})();