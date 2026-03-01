import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { ICONIC_SEGMENTS } from '../../services/segmentService';

interface SegmentLayerProps {
    map: maplibregl.Map;
}

const SegmentLayer: React.FC<SegmentLayerProps> = ({ map }) => {
    const markersRef = useRef<maplibregl.Marker[]>([]);

    useEffect(() => {
        if (!map) return;

        // Clear existing markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        // Create markers for each iconic segment
        ICONIC_SEGMENTS.forEach(segment => {
            const el = document.createElement('div');
            el.className = 'segment-marker';
            el.style.cssText = `
                width: 32px;
                height: 32px;
                background: #FC4C02;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 0 10px rgba(0,0,0,0.3), 2px 2px 0px #1e293b;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: transform 0.2s;
            `;

            const icon = document.createElement('div');
            icon.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>';
            el.appendChild(icon);

            el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2) translateY(-4px)'; });
            el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

            const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
                .setHTML(`
                    <div style="padding: 12px; font-family: 'Inter', sans-serif; min-width: 150px;">
                        <div style="text-transform: uppercase; font-size: 10px; font-weight: 900; color: #FC4C02; margin-bottom: 2px;">Segment Mythique</div>
                        <div style="font-weight: 900; font-size: 14px; margin-bottom: 4px; color: #1e293b;">${segment.name}</div>
                        <div style="display: flex; gap: 8px; font-size: 12px; font-weight: 700; color: #64748b;">
                            <span>${segment.distanceKm} km</span>
                            <span>•</span>
                            <span>${segment.avgGrade}% moy.</span>
                        </div>
                    </div>
                `);

            const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
                .setLngLat([segment.coordinates[0], segment.coordinates[1]])
                .setPopup(popup)
                .addTo(map);

            markersRef.current.push(marker);
        });

        return () => {
            markersRef.current.forEach(m => m.remove());
        };
    }, [map]);

    return null;
};

export default SegmentLayer;
