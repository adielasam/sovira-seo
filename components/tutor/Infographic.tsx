'use client';

import React, { useState } from 'react';
import {
  Lightbulb, Wrench, FileText, Settings, Type, List, Star, Zap, BarChart,
  Brain, Heart, Layers, Search, Shield, Globe, Database, Code, Users, Target,
  BookOpen, Cpu, Eye, Lock, Trash2, RefreshCw, ArrowRight, ChevronLeft,
  ChevronRight, Sparkles, CheckCircle2, ArrowRightLeft
} from 'lucide-react';

// ─── Icon Mapping ───────────────────────────────────────────
const getIcon = (concept: string, size: number = 28) => {
  const c = concept?.toLowerCase() || '';
  const props = { size, strokeWidth: 2 };
  if (c.includes('idea') || c.includes('light')) return <Lightbulb {...props} />;
  if (c.includes('tool') || c.includes('wrench') || c.includes('clean')) return <Wrench {...props} />;
  if (c.includes('file') || c.includes('doc')) return <FileText {...props} />;
  if (c.includes('set') || c.includes('config') || c.includes('gear')) return <Settings {...props} />;
  if (c.includes('text') || c.includes('type') || c.includes('write')) return <Type {...props} />;
  if (c.includes('list') || c.includes('step')) return <List {...props} />;
  if (c.includes('star') || c.includes('best')) return <Star {...props} />;
  if (c.includes('fast') || c.includes('quick') || c.includes('zap') || c.includes('power')) return <Zap {...props} />;
  if (c.includes('chart') || c.includes('graph') || c.includes('data')) return <BarChart {...props} />;
  if (c.includes('brain') || c.includes('mind') || c.includes('ai') || c.includes('think')) return <Brain {...props} />;
  if (c.includes('heart') || c.includes('love')) return <Heart {...props} />;
  if (c.includes('layer') || c.includes('stack')) return <Layers {...props} />;
  if (c.includes('search') || c.includes('find') || c.includes('seo')) return <Search {...props} />;
  if (c.includes('shield') || c.includes('secure') || c.includes('safe')) return <Shield {...props} />;
  if (c.includes('globe') || c.includes('web') || c.includes('world')) return <Globe {...props} />;
  if (c.includes('database') || c.includes('store') || c.includes('server')) return <Database {...props} />;
  if (c.includes('code') || c.includes('dev')) return <Code {...props} />;
  if (c.includes('user') || c.includes('people') || c.includes('team')) return <Users {...props} />;
  if (c.includes('target') || c.includes('goal')) return <Target {...props} />;
  if (c.includes('book') || c.includes('learn') || c.includes('read')) return <BookOpen {...props} />;
  if (c.includes('cpu') || c.includes('process') || c.includes('compute')) return <Cpu {...props} />;
  if (c.includes('eye') || c.includes('view') || c.includes('vision')) return <Eye {...props} />;
  if (c.includes('lock') || c.includes('private')) return <Lock {...props} />;
  if (c.includes('trash') || c.includes('delete') || c.includes('remove')) return <Trash2 {...props} />;
  if (c.includes('refresh') || c.includes('sync') || c.includes('update')) return <RefreshCw {...props} />;
  return <Target {...props} />;
};

// ─── Colors ─────────────────────────────────────────────────
const iconBgColors = [
  '#10b981', '#3b82f6', '#f97316', '#a855f7', '#f43f5e', '#06b6d4', '#eab308', '#8b5cf6',
];

const slideAccentGradients = [
  'linear-gradient(135deg, #7ba884 0%, #5c8564 100%)',
  'linear-gradient(135deg, #5c8564 0%, #3d6b4a 100%)',
  'linear-gradient(135deg, #8bb593 0%, #6a9b74 100%)',
  'linear-gradient(135deg, #4a7c5c 0%, #2d5a3d 100%)',
  'linear-gradient(135deg, #6a9b74 0%, #5c8564 100%)',
  'linear-gradient(135deg, #3d6b4a 0%, #1a3821 100%)',
];

// ─── Shared Styles ──────────────────────────────────────────
const headingFont: React.CSSProperties = { fontFamily: '"Montserrat", "Inter", sans-serif' };
const cardShadow = '0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.15)';
const floatingShadow = '0 10px 24px rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.3)';

// ─── Title Slide ────────────────────────────────────────────
function TitleSlide({ title, subtitle, slideNum, totalSlides }: { title: string; subtitle: string; slideNum: number; totalSlides: number }) {
  return (
    <div className="w-full min-h-[600px] flex flex-col items-center justify-center text-center p-8 md:p-16 relative" style={{ background: 'linear-gradient(160deg, #eaf2eb 0%, #d4e4d7 50%, #b8d4bd 100%)' }}>
      <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: '#5c8564' }} />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: '#7ba884' }} />

      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-8 text-white" style={{ background: 'linear-gradient(135deg, #7ba884 0%, #1a3821 100%)', boxShadow: floatingShadow }}>
        <BookOpen size={36} />
      </div>

      <h1 className="text-4xl md:text-6xl font-extrabold text-[#1a3821] mb-6 max-w-3xl leading-tight drop-shadow-sm" style={headingFont}>
        {title}
      </h1>
      {subtitle && (
        <p className="text-xl md:text-2xl text-[#3d6b4a] font-medium max-w-2xl leading-relaxed">{subtitle}</p>
      )}

      <div className="mt-12 flex items-center gap-2 text-[#5c8564] text-sm font-semibold">
        <Sparkles size={16} /> {totalSlides} Slides • Generated by Sovira AI
      </div>
    </div>
  );
}

// ─── Concept Slide ──────────────────────────────────────────
function ConceptSlide({ slide, index }: { slide: any; index: number }) {
  const accent = iconBgColors[index % iconBgColors.length];
  return (
    <div className="w-full min-h-[600px] p-8 md:p-14 flex flex-col justify-center relative" style={{ background: 'linear-gradient(160deg, #f5f9f6 0%, #eaf2eb 100%)' }}>
      <div className="absolute top-8 right-8 text-[#b8d4bd] font-extrabold text-8xl opacity-20 select-none" style={headingFont}>
        {String(index + 1).padStart(2, '0')}
      </div>

      <div className="flex flex-col md:flex-row gap-8 md:gap-14 items-start max-w-5xl mx-auto w-full">
        {/* Left: Icon & Title */}
        <div className="flex flex-col items-center md:items-start shrink-0">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-5" style={{ background: accent, boxShadow: floatingShadow }}>
            {getIcon(slide.icon_concept, 32)}
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#1a3821] mb-3 text-center md:text-left" style={headingFont}>
            {slide.title}
          </h2>
        </div>

        {/* Right: Content */}
        <div className="flex-1 space-y-6">
          <p className="text-lg text-[#3d5a42] leading-relaxed">{slide.description}</p>

          {/* Key Points */}
          {slide.key_points && slide.key_points.length > 0 && (
            <div className="space-y-3">
              {slide.key_points.map((point: string, i: number) => (
                <div key={i} className="flex items-start gap-3 bg-white p-4 rounded-xl" style={{ boxShadow: cardShadow }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 mt-0.5 text-sm font-bold" style={{ background: accent }}>
                    {i + 1}
                  </div>
                  <p className="text-[#2d3a30] text-sm leading-relaxed">{point}</p>
                </div>
              ))}
            </div>
          )}

          {/* Analogy */}
          {slide.analogy && (
            <div className="bg-[#f0f5f1] border-l-4 border-[#7ba884] p-5 rounded-r-xl">
              <p className="text-sm font-semibold text-[#5c8564] mb-1 uppercase tracking-wide">💡 Analogy</p>
              <p className="text-[#2d3a30] italic leading-relaxed">{slide.analogy}</p>
            </div>
          )}

          {/* Pro Tip */}
          {slide.pro_tip && (
            <div className="bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] text-white p-5 rounded-xl" style={{ boxShadow: '0 6px 20px rgba(30,58,138,0.3)' }}>
              <p className="text-sm font-bold mb-1">⚡ Pro Tip</p>
              <p className="text-sm leading-relaxed opacity-95">{slide.pro_tip}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Comparison Slide ───────────────────────────────────────
function ComparisonSlide({ slide, index }: { slide: any; index: number }) {
  return (
    <div className="w-full min-h-[600px] p-8 md:p-14 flex flex-col justify-center relative" style={{ background: 'linear-gradient(160deg, #eef5f0 0%, #dce9df 100%)' }}>
      <div className="absolute top-8 right-8 text-[#b8d4bd] font-extrabold text-8xl opacity-20 select-none" style={headingFont}>
        {String(index + 1).padStart(2, '0')}
      </div>

      <h2 className="text-3xl md:text-4xl font-extrabold text-[#1a3821] mb-4 text-center" style={headingFont}>
        {slide.title}
      </h2>
      <p className="text-center text-[#3d5a42] mb-10 max-w-2xl mx-auto">{slide.description}</p>

      <div className="flex flex-col md:flex-row items-stretch gap-6 md:gap-4 max-w-4xl mx-auto w-full">
        {/* Left Side */}
        <div className="flex-1 bg-white p-8 rounded-2xl text-center" style={{ boxShadow: cardShadow }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white mx-auto mb-4" style={{ background: iconBgColors[0], boxShadow: floatingShadow }}>
            {getIcon(slide.icon_concept, 28)}
          </div>
          <h3 className="text-xl font-bold text-[#1a3821] mb-3" style={headingFont}>{slide.left_label || 'Option A'}</h3>
          {slide.key_points && slide.key_points[0] && <p className="text-sm text-[#3d5a42]">{slide.key_points[0]}</p>}
        </div>

        {/* VS Divider */}
        <div className="flex items-center justify-center md:flex-col gap-2">
          <div className="h-px md:h-20 w-20 md:w-px bg-[#8bb593] opacity-50" />
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#1a3821] text-white shrink-0" style={{ boxShadow: floatingShadow }}>
            <ArrowRightLeft size={20} />
          </div>
          <div className="h-px md:h-20 w-20 md:w-px bg-[#8bb593] opacity-50" />
        </div>

        {/* Right Side */}
        <div className="flex-1 bg-white p-8 rounded-2xl text-center" style={{ boxShadow: cardShadow }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white mx-auto mb-4" style={{ background: iconBgColors[2], boxShadow: floatingShadow }}>
            {getIcon(slide.icon_concept, 28)}
          </div>
          <h3 className="text-xl font-bold text-[#1a3821] mb-3" style={headingFont}>{slide.right_label || 'Option B'}</h3>
          {slide.key_points && slide.key_points[1] && <p className="text-sm text-[#3d5a42]">{slide.key_points[1]}</p>}
        </div>
      </div>

      {/* Analogy + Pro Tip below */}
      {(slide.analogy || slide.pro_tip) && (
        <div className="mt-8 max-w-4xl mx-auto w-full flex flex-col md:flex-row gap-4">
          {slide.analogy && (
            <div className="flex-1 bg-[#f0f5f1] border-l-4 border-[#7ba884] p-4 rounded-r-xl">
              <p className="text-xs font-bold text-[#5c8564] uppercase mb-1">💡 Analogy</p>
              <p className="text-sm text-[#2d3a30] italic">{slide.analogy}</p>
            </div>
          )}
          {slide.pro_tip && (
            <div className="flex-1 bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] text-white p-4 rounded-xl">
              <p className="text-xs font-bold mb-1">⚡ Pro Tip</p>
              <p className="text-sm opacity-95">{slide.pro_tip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── List Slide (Source → Solution) ─────────────────────────
function ListSlide({ slide, index }: { slide: any; index: number }) {
  const items = slide.items || [];
  return (
    <div className="w-full min-h-[600px] p-8 md:p-14 flex flex-col justify-center" style={{ background: 'linear-gradient(160deg, #e6ede8 0%, #d0dfd3 100%)' }}>
      <div className="absolute top-8 right-8 text-[#b8d4bd] font-extrabold text-8xl opacity-20 select-none" style={headingFont}>
        {String(index + 1).padStart(2, '0')}
      </div>

      <h2 className="text-3xl md:text-4xl font-extrabold text-[#1a3821] mb-4 text-center" style={headingFont}>
        {slide.title}
      </h2>
      {slide.description && <p className="text-center text-[#3d5a42] mb-10 max-w-2xl mx-auto">{slide.description}</p>}

      <div className="space-y-5 max-w-3xl mx-auto w-full">
        {items.map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-4">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ background: iconBgColors[i % iconBgColors.length], boxShadow: floatingShadow }}
            >
              {getIcon(item.icon_concept || 'target', 22)}
            </div>

            {/* Source */}
            <span className="text-lg font-bold text-[#1a3821] min-w-[140px]" style={headingFont}>
              {item.source}
            </span>

            {/* Dotted Line */}
            <div className="flex-1 border-b-2 border-dashed border-[#8bb593] relative mx-2">
              <ArrowRight size={16} className="absolute -right-1 -top-2 text-[#5c8564]" />
            </div>

            {/* Solution Pill */}
            <div className="bg-[#f0f5f1] border border-[#b8d4bd] px-6 py-3 rounded-full text-sm font-bold text-[#1a3821] min-w-[160px] text-center"
              style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.08)' }}
            >
              {item.solution}
            </div>
          </div>
        ))}
      </div>

      {/* Pro Tip at bottom */}
      {slide.pro_tip && (
        <div className="mt-10 max-w-3xl mx-auto bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] text-white p-5 rounded-xl" style={{ boxShadow: '0 6px 20px rgba(30,58,138,0.3)' }}>
          <p className="text-sm font-bold mb-1">⚡ Pro Tip</p>
          <p className="text-sm leading-relaxed opacity-95">{slide.pro_tip}</p>
        </div>
      )}
    </div>
  );
}

// ─── Process Slide ──────────────────────────────────────────
function ProcessSlide({ slide, index }: { slide: any; index: number }) {
  const items = slide.items || [];
  return (
    <div className="w-full min-h-[600px] p-8 md:p-14 flex flex-col justify-center" style={{ background: 'linear-gradient(160deg, #f0f6f1 0%, #e3ede5 100%)' }}>
      <div className="absolute top-8 right-8 text-[#b8d4bd] font-extrabold text-8xl opacity-20 select-none" style={headingFont}>
        {String(index + 1).padStart(2, '0')}
      </div>

      <h2 className="text-3xl md:text-4xl font-extrabold text-[#1a3821] mb-4 text-center" style={headingFont}>
        {slide.title}
      </h2>
      {slide.description && <p className="text-center text-[#3d5a42] mb-10 max-w-2xl mx-auto">{slide.description}</p>}

      <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-2 max-w-5xl mx-auto w-full flex-wrap">
        {items.map((item: any, i: number) => (
          <React.Fragment key={i}>
            <div className="bg-white p-6 rounded-2xl text-center w-full md:w-44 shrink-0" style={{ boxShadow: cardShadow }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white mx-auto mb-3"
                style={{ background: iconBgColors[i % iconBgColors.length], boxShadow: floatingShadow }}
              >
                {getIcon(item.icon_concept || 'zap', 22)}
              </div>
              <p className="text-sm font-bold text-[#1a3821]" style={headingFont}>{item.source}</p>
              {item.solution && <p className="text-xs text-[#5c8564] mt-1">{item.solution}</p>}
            </div>
            {i < items.length - 1 && (
              <ArrowRight size={24} className="text-[#7ba884] shrink-0 hidden md:block" />
            )}
          </React.Fragment>
        ))}
      </div>

      {slide.pro_tip && (
        <div className="mt-10 max-w-3xl mx-auto bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] text-white p-5 rounded-xl" style={{ boxShadow: '0 6px 20px rgba(30,58,138,0.3)' }}>
          <p className="text-sm font-bold mb-1">⚡ Pro Tip</p>
          <p className="text-sm leading-relaxed opacity-95">{slide.pro_tip}</p>
        </div>
      )}
    </div>
  );
}

// ─── Golden Rule Slide ──────────────────────────────────────
function GoldenRuleSlide({ goldenRule, title }: { goldenRule: string; title: string }) {
  return (
    <div className="w-full min-h-[600px] flex flex-col items-center justify-center p-8 md:p-16 text-center text-white relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #1a3821 0%, #2d5a3d 50%, #3d6b4a 100%)' }}
    >
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: '#7ba884' }} />

      <Star className="text-yellow-400 mb-6" size={48} fill="currentColor" />

      <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-[#8bb593] mb-6">Golden Rule</h3>

      <p className="text-3xl md:text-5xl font-extrabold leading-tight max-w-3xl" style={headingFont}>
        "{goldenRule}"
      </p>

      <div className="mt-12 flex items-center gap-2 text-[#8bb593] text-sm font-semibold">
        <Zap size={14} /> {title} • Generated by Sovira AI
      </div>
    </div>
  );
}

// ─── Main Infographic Component ─────────────────────────────
export function Infographic({ data }: { data: any }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // ─── Normalize Data ─────────────────────────────
  let parsedData = { main_title: '', subtitle: '', golden_rule: '', slides: [] as any[] };

  if (Array.isArray(data)) {
    // Legacy format: array of sections
    parsedData.slides = data.map((s: any) => ({
      slide_type: 'concept',
      title: s.title || s.key_point || 'Untitled',
      icon_concept: s.icon_concept || 'target',
      description: s.description || s.details || '',
      key_points: s.tags || [],
    }));
    parsedData.main_title = 'Generated Infographic';
  } else if (data && typeof data === 'object') {
    parsedData.main_title = data.main_title || 'Infographic';
    parsedData.subtitle = data.subtitle || '';
    parsedData.golden_rule = data.golden_rule || '';
    // Support both "slides" and legacy "sections"
    parsedData.slides = Array.isArray(data.slides) ? data.slides :
      Array.isArray(data.sections) ? data.sections.map((s: any) => ({
        slide_type: 'concept',
        title: s.title || 'Untitled',
        icon_concept: s.icon_concept || 'target',
        description: s.description || '',
        key_points: s.tags || [],
      })) : [];
  }

  // Build all slides: Title + Content slides + Golden Rule (if exists)
  const totalContentSlides = parsedData.slides.length;
  const hasGoldenRule = !!parsedData.golden_rule;
  const totalSlides = 1 + totalContentSlides + (hasGoldenRule ? 1 : 0);

  const goNext = () => setCurrentSlide(prev => Math.min(prev + 1, totalSlides - 1));
  const goPrev = () => setCurrentSlide(prev => Math.max(prev - 1, 0));

  const renderCurrentSlide = () => {
    if (currentSlide === 0) {
      return <TitleSlide title={parsedData.main_title} subtitle={parsedData.subtitle} slideNum={1} totalSlides={totalSlides} />;
    }

    if (hasGoldenRule && currentSlide === totalSlides - 1) {
      return <GoldenRuleSlide goldenRule={parsedData.golden_rule} title={parsedData.main_title} />;
    }

    const slideIndex = currentSlide - 1;
    const slide = parsedData.slides[slideIndex];
    if (!slide) return null;

    const type = slide.slide_type || 'concept';
    switch (type) {
      case 'comparison': return <ComparisonSlide slide={slide} index={slideIndex} />;
      case 'list': return <ListSlide slide={slide} index={slideIndex} />;
      case 'process': return <ProcessSlide slide={slide} index={slideIndex} />;
      default: return <ConceptSlide slide={slide} index={slideIndex} />;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto rounded-3xl overflow-hidden relative" data-infographic-total={totalSlides} style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>

      {/* Slide Content */}
      <div className="relative" data-infographic-slide>
        {renderCurrentSlide()}
      </div>

      {/* Navigation Bar */}
      <div className="flex items-center justify-between p-4 bg-white border-t border-[#e0e8e2]">
        <button
          onClick={goPrev}
          disabled={currentSlide === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[#eaf2eb] text-[#1a3821] hover:bg-[#d4e4d7]"
        >
          <ChevronLeft size={18} /> Previous
        </button>

        {/* Slide Indicators */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              data-infographic-dot
              onClick={() => setCurrentSlide(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentSlide ? 'bg-[#1a3821] w-6' : 'bg-[#b8d4bd] hover:bg-[#8bb593]'}`}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          disabled={currentSlide === totalSlides - 1}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[#1a3821] text-white hover:bg-[#2d5a3d]"
        >
          Next <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
