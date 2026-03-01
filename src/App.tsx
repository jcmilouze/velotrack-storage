import React from 'react';
import MapView from './components/map/MapView';
import OverlayUI from './components/ui/OverlayUI';
import BottomSheet from './components/ui/BottomSheet';
import { MapProvider } from './context/MapContext';
import { useRouteStore } from './store/useRouteStore';

function App() {
  const { theme } = useRouteStore();

  return (
    <MapProvider theme={theme}>
      <main
        className={`relative h-screen w-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'}`}
        data-theme={theme}
      >
        <div id="map-container" className="absolute inset-0 z-0 h-full w-full" style={{ background: theme === 'dark' ? '#0f172a' : '#f1f5f9' }} />
        <MapView />
        <OverlayUI />
        <BottomSheet />
      </main>
    </MapProvider>
  );
}

export default App;
