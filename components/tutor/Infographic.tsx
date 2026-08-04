'use client';

import React from 'react';
import {
  Lightbulb, Wrench, FileText, Settings, Type, List, Star, Zap, BarChart, 
  Brain, Heart, Layers, Search, Shield, Globe, Database, Code, Users, Target, 
  BookOpen, Cpu, Eye, Lock, Trash2, RefreshCw, ArrowRight
} from 'lucide-react';

const getIcon = (concept: string, size: number = 24) => {
  const c = concept?.toLowerCase() || '';
  const props = { size, strokeWidth: 2 };
  
  if (c.includes('idea') || c.includes('concept') || c.includes('light')) return <Lightbulb {...props} />;
  if (c.includes('tool') || c.includes('wrench')) return <Wrench {...props} />;
  if (c.includes('file') || c.includes('doc')) return <FileText {...props} />;
  if (c.includes('set') || c.includes('config')) return <Settings {...props} />;
  if (c.includes('text') || c.includes('type')) return <Type {...props} />;
  if (c.includes('list')) return <List {...props} />;
  if (c.includes('star') || c.includes('best')) return <Star {...props} />;
  if (c.includes('fast') || c.includes('quick') || c.includes('zap')) return <Zap {...props} />;
  if (c.includes('chart') || c.includes('graph') || c.includes('data')) return <BarChart {...props} />;
  if (c.includes('brain') || c.includes('mind') || c.includes('ai')) return <Brain {...props} />;
  if (c.includes('heart') || c.includes('love')) return <Heart {...props} />;
  if (c.includes('layer') || c.includes('stack')) return <Layers {...props} />;
  if (c.includes('search') || c.includes('find') || c.includes('seo')) return <Search {...props} />;
  if (c.includes('shield') || c.includes('secure')) return <Shield {...props} />;
  if (c.includes('globe') || c.includes('web') || c.includes('world')) return <Globe {...props} />;
  if (c.includes('database') || c.includes('store')) return <Database {...props} />;
  if (c.includes('code') || c.includes('dev')) return <Code {...props} />;
  if (c.includes('user') || c.includes('people')) return <Users {...props} />;
  if (c.includes('target') || c.includes('goal')) return <Target {...props} />;
  if (c.includes('book') || c.includes('learn') || c.includes('read')) return <BookOpen {...props} />;
  if (c.includes('cpu') || c.includes('process')) return <Cpu {...props} />;
  if (c.includes('eye') || c.includes('view') || c.includes('vision')) return <Eye {...props} />;
  if (c.includes('lock') || c.includes('private')) return <Lock {...props} />;
  if (c.includes('trash') || c.includes('delete')) return <Trash2 {...props} />;
  if (c.includes('refresh') || c.includes('sync')) return <RefreshCw {...props} />;
  
  return <Target {...props} />; // fallback
};

const tagColors = [
  'linear-gradient(135deg, #10b981 0%, #059669 100%)', // emerald
  'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', // blue
  'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', // orange
  'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)', // purple
  'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', // rose
  'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // amber
];

export function Infographic({ data }: { data: any }) {
  // Normalize data
  let parsedData = { main_title: '', subtitle: '', golden_rule: '', sections: [] as any[] };
  
  if (Array.isArray(data)) {
    parsedData.sections = data;
    parsedData.main_title = 'Generated Infographic';
  } else if (data && typeof data === 'object') {
    parsedData = {
      main_title: data.main_title || 'Infographic',
      subtitle: data.subtitle || '',
      golden_rule: data.golden_rule || '',
      sections: Array.isArray(data.sections) ? data.sections : []
    };
  }

  const sectionsCount = parsedData.sections.length;
  let layoutMode = 'flow';
  if (sectionsCount <= 3) layoutMode = 'comparison';
  else if (sectionsCount >= 4 && sectionsCount <= 6) layoutMode = 'hub';

  // 3D CSS Helpers
  const cardShadow = '0 8px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)';
  const floatingShadow = '0 12px 24px rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.3)';

  const renderTags = (tags: string[] = []) => {
    if (!tags || tags.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {tags.map((tag, i) => {
          const bg = tagColors[i % tagColors.length];
          return (
            <span 
              key={i} 
              className="text-xs font-bold text-white px-3 py-1 rounded-full uppercase tracking-wide transform transition-transform hover:scale-105"
              style={{
                background: bg,
                boxShadow: `0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)`,
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}
            >
              {tag}
            </span>
          );
        })}
      </div>
    );
  };

  const renderComparisonLayout = () => {
    return (
      <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
        {parsedData.sections.map((section, idx) => (
          <div key={idx} className="flex flex-col sm:flex-row items-center gap-4 w-full">
            <div 
              className="flex-1 bg-white p-6 rounded-2xl relative z-10 w-full"
              style={{ boxShadow: cardShadow }}
            >
              <div className="flex items-center gap-4 mb-2">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-[#7ba884] to-[#1a3821] text-white"
                  style={{ boxShadow: floatingShadow }}
                >
                  {getIcon(section.icon_concept, 24)}
                </div>
                <h3 className="text-xl font-bold text-gray-800" style={{ fontFamily: '"Montserrat", "Inter", sans-serif' }}>
                  {section.title}
                </h3>
              </div>
              <p className="text-gray-600 mt-2">{section.description}</p>
            </div>
            
            <div className="hidden sm:flex flex-1 items-center justify-center px-4">
               <div className="w-full border-b-2 border-dashed border-[#8bb593] relative">
                  <ArrowRight size={20} className="absolute -right-2 -top-[10px] text-[#5c8564]" />
               </div>
            </div>

            <div 
              className="flex-1 w-full bg-[#f0f5f1] p-5 rounded-2xl border border-[#8bb593]"
              style={{ boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)' }}
            >
              {renderTags(section.tags)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderHubLayout = () => {
    const radius = 240;
    return (
      <div className="w-full relative hidden md:flex items-center justify-center" style={{ minHeight: '700px' }}>
        {/* Central Node */}
        <div 
          className="absolute z-20 w-48 h-48 rounded-full flex flex-col items-center justify-center text-center p-4 bg-gradient-to-br from-[#7ba884] to-[#1a3821] text-white"
          style={{ 
            left: 'calc(50% - 96px)',
            top: 'calc(50% - 96px)',
            boxShadow: '0 16px 40px rgba(26,56,33,0.4), inset 0 4px 10px rgba(255,255,255,0.3)',
            fontFamily: '"Montserrat", "Inter", sans-serif' 
          }}
        >
          <h2 className="text-lg font-bold leading-tight drop-shadow-md">{parsedData.main_title}</h2>
          {parsedData.subtitle && <p className="text-[10px] mt-1 opacity-90">{parsedData.subtitle}</p>}
        </div>

        {/* Satellites */}
        {parsedData.sections.map((section, i) => {
          const angle = (i / sectionsCount) * (2 * Math.PI) - Math.PI / 2; 
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <div 
              key={i} 
              className="absolute z-30 w-56 p-4 bg-white rounded-xl"
              style={{ 
                left: `calc(50% + ${x}px - 112px)`, 
                top: `calc(50% + ${y}px - 40px)`,
                boxShadow: cardShadow
              }}
            >
              <div 
                className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center text-white"
                style={{
                  background: tagColors[i % tagColors.length],
                  boxShadow: floatingShadow
                }}
              >
                {getIcon(section.icon_concept, 24)}
              </div>
              <div className="pt-6 text-center">
                <h3 className="font-bold text-gray-800 mb-1 text-sm" style={{ fontFamily: '"Montserrat", "Inter", sans-serif' }}>
                  {section.title}
                </h3>
                <p className="text-[11px] text-gray-600 line-clamp-2 mb-1">{section.description}</p>
                <div className="flex justify-center">{renderTags(section.tags)}</div>
              </div>
            </div>
          );
        })}

        {/* SVG Lines — use a viewBox centered on (0,0) for easy coordinate math */}
        <svg 
          className="absolute inset-0 w-full h-full z-10 pointer-events-none" 
          viewBox="-350 -350 700 700"
          preserveAspectRatio="xMidYMid meet"
        >
          {parsedData.sections.map((_, i) => {
            const angle = (i / sectionsCount) * (2 * Math.PI) - Math.PI / 2;
            const x2 = Math.cos(angle) * radius;
            const y2 = Math.sin(angle) * radius;
            return (
              <line 
                key={i}
                x1={0} y1={0} 
                x2={x2} y2={y2}
                stroke="#8bb593" strokeWidth="3" strokeDasharray="8 6"
                opacity={0.6}
              />
            );
          })}
        </svg>
      </div>
    );
  };

  const renderMobileHubLayout = () => {
    return (
      <div className="md:hidden flex flex-col gap-6 w-full max-w-md mx-auto">
        <div 
          className="w-full rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-[#7ba884] to-[#1a3821] text-white"
          style={{ 
            boxShadow: '0 8px 24px rgba(26,56,33,0.3), inset 0 2px 4px rgba(255,255,255,0.2)',
            fontFamily: '"Montserrat", "Inter", sans-serif' 
          }}
        >
          <h2 className="text-2xl font-bold leading-tight drop-shadow-md">{parsedData.main_title}</h2>
          {parsedData.subtitle && <p className="text-sm mt-2 opacity-90">{parsedData.subtitle}</p>}
        </div>
        
        <div className="w-[2px] h-8 bg-[#8bb593] mx-auto opacity-50 border-l-2 border-dashed"></div>
        
        {parsedData.sections.map((section, idx) => (
          <div key={idx} className="relative">
            {idx > 0 && <div className="w-[2px] h-6 bg-[#8bb593] mx-auto absolute -top-6 left-1/2 opacity-50 border-l-2 border-dashed"></div>}
            <div 
              className="bg-white p-6 pt-8 rounded-2xl relative z-10 w-full mt-4"
              style={{ boxShadow: cardShadow }}
            >
              <div 
                className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center text-white"
                style={{
                  background: tagColors[idx % tagColors.length],
                  boxShadow: floatingShadow
                }}
              >
                {getIcon(section.icon_concept, 24)}
              </div>
              <h3 className="text-lg font-bold text-gray-800 text-center mb-2" style={{ fontFamily: '"Montserrat", "Inter", sans-serif' }}>
                {section.title}
              </h3>
              <p className="text-gray-600 text-sm text-center">{section.description}</p>
              <div className="flex justify-center">{renderTags(section.tags)}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFlowLayout = () => {
    return (
      <div className="flex flex-col items-center w-full max-w-5xl mx-auto py-8 relative">
        <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-gradient-to-b from-[#8bb593] to-transparent transform -translate-x-1/2 z-0 hidden md:block"></div>
        
        {parsedData.sections.map((section, idx) => {
          const isLeft = idx % 2 === 0;
          return (
            <div key={idx} className={`w-full flex md:flex-row flex-col items-center my-6 relative z-10 ${isLeft ? 'md:justify-start' : 'md:justify-end'}`}>
              
              <div className={`w-full md:w-[45%] bg-white p-6 rounded-2xl ${isLeft ? 'md:mr-auto' : 'md:ml-auto'}`} style={{ boxShadow: cardShadow }}>
                <div className="flex items-center gap-4 mb-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-[#5c8564] to-[#1a3821]"
                    style={{ boxShadow: floatingShadow }}
                  >
                    {getIcon(section.icon_concept, 20)}
                  </div>
                  <h3 className="text-lg font-bold text-gray-800" style={{ fontFamily: '"Montserrat", "Inter", sans-serif' }}>
                    {section.title}
                  </h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">{section.description}</p>
                {renderTags(section.tags)}
              </div>

              {/* Center connector for desktop */}
              <div className="hidden md:flex absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#1a3821] border-4 border-[#eaf2eb] z-20"></div>

              {/* Line to center for desktop */}
              <div className={`hidden md:block absolute top-1/2 h-[2px] bg-dashed border-b-2 border-dashed border-[#8bb593] w-[5%] z-10 ${isLeft ? 'left-[45%]' : 'right-[45%]'}`}></div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full bg-gradient-to-br from-[#f8faf9] to-[#eaf2eb] min-h-screen p-6 md:p-12 relative overflow-hidden text-gray-800 rounded-3xl" style={{ fontFamily: '"Inter", sans-serif' }}>
      
      {/* Background blobs for depth */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#8bb593] opacity-10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#5c8564] opacity-10 blur-3xl pointer-events-none"></div>

      {layoutMode !== 'hub' && (
        <div className="text-center max-w-3xl mx-auto mb-12 relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a3821] drop-shadow-sm mb-4" style={{ fontFamily: '"Montserrat", "Inter", sans-serif' }}>
            {parsedData.main_title}
          </h1>
          {parsedData.subtitle && (
            <p className="text-lg text-[#5c8564] font-medium">{parsedData.subtitle}</p>
          )}
        </div>
      )}

      <div className="relative z-10 w-full">
        {layoutMode === 'comparison' && renderComparisonLayout()}
        {layoutMode === 'hub' && (
          <>
            {renderHubLayout()}
            {renderMobileHubLayout()}
          </>
        )}
        {layoutMode === 'flow' && renderFlowLayout()}
      </div>

      {parsedData.golden_rule && (
        <div 
          className="mt-16 w-full max-w-4xl mx-auto rounded-xl p-6 md:p-8 text-center text-white relative z-10 bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6]"
          style={{ boxShadow: cardShadow }}
        >
          <div className="flex flex-col items-center">
            <Star className="text-yellow-400 mb-3" size={32} fill="currentColor" />
            <h4 className="text-sm font-bold uppercase tracking-widest text-blue-200 mb-2">Golden Rule</h4>
            <p className="text-xl md:text-2xl font-bold leading-relaxed" style={{ fontFamily: '"Montserrat", "Inter", sans-serif' }}>
              "{parsedData.golden_rule}"
            </p>
          </div>
        </div>
      )}

      {/* Watermark */}
      <div className="absolute bottom-4 right-6 opacity-40 text-xs font-semibold text-[#1a3821] flex items-center gap-1 z-10">
        <Zap size={12} /> Generated by Sovira AI
      </div>
    </div>
  );
}
