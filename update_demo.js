const fs = require('fs');
let code = fs.readFileSync('components/marketing/FullDashboardDemo.tsx', 'utf8');

// 1. Update state type
code = code.replace(
  "const [activeTab, setActiveTab] = useState<'home'|'keywords'|'competitors'|'content'>('home')",
  "const [activeTab, setActiveTab] = useState<string>('home')"
);

// 2. Add analyser state
code = code.replace(
  "const [homeScore, setHomeScore] = useState(0)",
  "const [homeScore, setHomeScore] = useState(0)\n  const [analyserPhase, setAnalyserPhase] = useState<'upload'|'table'|'theme'>('upload')"
);

// 3. Update the runSequence body
const newSequence = `
    function runSequence() {
      // 1. HOME SEQUENCE (0 - 4s)
      t(() => {
        setActiveTab('home')
        setHomeScore(0)
        setKeywordPhase('idle')
        setCompPhase('idle')
        setContentPhase('idle')
        setAnalyserPhase('upload')
        setKeywordTyped('')
        setCompTyped('')
        setContentTyped('')
        setCursor({ x: 500, y: 300 })
      }, 0)
      
      for (let i = 0; i <= 20; i++) {
        t(() => setHomeScore(Math.round(80 * (i/20))), 500 + i * 50)
      }

      // 2. DATA ANALYSER SEQUENCE (4s - 13s)
      t(() => click(80, 115, () => setActiveTab('analyser')), 3500)
      t(() => setCursor({ x: 450, y: 350 }), 4500)
      t(() => click(450, 350, () => setAnalyserPhase('table')), 5500) // Click upload
      t(() => click(850, 100, () => setAnalyserPhase('theme')), 8500) // Click Next
      t(() => click(900, 300), 10500) // Click theme on sidebar
      t(() => setCursor({ x: 500, y: 350 }), 11500) // Move cursor out

      // 3. KEYWORDS SEQUENCE (14s - 20s)
      t(() => click(80, 245, () => setActiveTab('keywords')), 13500)
      t(() => click(400, 160), 14500) // Click search bar
      t(() => setKeywordPhase('typing'), 15400)
      const kw = 'content marketing nigeria'
      kw.split('').forEach((ch, i) => t(() => setKeywordTyped(prev => prev + ch), 15500 + i * 40))
      t(() => click(830, 160, () => setKeywordPhase('searching')), 15500 + kw.length*40 + 400)
      t(() => setKeywordPhase('results'), 15500 + kw.length*40 + 1500)
      t(() => setCursor({ x: 500, y: 350 }), 15500 + kw.length*40 + 2000)

      // 4. CONTENT AI SEQUENCE (21s - 28s)
      t(() => click(80, 330, () => setActiveTab('content')), 20500)
      t(() => click(300, 210), 21500) // Click input
      t(() => setContentPhase('typing'), 22400)
      const topic = 'Best SEO practices 2026'
      topic.split('').forEach((ch, i) => t(() => setContentTyped(prev => prev + ch), 22500 + i * 40))
      t(() => click(300, 480, () => setContentPhase('generating')), 22500 + topic.length*40 + 400) // Click generate
      t(() => setContentPhase('done'), 22500 + topic.length*40 + 3000)
      t(() => setCursor({ x: 700, y: 400 }), 22500 + topic.length*40 + 3500)

      // LOOP
      t(() => runSequence(), 29000)
    }
`;
code = code.replace(/function runSequence\(\) \{[\s\S]*?runSequence\(\)\n    return/m, newSequence.trim() + '\n\n    runSequence()\n    return');

// 4. Header title dynamic
code = code.replace(
  "{activeTab === 'competitors' && 'Competitor Analysis'}",
  "{activeTab === 'analyser' && 'Data Analyser'}"
);

// 5. Replace COMPETITORS VIEW with ANALYSER VIEW
const analyserView = `            {/* --- ANALYSER VIEW --- */}
            {activeTab === 'analyser' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                {analyserPhase === 'upload' && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-16 text-center max-w-2xl w-full bg-white dark:bg-[#1E293B]">
                      <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Activity className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Upload your dataset</h3>
                      <p className="text-slate-500 mb-8">Supports CSV, Excel, TXT up to 10MB</p>
                      <button className="px-8 py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg font-semibold flex items-center gap-2 mx-auto transition-colors">
                        <ArrowUp className="w-4 h-4" /> Select File
                      </button>
                    </div>
                  </div>
                )}
                {analyserPhase === 'table' && (
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Data Cleansed & Structured</h2>
                        <p className="text-slate-500 italic">Our AI has automatically formatted and mapped your raw data.</p>
                      </div>
                      <button className="px-6 py-2.5 bg-[#4F46E5] text-white rounded-lg font-semibold hover:bg-[#4338CA] transition-colors">
                        Next: Choose Dashboard Style
                      </button>
                    </div>
                    <div className="flex-1 bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider text-xs border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="p-4 font-semibold">Row Labels</th>
                            <th className="p-4 font-semibold">Sum of Sales</th>
                            <th className="p-4 font-semibold">Row Labels 1</th>
                            <th className="p-4 font-semibold">Sum of Sales 1</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          <tr><td className="p-4 text-slate-900 dark:text-white">South</td><td className="p-4 text-slate-600 dark:text-slate-300">595566.27</td><td className="p-4 text-slate-900 dark:text-white">Apparel</td><td className="p-4 text-slate-600 dark:text-slate-300">854616.61</td></tr>
                          <tr><td className="p-4 text-slate-900 dark:text-white">North</td><td className="p-4 text-slate-600 dark:text-slate-300">661211.95</td><td className="p-4 text-slate-900 dark:text-white">Electronics</td><td className="p-4 text-slate-600 dark:text-slate-300">915701.93</td></tr>
                          <tr><td className="p-4 text-slate-900 dark:text-white">West</td><td className="p-4 text-slate-600 dark:text-slate-300">662344.00</td><td className="p-4 text-slate-900 dark:text-white">Home Goods</td><td className="p-4 text-slate-600 dark:text-slate-300">812167.99</td></tr>
                          <tr><td className="p-4 font-bold text-slate-900 dark:text-white">Grand Total</td><td className="p-4 font-bold text-slate-900 dark:text-white">2582486.54</td><td className="p-4 font-bold text-slate-900 dark:text-white">Grand Total</td><td className="p-4 font-bold text-slate-900 dark:text-white">2582486.54</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {analyserPhase === 'theme' && (
                  <div className="flex-1 flex gap-6">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Style Preview</h2>
                      <p className="text-slate-500 mb-6">Select a theme from the list to instantly apply it.</p>
                      <div className="w-full h-[400px] bg-[#FDFBF7] dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 overflow-hidden relative shadow-inner">
                        <div className="flex gap-4">
                           <div className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                             <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Annual Performance</div>
                             <div className="text-3xl font-serif text-slate-900 dark:text-white font-bold">How did our</div>
                             <div className="text-3xl font-serif text-slate-900 dark:text-white font-bold mb-2">$5.16M in sales...</div>
                             <div className="text-sm italic text-slate-500">The total sum of sales is $5.16M, with the top region being SOUTH.</div>
                           </div>
                           <div className="w-32 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                             <div className="text-[10px] text-slate-400 uppercase mb-2">Total Sum</div>
                             <div className="text-2xl font-serif text-slate-900 dark:text-white">$5.16M</div>
                           </div>
                        </div>
                        <div className="flex-1 flex gap-4">
                           <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 flex items-end p-4 gap-2">
                             <div className="w-8 bg-slate-800 dark:bg-slate-200 rounded-t h-1/2"></div>
                             <div className="w-8 bg-slate-800 dark:bg-slate-200 rounded-t h-3/4"></div>
                             <div className="w-8 bg-slate-800 dark:bg-slate-200 rounded-t h-1/4"></div>
                             <div className="w-8 bg-slate-800 dark:bg-slate-200 rounded-t h-full"></div>
                           </div>
                           <div className="w-48 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                             <div className="w-24 h-24 rounded-full border-[8px] border-slate-800 dark:border-slate-200 border-r-slate-200 dark:border-r-slate-700"></div>
                           </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-72 bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 h-fit">
                      <h3 className="font-bold text-slate-900 dark:text-white mb-1">Dashboard Themes</h3>
                      <p className="text-xs text-slate-500 mb-4">AI Suggestions</p>
                      <div className="space-y-4">
                        <div className="p-4 border-2 border-[#4F46E5] rounded-xl bg-[#4F46E5]/5 cursor-pointer relative">
                          <div className="flex gap-1 mb-3">
                            <div className="w-3 h-3 rounded-full bg-slate-800"></div>
                            <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                            <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                          </div>
                          <div className="font-bold text-slate-900 dark:text-white">Oreate Editorial</div>
                          <div className="text-xs text-slate-500 mt-1">Premium, journalistic layout with muted tones.</div>
                          <div className="absolute top-4 right-4 text-[#4F46E5]"><CheckCircle2 className="w-5 h-5"/></div>
                        </div>
                        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-slate-300">
                          <div className="flex gap-1 mb-3">
                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                            <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                          </div>
                          <div className="font-bold text-slate-900 dark:text-white">Vibrant Modern</div>
                          <div className="text-xs text-slate-500 mt-1">Energetic startup aesthetic with pastel cards.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )`

code = code.replace(/\{\/\* --- COMPETITORS VIEW ---\*\/\}[\s\S]*?(?=\{\/\* --- CONTENT AI VIEW ---\*\/\})/, analyserView + '\n\n            ');
fs.writeFileSync('components/marketing/FullDashboardDemo.tsx', code);
