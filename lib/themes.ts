export interface DashboardTheme {
  id: string;
  name: string;
  description: string;
  
  bgGlobal: string;
  bgDashboard: string;
  bgSidebar: string;
  
  fontHeader: string;
  fontBody: string;
  
  textMain: string;
  textMuted: string;
  
  chartColors: string[];
  chartAxisColor: string;
  chartGridColor: string;
  
  kpiContainerClass: string;
  kpiTitleClass: string;
  kpiValueClass: string;
  kpiSubClass: string;
  kpiBackgrounds?: string[];
  
  chartContainerClass: string;
  chartTitleClass: string;
  chartSubClass: string;
  
  headerBlockClass?: string;
}

export const DASHBOARD_THEMES: DashboardTheme[] = [
  {
    id: 'oreate-editorial',
    name: 'Oreate Editorial',
    description: 'Premium, journalistic layout with muted tones and elegant serif typography.',
    bgGlobal: 'bg-[#fcfcfc]',
    bgDashboard: 'bg-[#fcfcfc]',
    bgSidebar: 'bg-[#ffffff]',
    fontHeader: 'font-serif',
    fontBody: 'font-serif',
    textMain: 'text-[#1e293b]',
    textMuted: 'text-slate-500',
    chartColors: ['#2c5555', '#d9a05b', '#4c7286', '#8c9296', '#526D82', '#9DB2BF'],
    chartAxisColor: '#cbd5e1',
    chartGridColor: '#f1f5f9',
    kpiContainerClass: 'bg-white border border-slate-100 rounded p-4 shadow-sm flex flex-col justify-between',
    kpiTitleClass: 'text-[9px] uppercase tracking-widest text-slate-400 font-bold',
    kpiValueClass: 'text-2xl lg:text-3xl font-serif text-[#1e293b] font-medium tracking-tight',
    kpiSubClass: 'text-[10px] text-slate-400 font-serif italic border-t border-slate-50 pt-1.5 mt-1',
    chartContainerClass: 'bg-white border border-slate-100 rounded p-4 shadow-sm flex flex-col overflow-hidden',
    chartTitleClass: 'text-sm font-serif text-[#1e293b] font-medium',
    chartSubClass: 'text-[10px] text-slate-400 font-serif italic',
  },
  {
    id: 'vibrant-modern',
    name: 'Vibrant Modern',
    description: 'Energetic startup aesthetic with pastel KPI cards, vivid charts, and bold text.',
    bgGlobal: 'bg-[#f0f4f8]',
    bgDashboard: 'bg-[#f0f4f8]',
    bgSidebar: 'bg-white',
    fontHeader: 'font-sans',
    fontBody: 'font-sans',
    textMain: 'text-slate-900',
    textMuted: 'text-slate-500',
    chartColors: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
    chartAxisColor: '#cbd5e1',
    chartGridColor: '#f8fafc',
    kpiContainerClass: 'rounded-xl p-4 shadow-sm flex flex-col justify-between border border-transparent',
    kpiTitleClass: 'text-[10px] uppercase tracking-wide text-slate-700 font-bold',
    kpiValueClass: 'text-2xl lg:text-3xl font-sans text-slate-900 font-bold tracking-tight mt-1',
    kpiSubClass: 'text-[11px] text-slate-600 font-medium pt-1 mt-1 opacity-80',
    kpiBackgrounds: ['#fed7aa', '#e9d5ff', '#fef08a', '#fbcfe8'],
    chartContainerClass: 'bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col overflow-hidden',
    chartTitleClass: 'text-sm font-sans text-slate-800 font-bold',
    chartSubClass: 'text-[10px] text-slate-500 font-medium uppercase tracking-wider',
    headerBlockClass: 'bg-[#7c3aed] text-white rounded-xl p-4 shadow-sm text-center flex flex-col justify-center items-center',
  },
  {
    id: 'corporate-dark',
    name: 'Corporate Dark Mode',
    description: 'Sleek executive dark mode with neon accents and high contrast.',
    bgGlobal: 'bg-slate-950',
    bgDashboard: 'bg-slate-950',
    bgSidebar: 'bg-slate-900',
    fontHeader: 'font-sans',
    fontBody: 'font-sans',
    textMain: 'text-white',
    textMuted: 'text-slate-400',
    chartColors: ['#06b6d4', '#10b981', '#6366f1', '#f43f5e', '#a855f7', '#eab308'],
    chartAxisColor: '#334155',
    chartGridColor: '#1e293b',
    kpiContainerClass: 'bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-lg flex flex-col justify-between',
    kpiTitleClass: 'text-[9px] uppercase tracking-widest text-slate-400 font-semibold',
    kpiValueClass: 'text-2xl lg:text-3xl font-sans text-white font-bold tracking-tight',
    kpiSubClass: 'text-[10px] text-slate-400 font-sans border-t border-slate-800 pt-1.5 mt-1',
    chartContainerClass: 'bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-lg flex flex-col overflow-hidden',
    chartTitleClass: 'text-sm font-sans text-slate-100 font-semibold',
    chartSubClass: 'text-[10px] text-slate-400 font-sans',
  }
];
