import { useReducer, useCallback, useMemo } from 'react';
import type { ConfiguratorState, ImageItem, LayoutOptions, LayoutType, ThemeTokens } from '../types';
import { DEFAULT_LAYOUT } from '../types';

type ConfigAction =
  | { type: 'SET_LAYOUT'; payload: Partial<LayoutOptions> }
  | { type: 'SET_IMAGES'; payload: ImageItem[] }
  | { type: 'SET_THEME'; payload: Partial<ThemeTokens> }
  | { type: 'SET_SHUFFLE'; payload: boolean }
  | { type: 'RESET' }
  | { type: 'RESTORE'; payload: ConfiguratorState };

const initialState: ConfiguratorState = {
  images: [],
  layout: { ...DEFAULT_LAYOUT },
  theme: undefined,
  shuffle: false,
};

function reducer(state: ConfiguratorState, action: ConfigAction): ConfiguratorState {
  switch (action.type) {
    case 'SET_LAYOUT':
      return { ...state, layout: { ...state.layout, ...action.payload } };
    case 'SET_IMAGES':
      return { ...state, images: action.payload };
    case 'SET_THEME':
      return { ...state, theme: { ...state.theme, ...action.payload } };
    case 'SET_SHUFFLE':
      return { ...state, shuffle: action.payload };
    case 'RESET':
      return { ...initialState };
    case 'RESTORE':
      return action.payload;
    default:
      return state;
  }
}

function generateCodeString(state: ConfiguratorState): string {
  const props: string[] = [];

  if (state.layout.type !== DEFAULT_LAYOUT.type) {
    props.push(`  layout={{ type: '${state.layout.type}'`);

    const extras: string[] = [];
    if (state.layout.gap !== DEFAULT_LAYOUT.gap) {
      extras.push(`gap: ${state.layout.gap}`);
    }
    if (state.layout.columns !== DEFAULT_LAYOUT.columns) {
      extras.push(
        `columns: ${typeof state.layout.columns === 'string' ? `'${state.layout.columns}'` : state.layout.columns}`
      );
    }
    if (state.layout.type === 'justified' && state.layout.rowHeight) {
      extras.push(`rowHeight: ${state.layout.rowHeight}`);
    }
    if (state.layout.type === 'showcase' && state.layout.thumbnailHeight) {
      extras.push(`thumbnailHeight: ${state.layout.thumbnailHeight}`);
    }

    if (extras.length > 0) {
      props[props.length - 1] += `, ${extras.join(', ')}`;
    }
    props[props.length - 1] += ' }}';
  } else if (state.layout.gap !== DEFAULT_LAYOUT.gap) {
    props.push(`  layout={{ type: '${state.layout.type}', gap: ${state.layout.gap} }}`);
  }

  props.push('  enableLightbox');

  if (state.shuffle) {
    props.push('  shuffle');
  }

  const imagesProp = 'images={images}';

  return `<Gallery\n  ${imagesProp}\n${props.join('\n')}\n/>`;
}

export function useConfigurator(initialOverride?: Partial<ConfiguratorState>) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    ...initialOverride,
  });

  const setLayout = useCallback((layout: Partial<LayoutOptions>) => {
    dispatch({ type: 'SET_LAYOUT', payload: layout });
  }, []);

  const setLayoutType = useCallback((type: LayoutType) => {
    dispatch({ type: 'SET_LAYOUT', payload: { type } });
  }, []);

  const setImages = useCallback((images: ImageItem[]) => {
    dispatch({ type: 'SET_IMAGES', payload: images });
  }, []);

  const setTheme = useCallback((theme: Partial<ThemeTokens>) => {
    dispatch({ type: 'SET_THEME', payload: theme });
  }, []);

  const setShuffle = useCallback((shuffle: boolean) => {
    dispatch({ type: 'SET_SHUFFLE', payload: shuffle });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const restore = useCallback((saved: ConfiguratorState) => {
    dispatch({ type: 'RESTORE', payload: saved });
  }, []);

  const exportCode = useMemo(() => generateCodeString(state), [state]);

  return {
    state,
    setLayout,
    setLayoutType,
    setImages,
    setTheme,
    setShuffle,
    reset,
    restore,
    exportCode,
  };
}
