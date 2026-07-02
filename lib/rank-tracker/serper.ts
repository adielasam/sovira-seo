export interface SerperResult {
  position: number | null
  url: string | null
  serpFeatures: string[]
  checkedAt: string
}

export async function checkKeywordRank(keyword: string, domain: string, countryCode: string = 'us'): Promise<SerperResult> {
  if (!process.env.SERPER_API_KEY) {
    console.error('SERPER_API_KEY is not defined')
    return {
      position: null,
      url: null,
      serpFeatures: [],
      checkedAt: new Date().toISOString()
    }
  }

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: keyword,
        gl: countryCode,
        num: 100
      })
    })

    if (!response.ok) {
      console.error('Serper API error:', await response.text())
      return {
        position: null,
        url: null,
        serpFeatures: [],
        checkedAt: new Date().toISOString()
      }
    }

    const data = await response.json()
    const organic = data.organic || []
    
    // Extract SERP features (people also ask, knowledge graph, local pack, etc.)
    const serpFeatures: string[] = []
    if (data.peopleAlsoAsk) serpFeatures.push('People Also Ask')
    if (data.knowledgeGraph) serpFeatures.push('Knowledge Graph')
    if (data.localPack) serpFeatures.push('Local Pack')
    if (data.topStories) serpFeatures.push('Top Stories')
    if (data.images) serpFeatures.push('Images')

    // Find the first result matching the tracked domain
    const match = organic.find((result: any) => 
      result.link.toLowerCase().includes(domain.toLowerCase())
    )

    return {
      position: match ? match.position : null,
      url: match ? match.link : null,
      serpFeatures,
      checkedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error fetching from Serper:', error)
    return {
      position: null,
      url: null,
      serpFeatures: [],
      checkedAt: new Date().toISOString()
    }
  }
}
