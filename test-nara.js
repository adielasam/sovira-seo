const { generateObject } = require('ai');
const { createOpenAI } = require('@ai-sdk/openai');
const { z } = require('zod');

async function main() {
  console.log("Starting test...");
  
  const nara = createOpenAI({
    apiKey: 'sk-nry-Dmhukfm2rn2TgLPRu1vZLOQhBIFOqNeM9RlhU74Xj0k',
    baseURL: 'https://router.bynara.id/v1'
  });

  try {
    const result = await generateObject({
      model: nara('mimo-2.5-hermes'),
      mode: 'json',
      schema: z.object({
        status: z.string()
      }),
      prompt: "Respond with status 'ok'."
    });
    console.log("SUCCESS:", result.object);
  } catch (err) {
    console.error("ERROR:", err.message || err);
  }
}

main();
