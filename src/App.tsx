import { useState } from 'react';
import { Gallery } from './components/Gallery';
import type { ImageItem, LayoutType } from './types';
import './styles/theme.css';
import './App.css';

const demoImages: ImageItem[] = [
  { id: '1', src: 'https://picsum.photos/id/10/800/600', alt: 'Forest path', width: 800, height: 600 },
  { id: '2', src: 'https://picsum.photos/id/11/800/1200', alt: 'Dark lake', width: 800, height: 1200 },
  { id: '3', src: 'https://picsum.photos/id/14/1200/600', alt: 'Mountain bridge', width: 1200, height: 600 },
  { id: '4', src: 'https://picsum.photos/id/15/800/800', alt: 'Hillside', width: 800, height: 800 },
  { id: '5', src: 'https://picsum.photos/id/16/800/500', alt: 'Calm waters', width: 800, height: 500 },
  { id: '6', src: 'https://picsum.photos/id/17/800/1100', alt: 'Pier', width: 800, height: 1100 },
  { id: '7', src: 'https://picsum.photos/id/18/800/600', alt: 'Misty forest', width: 800, height: 600 },
  { id: '8', src: 'https://picsum.photos/id/19/800/500', alt: 'Sunset sky', width: 800, height: 500 },
  { id: '9', src: 'https://picsum.photos/id/20/1200/800', alt: 'Bird perched', width: 1200, height: 800 },
  { id: '10', src: 'https://picsum.photos/id/21/800/1000', alt: 'Coastal cliff', width: 800, height: 1000 },
  { id: '11', src: 'https://picsum.photos/id/22/800/600', alt: 'Ocean waves', width: 800, height: 600 },
  { id: '12', src: 'https://picsum.photos/id/24/1200/700', alt: 'Book pages', width: 1200, height: 700 },
];

const layouts: LayoutType[] = ['grid', 'masonry', 'justified'];
const gapOptions = [8, 16, 24, 32];

function App() {
  const [layout, setLayout] = useState<LayoutType>('grid');
  const [gap, setGap] = useState(16);
  const [selected, setSelected] = useState<ImageItem | null>(null);

  return (
    <div className="demo">
      <header className="demo-header">
        <h1>hexi-photo-gallery</h1>
        <p className="demo-subtitle">A configurable React photo gallery component</p>
      </header>

      <div className="demo-controls">
        <div className="control-group">
          <label>Layout</label>
          <div className="button-group">
            {layouts.map((l) => (
              <button
                key={l}
                className={layout === l ? 'active' : ''}
                onClick={() => setLayout(l)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <label>Gap</label>
          <div className="button-group">
            {gapOptions.map((g) => (
              <button
                key={g}
                className={gap === g ? 'active' : ''}
                onClick={() => setGap(g)}
              >
                {g}px
              </button>
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <div className="demo-selected" onClick={() => setSelected(null)}>
          Clicked: <strong>{selected.alt}</strong> ({selected.width}x{selected.height})
          <span className="dismiss">dismiss</span>
        </div>
      )}

      <Gallery
        images={demoImages}
        layout={{ type: layout, gap }}
        onImageClick={(image) => setSelected(image)}
      />
    </div>
  );
}

export default App;
