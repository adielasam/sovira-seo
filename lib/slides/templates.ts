export interface SlideTheme {
  id: string
  name: string
  preview: string
  colors: {
    background: string
    text: string
    heading: string
    accent: string
    muted: string
  }
  fonts: {
    heading: string
    body: string
  }
  style: {
    headingSize: number
    bodySize: number
    subtitleSize: number
    accentBarHeight: number
  }
}

export const BUILT_IN_TEMPLATES: SlideTheme[] = [
  {
    id: 'sovira-default',
    name: 'Sovira Default',
    preview: 'linear-gradient(135deg, #FFFFFF 60%, #F97316 100%)',
    colors: {
      background: 'FFFFFF',
      text: '1E293B',
      heading: '0F172A',
      accent: 'F97316',
      muted: '64748B'
    },
    fonts: { heading: 'Arial', body: 'Arial' },
    style: { headingSize: 28, bodySize: 16, subtitleSize: 20, accentBarHeight: 0.06 }
  },
  {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    preview: 'linear-gradient(135deg, #FFFFFF 60%, #1E40AF 100%)',
    colors: {
      background: 'FFFFFF',
      text: '1E293B',
      heading: '0F172A',
      accent: '1E40AF',
      muted: '64748B'
    },
    fonts: { heading: 'Inter', body: 'Inter' },
    style: { headingSize: 28, bodySize: 16, subtitleSize: 20, accentBarHeight: 0.06 }
  },
  {
    id: 'dark-executive',
    name: 'Dark Executive',
    preview: 'linear-gradient(135deg, #0F172A 60%, #06B6D4 100%)',
    colors: {
      background: '0F172A',
      text: 'FFFFFF',
      heading: 'FFFFFF',
      accent: '06B6D4',
      muted: '94A3B8'
    },
    fonts: { heading: 'Inter', body: 'Inter' },
    style: { headingSize: 28, bodySize: 16, subtitleSize: 20, accentBarHeight: 0.06 }
  },
  {
    id: 'emerald-academic',
    name: 'Emerald Academic',
    preview: 'linear-gradient(135deg, #FFFFFF 60%, #059669 100%)',
    colors: {
      background: 'FFFFFF',
      text: '1F2937',
      heading: '111827',
      accent: '059669',
      muted: '6B7280'
    },
    fonts: { heading: 'Georgia', body: 'Georgia' },
    style: { headingSize: 28, bodySize: 16, subtitleSize: 20, accentBarHeight: 0.06 }
  },
  {
    id: 'sunset-warm',
    name: 'Sunset Warm',
    preview: 'linear-gradient(135deg, #FFFBEB 60%, #D97706 100%)',
    colors: {
      background: 'FFFBEB',
      text: '78350F',
      heading: '451A03',
      accent: 'D97706',
      muted: '92400E'
    },
    fonts: { heading: 'Outfit', body: 'Outfit' },
    style: { headingSize: 28, bodySize: 16, subtitleSize: 20, accentBarHeight: 0.06 }
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    preview: 'linear-gradient(135deg, #FFFFFF 60%, #7C3AED 100%)',
    colors: {
      background: 'FFFFFF',
      text: '1F2937',
      heading: '111827',
      accent: '7C3AED',
      muted: '6B7280'
    },
    fonts: { heading: 'Poppins', body: 'Poppins' },
    style: { headingSize: 28, bodySize: 16, subtitleSize: 20, accentBarHeight: 0.06 }
  },
  {
    id: 'crimson-bold',
    name: 'Crimson Bold',
    preview: 'linear-gradient(135deg, #FFFFFF 60%, #DC2626 100%)',
    colors: {
      background: 'FFFFFF',
      text: '0F172A',
      heading: '020617',
      accent: 'DC2626',
      muted: '475569'
    },
    fonts: { heading: 'Montserrat', body: 'Montserrat' },
    style: { headingSize: 28, bodySize: 16, subtitleSize: 20, accentBarHeight: 0.06 }
  },
  {
    id: 'ocean-gradient',
    name: 'Ocean Gradient',
    preview: 'linear-gradient(135deg, #F0F9FF 60%, #0369A1 100%)',
    colors: {
      background: 'F0F9FF',
      text: '0F172A',
      heading: '020617',
      accent: '0369A1',
      muted: '334155'
    },
    fonts: { heading: 'Roboto', body: 'Roboto' },
    style: { headingSize: 28, bodySize: 16, subtitleSize: 20, accentBarHeight: 0.06 }
  },
  {
    id: 'minimalist-gray',
    name: 'Minimalist Gray',
    preview: 'linear-gradient(135deg, #FFFFFF 60%, #374151 100%)',
    colors: {
      background: 'FFFFFF',
      text: '6B7280',
      heading: '111827',
      accent: '374151',
      muted: '9CA3AF'
    },
    fonts: { heading: 'Helvetica', body: 'Arial' },
    style: { headingSize: 28, bodySize: 16, subtitleSize: 20, accentBarHeight: 0.06 }
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    preview: 'linear-gradient(135deg, #F9FAFB 60%, #15803D 100%)',
    colors: {
      background: 'F9FAFB',
      text: '1F2937',
      heading: '111827',
      accent: '15803D',
      muted: '4B5563'
    },
    fonts: { heading: 'Merriweather', body: 'Merriweather' },
    style: { headingSize: 28, bodySize: 16, subtitleSize: 20, accentBarHeight: 0.06 }
  }
]

export const DEFAULT_THEME = BUILT_IN_TEMPLATES[0]
