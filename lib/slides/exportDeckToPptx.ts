import pptxgen from 'pptxgenjs'
import type {
  DeckJSON,
  TitleSlideData,
  ContentSlideData,
  TwoColumnSlideData,
  QuoteSlideData
} from '@/app/(dashboard)/slides-agent/actions'
import { SlideTheme, DEFAULT_THEME } from './templates'

function buildTitleSlide(pres: pptxgen, slide: TitleSlideData, theme: SlideTheme) {
  const pptSlide = pres.addSlide()
  pptSlide.background = { color: theme.colors.background }

  // Accent bar
  pptSlide.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 3.2,
    w: 10,
    h: theme.style.accentBarHeight,
    fill: { color: theme.colors.accent },
  })

  // Title text
  pptSlide.addText(slide.title, {
    x: 1,
    y: 1.5,
    w: 8,
    h: 1.5,
    fontSize: 36,
    bold: true,
    color: theme.colors.heading,
    align: 'center',
    fontFace: theme.fonts.heading,
  })

  // Subtitle text
  pptSlide.addText(slide.subtitle, {
    x: 1,
    y: 3.5,
    w: 8,
    h: 1,
    fontSize: theme.style.subtitleSize,
    color: theme.colors.muted,
    align: 'center',
    fontFace: theme.fonts.body,
  })
}

function buildContentSlide(pres: pptxgen, slide: ContentSlideData, theme: SlideTheme) {
  const pptSlide = pres.addSlide()
  pptSlide.background = { color: theme.colors.background }

  // Left accent bar
  pptSlide.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.06,
    h: 5.625,
    fill: { color: theme.colors.accent },
  })

  // Title
  pptSlide.addText(slide.title, {
    x: 0.8,
    y: 0.5,
    w: 8.5,
    h: 0.8,
    fontSize: theme.style.headingSize,
    bold: true,
    color: theme.colors.heading,
    fontFace: theme.fonts.heading,
  })

  // Bullet points
  pptSlide.addText(
    slide.bullets.map(b => ({ text: b, options: { bullet: true } })),
    {
      x: 1.1,
      y: 1.5,
      w: 8.2,
      h: 3.5,
      fontSize: theme.style.bodySize,
      color: theme.colors.text,
      fontFace: theme.fonts.body,
      lineSpacing: 28,
      valign: 'top',
    }
  )

  // Slide number
  pptSlide.slideNumber = { x: '95%', y: '92%', fontSize: 12, color: theme.colors.muted }
}

function buildTwoColumnSlide(pres: pptxgen, slide: TwoColumnSlideData, theme: SlideTheme) {
  const pptSlide = pres.addSlide()
  pptSlide.background = { color: theme.colors.background }

  // Title
  pptSlide.addText(slide.title, {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.8,
    fontSize: theme.style.headingSize,
    bold: true,
    color: theme.colors.heading,
    align: 'center',
    fontFace: theme.fonts.heading,
  })

  // Left column heading
  pptSlide.addText(slide.left.heading, {
    x: 0.5,
    y: 1.3,
    w: 4.5,
    h: 0.5,
    fontSize: theme.style.subtitleSize,
    bold: true,
    color: theme.colors.heading,
    fontFace: theme.fonts.heading,
  })

  // Left column bullets
  pptSlide.addText(
    slide.left.bullets.map(b => ({ text: b, options: { bullet: true } })),
    {
      x: 0.5,
      y: 1.9,
      w: 4.2,
      h: 3.2,
      fontSize: theme.style.bodySize,
      color: theme.colors.text,
      fontFace: theme.fonts.body,
      lineSpacing: 26,
      valign: 'top',
    }
  )

  // Right column heading
  pptSlide.addText(slide.right.heading, {
    x: 5.3,
    y: 1.3,
    w: 4.5,
    h: 0.5,
    fontSize: theme.style.subtitleSize,
    bold: true,
    color: theme.colors.heading,
    fontFace: theme.fonts.heading,
  })

  // Right column bullets
  pptSlide.addText(
    slide.right.bullets.map(b => ({ text: b, options: { bullet: true } })),
    {
      x: 5.3,
      y: 1.9,
      w: 4.2,
      h: 3.2,
      fontSize: theme.style.bodySize,
      color: theme.colors.text,
      fontFace: theme.fonts.body,
      lineSpacing: 26,
      valign: 'top',
    }
  )

  // Vertical divider
  pptSlide.addShape(pres.ShapeType.rect, {
    x: 5.0,
    y: 1.3,
    w: 0.02,
    h: 3.8,
    fill: { color: theme.colors.muted },
  })
}

function buildQuoteSlide(pres: pptxgen, slide: QuoteSlideData, theme: SlideTheme) {
  const pptSlide = pres.addSlide()
  pptSlide.background = { color: theme.colors.background }

  // Large opening quote mark
  pptSlide.addText('\u201C', {
    x: 1,
    y: 1,
    w: 8,
    h: 1.5,
    fontSize: 72,
    color: theme.colors.accent,
    align: 'center',
    fontFace: theme.fonts.heading,
  })

  // Quote text
  pptSlide.addText(slide.quote, {
    x: 1.5,
    y: 2.2,
    w: 7,
    h: 2,
    fontSize: 24,
    italic: true,
    color: theme.colors.text,
    align: 'center',
    fontFace: theme.fonts.body,
  })

  // Attribution
  pptSlide.addText(`\u2014 ${slide.attribution}`, {
    x: 1,
    y: 4.2,
    w: 8,
    h: 0.8,
    fontSize: 16,
    color: theme.colors.muted,
    align: 'center',
    fontFace: theme.fonts.body,
  })
}

export async function exportDeckToPptx(deck: DeckJSON, theme?: SlideTheme): Promise<void> {
  const activeTheme = theme || DEFAULT_THEME;
  
  const pres = new pptxgen()
  pres.layout = 'LAYOUT_16x9'
  pres.author = 'Sovira'
  pres.title = deck.title

  for (const slide of deck.slides) {
    switch (slide.layout) {
      case 'title':
        buildTitleSlide(pres, slide as TitleSlideData, activeTheme)
        break
      case 'content':
        buildContentSlide(pres, slide as ContentSlideData, activeTheme)
        break
      case 'two-column':
        buildTwoColumnSlide(pres, slide as TwoColumnSlideData, activeTheme)
        break
      case 'quote':
        buildQuoteSlide(pres, slide as QuoteSlideData, activeTheme)
        break
    }
  }

  const safeTitle = deck.title.replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Presentation'
  await pres.writeFile({ fileName: `${safeTitle}.pptx` })
}
