import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text || text.trim().length < 20) {
      return NextResponse.json({ error: 'Text is too short to analyze' }, { status: 400 })
    }

    // 1. Split into sentences safely
    const sentences = text
      .replace(/([.!?])\s+/g, '$1|||')
      .split('|||')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 5);

    if (sentences.length === 0) {
       return NextResponse.json({ 
         overallScore: 100, verdict: 'human', flaggedIndices: [], sentenceScores: [], sentences: [] 
       })
    }

    // 2. Calculate Burstiness (Standard Deviation of Sentence Lengths)
    const lengths = sentences.map((s: string) => s.split(/\s+/).length);
    const avgLength = lengths.reduce((a: number, b: number) => a + b, 0) / lengths.length;
    
    const variance = lengths.reduce((acc: number, len: number) => acc + Math.pow(len - avgLength, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);

    // 3. Calculate Vocabulary Diversity (Unique words / Total words)
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const uniqueWords = new Set(words);
    const diversityRatio = words.length > 0 ? uniqueWords.size / words.length : 1;

    // 4. AI Tell-words penalty
    const aiWords = ["delve", "tapestry", "landscape", "testament", "crucial", "vital", "moreover", "furthermore", "underscores", "multifaceted", "comprehensive", "nuanced", "paradigm", "synergy", "leveraging", "groundbreaking", "embark", "consequently", "additionally", "in conclusion"];
    let aiWordCount = 0;
    const lowerText = text.toLowerCase();
    for (const word of aiWords) {
        if (lowerText.includes(word)) aiWordCount++;
    }

    // 5. Deterministic Scoring Logic
    // AI typically has very low standard deviation (uniform sentence length) and low diversity.
    // Human text has high standard deviation (burstiness).
    let score = 0;
    
    // Base score from burstiness
    if (stdDev < 3.5) score = 15;
    else if (stdDev < 5.0) score = 35;
    else if (stdDev < 6.5) score = 65;
    else if (stdDev < 8.0) score = 85;
    else score = 98; // Highly bursty = Human

    // Boost score if vocabulary is highly diverse (human trait)
    if (diversityRatio > 0.6) score += 10;
    else if (diversityRatio < 0.4) score -= 15;

    // Penalty for AI tell-words
    score -= (aiWordCount * 4);
    
    // Academic Text Check: Academic texts have long average lengths. 
    // If it's long but has decent burstiness, it's human academic.
    if (avgLength > 20 && stdDev > 6) {
        score += 15;
    }

    // Ensure bounds (0 to 100)
    score = Math.max(0, Math.min(100, Math.round(score)));

    // 6. Sentence-Level Scoring
    const sentenceScores = lengths.map((len: number, idx: number) => {
        let sScore = 100;
        const diff = Math.abs(len - avgLength);
        const sentenceLower = sentences[idx].toLowerCase();
        
        // If sentence length is exactly the average, it lacks burstiness
        if (diff < 2) sScore -= 40;
        else if (diff < 4) sScore -= 20;

        // Check for AI tell words in this specific sentence
        for (const word of aiWords) {
            if (sentenceLower.includes(word)) {
                sScore -= 30;
            }
        }
        return Math.max(0, Math.min(100, sScore));
    });

    const flaggedIndices = sentenceScores
      .map((score: number, idx: number) => score < 70 ? idx : -1)
      .filter((idx: number) => idx !== -1);

    let verdict = 'mixed';
    if (score >= 85) verdict = 'human';
    else if (score < 50) verdict = 'ai';

    return NextResponse.json({
      overallScore: score,
      verdict,
      flaggedIndices,
      sentenceScores,
      sentences
    })

  } catch (error: any) {
    console.error('Detection Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to analyze text' }, { status: 500 })
  }
}
