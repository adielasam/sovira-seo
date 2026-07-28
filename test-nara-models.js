const { createOpenAI } = require('@ai-sdk/openai');

async function main() {
  console.log("Fetching models from Nara...");
  try {
    const res = await fetch('https://router.bynara.id/v1/models', {
      headers: { 'Authorization': 'Bearer sk-nry-Dmhukfm2rn2TgLPRu1vZLOQhBIFOqNeM9RlhU74Xj0k' }
    });
    const json = await res.json();
    console.log(json.data.map(m => m.id));
  } catch (err) {
    console.error("ERROR:", err.message);
  }
}

main();
