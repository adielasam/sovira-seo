import fs from 'fs';
const lines = fs.readFileSync('C:/Users/HP/.gemini/antigravity/brain/b6c0aef3-0d97-49c9-a5fd-99b0bf149709/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');
const firstUser = lines.find(l => l.includes('"type":"USER_INPUT"') && l.includes('PHASE 4'));
console.log(JSON.parse(firstUser).content);
