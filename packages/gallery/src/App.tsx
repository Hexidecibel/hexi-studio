import { useState, useMemo, useEffect, useRef } from 'react';
import { Gallery } from './components/Gallery';
import { ConfiguratorPanel } from './components/Configurator';
import { EmptyState } from './components/Configurator/EmptyState';
import { useConfigurator } from './hooks/useConfigurator';
import { useGalleryPerf } from './hooks/useGalleryPerf';
import type { MediaItem, LayoutType } from './types';
import './styles/theme.css';
import './App.css';

// 12 curated images for hero/demo
const heroImages: MediaItem[] = [
  { id: 'h1', src: 'https://picsum.photos/id/10/800/600', alt: 'Forest path', width: 800, height: 600, title: 'Forest Path', description: 'A winding trail through dense forest' },
  { id: 'h2', src: 'https://picsum.photos/id/11/800/1200', alt: 'Dark lake', width: 800, height: 1200, title: 'Dark Lake', description: 'Still waters reflecting the sky' },
  { id: 'h3', src: 'https://picsum.photos/id/14/1200/600', alt: 'Mountain bridge', width: 1200, height: 600, title: 'Mountain Bridge' },
  { id: 'h4', src: 'https://picsum.photos/id/15/800/800', alt: 'Hillside', width: 800, height: 800, title: 'Hillside' },
  { id: 'h5', src: 'https://picsum.photos/id/16/800/500', alt: 'Calm waters', width: 800, height: 500, title: 'Calm Waters', description: 'Peaceful ocean scene at dawn' },
  { id: 'h6', src: 'https://picsum.photos/id/17/800/1100', alt: 'Pier', width: 800, height: 1100, title: 'The Pier' },
  { id: 'h7', src: 'https://picsum.photos/id/18/800/600', alt: 'Misty forest', width: 800, height: 600, title: 'Misty Forest', description: 'Early morning fog between the trees' },
  { id: 'h8', src: 'https://picsum.photos/id/19/800/500', alt: 'Sunset sky', width: 800, height: 500, title: 'Sunset Sky' },
  { id: 'h9', src: 'https://picsum.photos/id/20/1200/800', alt: 'Bird perched', width: 1200, height: 800, title: 'Bird Perched' },
  { id: 'h10', src: 'https://picsum.photos/id/21/800/1000', alt: 'Coastal cliff', width: 800, height: 1000, title: 'Coastal Cliff', description: 'Dramatic cliffs meeting the sea' },
  { id: 'h11', src: 'https://picsum.photos/id/22/800/600', alt: 'Ocean waves', width: 800, height: 600, title: 'Ocean Waves' },
  { id: 'h12', src: 'https://picsum.photos/id/24/1200/700', alt: 'Book pages', width: 1200, height: 700, title: 'Book Pages', description: 'Open book with golden light' },
  { id: 'v1', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', alt: 'Flames', width: 1280, height: 720, title: 'For Bigger Blazes', description: 'A short video demo', type: 'video', poster: 'https://picsum.photos/id/25/1280/720', duration: 15 },
  { id: 'v2', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', alt: 'Adventure', width: 1280, height: 720, title: 'For Bigger Escapes', type: 'video', poster: 'https://picsum.photos/id/26/1280/720', duration: 15 },
];

// Generate 200+ images for perf demo using picsum with various aspect ratios
function generatePerfImages(count: number): MediaItem[] {
  const ratios = [
    { w: 800, h: 600 },
    { w: 600, h: 800 },
    { w: 800, h: 800 },
    { w: 1200, h: 600 },
    { w: 800, h: 500 },
    { w: 600, h: 900 },
    { w: 1000, h: 700 },
    { w: 700, h: 1000 },
  ];
  return Array.from({ length: count }, (_, i) => {
    const r = ratios[i % ratios.length];
    const picId = (i % 80) + 10; // picsum IDs 10-89
    return {
      id: `perf-${i}`,
      src: `https://picsum.photos/id/${picId}/${r.w}/${r.h}`,
      alt: `Photo ${i + 1}`,
      width: r.w,
      height: r.h,
      title: `Photo ${i + 1}`,
    };
  });
}

const layouts: LayoutType[] = ['grid', 'masonry', 'justified'];

function App() {
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [heroLayout, setHeroLayout] = useState<LayoutType>('justified');
  const [heroGap, setHeroGap] = useState(8);
  const [comparisonGap, setComparisonGap] = useState(12);
  const [perfImageCount, setPerfImageCount] = useState(200);
  const [perfLayout, setPerfLayout] = useState<LayoutType>('grid');
  const [theme, setTheme] = useState<'light' | 'dark' | 'custom'>('dark');
  const [previewWidth, setPreviewWidth] = useState(0);

  const configurator = useConfigurator({
    images: heroImages,
  });

  const perfImages = useMemo(() => generatePerfImages(perfImageCount), [perfImageCount]);
  const perf = useGalleryPerf(perfImages.length);

  const perfSectionRef = useRef<HTMLElement>(null);
  const [perfVisible, setPerfVisible] = useState(false);

  useEffect(() => {
    const node = perfSectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setPerfVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const sections = [
    { id: 'hero', label: 'Hero' },
    { id: 'layouts', label: 'Layouts' },
    { id: 'configurator', label: 'Configurator' },
    { id: 'performance', label: 'Performance' },
    { id: 'theming', label: 'Theming' },
  ];

  return (
    <div className={`demo ${theme === 'custom' ? 'demo-custom-theme' : ''}`} data-theme={theme}>
      <header className="demo-header">
        <h1>hexi-photo-gallery</h1>
        <p className="demo-subtitle">
          A beautiful, configurable photo gallery component for React
        </p>
        <nav className="demo-nav">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`demo-nav-link ${activeSection === s.id ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); setActiveSection(s.id); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              {s.label}
            </a>
          ))}
        </nav>
      </header>

      {/* Hero — Justified gallery */}
      <section id="hero" className="demo-section">
        <div className="section-header">
          <h2>Gallery Showcase</h2>
          <div className="demo-controls">
            <div className="control-group">
              <label>Layout</label>
              <div className="button-group">
                {layouts.map((l) => (
                  <button key={l} className={heroLayout === l ? 'active' : ''} onClick={() => setHeroLayout(l)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="control-group">
              <label>Gap</label>
              <div className="button-group">
                {[4, 8, 16, 24].map((g) => (
                  <button key={g} className={heroGap === g ? 'active' : ''} onClick={() => setHeroGap(g)}>
                    {g}px
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Gallery
          images={heroImages}
          layout={{ type: heroLayout, gap: heroGap }}
          enableLightbox
          enableDownload
          enableSlideshow
        />
      </section>

      {/* Layout Comparison */}
      <section id="layouts" className="demo-section">
        <div className="section-header">
          <h2>Layout Comparison</h2>
          <p className="section-desc">Three layout algorithms, side by side. Same images, different presentations.</p>
          <div className="demo-controls">
            <div className="control-group">
              <label>Gap</label>
              <div className="button-group">
                {[4, 8, 12, 16].map((g) => (
                  <button key={g} className={comparisonGap === g ? 'active' : ''} onClick={() => setComparisonGap(g)}>
                    {g}px
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="layout-comparison">
          {layouts.map((l) => (
            <div key={l} className="layout-column">
              <h3 className="layout-label">{l}</h3>
              <Gallery
                images={heroImages.slice(0, 6)}
                layout={{ type: l, gap: comparisonGap, ...(l === 'justified' ? { rowHeight: 160 } : {}) }}
                enableLightbox
                enableDownload
                enableSlideshow
              />
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Configurator */}
      <section id="configurator" className="demo-section">
        <div className="section-header">
          <h2>Interactive Configurator</h2>
          <p className="section-desc">Tweak layout, spacing, theme, and image source. Copy the generated code.</p>
        </div>
        <ConfiguratorPanel
          state={configurator.state}
          exportCode={configurator.exportCode}
          onLayoutChange={configurator.setLayout}
          onLayoutTypeChange={configurator.setLayoutType}
          onImagesChange={configurator.setImages}
          onReset={configurator.reset}
          previewWidth={previewWidth}
          onPreviewWidthChange={setPreviewWidth}
        >
          <div className="configurator-preview" style={previewWidth > 0 ? { maxWidth: previewWidth } : undefined}>
            {configurator.state.images.length === 0 ? (
              <EmptyState
                onPasteUrls={() => configurator.setImages(heroImages)}
                onUpload={() => configurator.setImages(heroImages)}
                onSample={() => configurator.setImages(heroImages)}
              />
            ) : (
              <Gallery
                images={configurator.state.images}
                layout={configurator.state.layout}
                enableLightbox
                enableDownload
                enableSlideshow
              />
            )}
          </div>
        </ConfiguratorPanel>
      </section>

      {/* Performance Demo — 200+ images */}
      <section id="performance" ref={perfSectionRef} className="demo-section">
        <div className="section-header">
          <h2>Performance Demo</h2>
          <p className="section-desc">
            {perfImageCount} images with lazy loading and virtualization.
          </p>
          <div className="demo-controls">
            <div className="control-group">
              <label>Images</label>
              <div className="button-group">
                {[50, 100, 200, 500].map((c) => (
                  <button key={c} className={perfImageCount === c ? 'active' : ''} onClick={() => setPerfImageCount(c)}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="control-group">
              <label>Layout</label>
              <div className="button-group">
                {layouts.map((l) => (
                  <button key={l} className={perfLayout === l ? 'active' : ''} onClick={() => setPerfLayout(l)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="perf-stats">
            <span>Loaded: {perf.imagesLoaded}/{perf.imagesTotal}</span>
            <span>Progress: {Math.round(perf.loadProgress * 100)}%</span>
            {perf.timeToFirstImage !== null && (
              <span>First image: {perf.timeToFirstImage.toFixed(0)}ms</span>
            )}
          </div>
        </div>
        <Gallery
          images={perfImages}
          layout={{ type: perfLayout, gap: 8 }}
          enableLightbox
          enableDownload
          enableSlideshow
          virtualize
          onImageLoad={perf.onImageLoad}
        />
      </section>

      {/* Theming Demo */}
      <section id="theming" className="demo-section">
        <div className="section-header">
          <h2>Theming</h2>
          <p className="section-desc">Switch between light, dark, and custom themes. Gallery adapts automatically.</p>
          <div className="demo-controls">
            <div className="control-group">
              <label>Theme</label>
              <div className="button-group">
                {(['light', 'dark', 'custom'] as const).map((t) => (
                  <button key={t} className={theme === t ? 'active' : ''} onClick={() => setTheme(t)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className={`theme-demo-container theme-${theme}`}>
          <Gallery
            images={heroImages.slice(0, 8)}
            layout={{ type: 'masonry', gap: 12 }}
            enableLightbox
            enableDownload
            enableSlideshow
          />
        </div>
      </section>

      {perfVisible && (
        <div className="perf-floating">
          <div className="perf-floating-title">Performance</div>
          <div className="perf-floating-row">
            <span className="perf-floating-label">Loaded</span>
            <span className="perf-floating-value">{perf.imagesLoaded}/{perf.imagesTotal}</span>
          </div>
          <div className="perf-floating-bar">
            <div className="perf-floating-bar-fill" style={{ width: `${Math.round(perf.loadProgress * 100)}%` }} />
          </div>
          <div className="perf-floating-row">
            <span className="perf-floating-label">Progress</span>
            <span className="perf-floating-value">{Math.round(perf.loadProgress * 100)}%</span>
          </div>
          {perf.timeToFirstImage !== null && (
            <div className="perf-floating-row">
              <span className="perf-floating-label">First image</span>
              <span className="perf-floating-value">{perf.timeToFirstImage.toFixed(0)}ms</span>
            </div>
          )}
          {perf.timeToAllImages !== null && (
            <div className="perf-floating-row">
              <span className="perf-floating-label">All loaded</span>
              <span className="perf-floating-value">{perf.timeToAllImages.toFixed(0)}ms</span>
            </div>
          )}
        </div>
      )}

      <footer className="demo-footer">
        <p>
          Built with React + TypeScript. Zero dependencies.
          <br />
          <a href="https://github.com/hexi/gallery" className="demo-link">GitHub</a>
          {' | '}
          <a href="https://www.npmjs.com/package/@hexi/gallery" className="demo-link">npm</a>
        </p>
      </footer>
    </div>
  );
}

export default App;
