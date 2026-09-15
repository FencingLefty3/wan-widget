import 'dotenv/config';

export const config = {
  // Linus Tech Tips main channel (WAN Show is uploaded here). Verify this
  // is still correct at https://www.youtube.com/@LinusTechTips before relying on it.
  channelId: process.env.YT_CHANNEL_ID || 'UCXuqSBlHAE6Xw-yeJA0Tunw',
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  // How often to check for a new upload. Default: every 3 hours.
  cronSchedule: process.env.CRON_SCHEDULE || '0 */3 * * *',
  port: process.env.PORT || 3000,
  imageWidth: 1290,
  imageHeight: 2796, // iPhone 15/16 Pro point resolution; adjust for your model
  dataFile: process.env.DATA_FILE || './data/latest.json',
};
