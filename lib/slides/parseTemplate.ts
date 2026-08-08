import JSZip from 'jszip'
import type { SlideTheme } from './templates'

export async function parseTemplateFromPptx(file: File): Promise<SlideTheme> {
  const defaultTheme: SlideTheme = {
    id: `custom-${Date.now()}`,
    name: file.name.replace(/\.pptx$/i, ''),
    preview: 'linear-gradient(135deg, #FFFFFF 60%, #000000 100%)',
    colors: {
      background: 'FFFFFF',
      text: '000000',
      heading: '000000',
      accent: '4472C4',
      muted: '666666'
    },
    fonts: {
      heading: 'Arial',
      body: 'Arial'
    },
    style: {
      headingSize: 28,
      bodySize: 16,
      subtitleSize: 20,
      accentBarHeight: 0.06
    }
  }

  try {
    const buffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(buffer)

    // PowerPoint theme colors live in ppt/theme/theme1.xml
    const themeFile = zip.file('ppt/theme/theme1.xml')
    if (!themeFile) {
      return defaultTheme
    }

    const themeXml = await themeFile.async('text')
    const parser = new DOMParser()
    const doc = parser.parseFromString(themeXml, 'text/xml')

    // Helper to extract a hex color from a theme color element
    // Handles both <a:srgbClr val="RRGGBB"/> and <a:sysClr lastClr="RRGGBB"/>
    const extractColor = (elementName: string, fallback: string): string => {
      // Try namespace-qualified selectors first, then unqualified
      const selectors = [
        `clrScheme > ${elementName}`,
      ]

      let node: Element | null = null
      for (const sel of selectors) {
        node = doc.querySelector(sel)
        if (node) break
      }

      // Fallback: search all elements by local name
      if (!node) {
        const allElements = doc.getElementsByTagName('*')
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i]
          const localName = el.localName || el.nodeName.split(':').pop()
          if (localName === elementName) {
            const parent = el.parentElement
            const parentLocal = parent?.localName || parent?.nodeName.split(':').pop()
            if (parentLocal === 'clrScheme') {
              node = el
              break
            }
          }
        }
      }

      if (!node) return fallback

      // Search child elements for srgbClr or sysClr
      const children = node.getElementsByTagName('*')
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        const childLocal = child.localName || child.nodeName.split(':').pop()

        if (childLocal === 'srgbClr') {
          const val = child.getAttribute('val')
          if (val) return val
        }
        if (childLocal === 'sysClr') {
          const lastClr = child.getAttribute('lastClr')
          if (lastClr) return lastClr
        }
      }

      return fallback
    }

    // Helper to extract font from fontScheme
    const extractFont = (schemeName: string, fallback: string): string => {
      const allElements = doc.getElementsByTagName('*')
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i]
        const localName = el.localName || el.nodeName.split(':').pop()
        if (localName === schemeName) {
          // Look for latin typeface inside
          const children = el.getElementsByTagName('*')
          for (let j = 0; j < children.length; j++) {
            const child = children[j]
            const childLocal = child.localName || child.nodeName.split(':').pop()
            if (childLocal === 'latin') {
              const typeface = child.getAttribute('typeface')
              if (typeface) return typeface
            }
          }
        }
      }
      return fallback
    }

    // Extract theme colors
    const textClr = extractColor('dk1', '000000')
    const bgClr = extractColor('lt1', 'FFFFFF')
    const accentClr = extractColor('accent1', '4472C4')
    const headingClr = extractColor('dk2', textClr)
    const mutedClr = extractColor('lt2', '666666')

    // Extract fonts
    const headingFont = extractFont('majorFont', 'Arial')
    const bodyFont = extractFont('minorFont', 'Arial')

    return {
      ...defaultTheme,
      colors: {
        background: bgClr,
        text: textClr,
        heading: headingClr,
        accent: accentClr,
        muted: mutedClr
      },
      fonts: {
        heading: headingFont,
        body: bodyFont
      },
      preview: `linear-gradient(135deg, #${bgClr} 60%, #${accentClr} 100%)`
    }
  } catch (error) {
    console.error('Failed to parse PPTX theme:', error)
    return defaultTheme
  }
}
