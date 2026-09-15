import { promises as fs } from 'fs';
import path from 'path';
import { config } from './config.js';

const dir = path.dirname(config.dataFile);
export const imageFile = path.join(dir, 'latest.png');

export async function loadState() {
  try {
    const raw = await fs.readFile(config.dataFile, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveState(state, imageBuffer) {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(config.dataFile, JSON.stringify(state, null, 2));
  if (imageBuffer) await fs.writeFile(imageFile, imageBuffer);
}
