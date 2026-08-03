const fs = require('fs');
let content = fs.readFileSync('scratch/page_themes.tsx', 'utf8');

// 1. Add Palette icon
content = content.replace('Upload, Loader2, Download, Table, LayoutDashboard, Mail, HelpCircle', 'Upload, Loader2, Download, Table, LayoutDashboard, Mail, HelpCircle, Palette');

// 2. Add Themes import
content = content.replace(import { useDashboardStore } from '@/lib/store/useDashboardStore', import { useDashboardStore } from '@/lib/store/useDashboardStore'\nimport { DASHBOARD_THEMES, DashboardTheme } from '@/lib/themes');

// 3. Update AppStep
content = content.replace(	ype AppStep = 'UPLOAD' | 'TABLE' | 'DASHBOARD', 	ype AppStep = 'UPLOAD' | 'TABLE' | 'THEMES' | 'DASHBOARD');

// 4. Add selectedTheme state
content = content.replace(const [step, setStep] = useState<AppStep>('UPLOAD'), const [step, setStep] = useState<AppStep>('UPLOAD')\n  const [selectedTheme, setSelectedTheme] = useState<DashboardTheme>(DASHBOARD_THEMES[0]));

// 5. Update useEffect dependency for DASHBOARD/THEMES
content = content.replace(if (rawPipelineResult && step === 'DASHBOARD') {, if (rawPipelineResult && (step === 'DASHBOARD' || step === 'THEMES')) {);
content = content.replace([rawPipelineResult, selectedYears, selectedMonths, step]), [rawPipelineResult, selectedYears, selectedMonths, step, selectedTheme]));

fs.writeFileSync('scratch/page_themes.tsx', content);
console.log('Patch 1 complete');
