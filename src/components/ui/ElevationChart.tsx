import React, { useMemo, useRef, useState } from 'react';
import type { ElevationProfile } from '../../services/elevationService';
import { useRouteStore } from '../../store/useRouteStore';

interface Props {
    profile: ElevationProfile;
    isDark: boolean;
}

const ElevationChart: React.FC<Props> = ({ profile, isDark }) => {
    const { samples, coordinates, minElevation, maxElevation } = profile;
    const { setHoveredPosition } = useRouteStore();

    const containerRef = useRef<SVGSVGElement>(null);
    const [localHoverIdx, setLocalHoverIdx] = useState<number | null>(null);

    const WIDTH = 320;
    const HEIGHT = 80;
    const PADDING = { top: 8, right: 8, bottom: 20, left: 36 };

    const chartW = WIDTH - PADDING.left - PADDING.right;
    const chartH = HEIGHT - PADDING.top - PADDING.bottom;
    const range = maxElevation - minElevation || 1;

    const points = useMemo(() => {
        if (samples.length <= 1) return `${PADDING.left},${PADDING.top + chartH}`;
        return samples.map((h, i) => {
            const x = PADDING.left + (i / (samples.length - 1)) * chartW;
            const y = PADDING.top + chartH - ((h - minElevation) / range) * chartH;
            return `${x},${y}`;
        }).join(' ');
    }, [samples, minElevation, range, chartW, chartH, PADDING.left, PADDING.top]);

    const areaPoints = useMemo(() => {
        const firstX = PADDING.left;
        const lastX = PADDING.left + chartW;
        const baseY = PADDING.top + chartH;
        return `${firstX},${baseY} ${points} ${lastX},${baseY}`;
    }, [points, chartW, chartH, PADDING.left, PADDING.top]);

    const textColor = isDark ? '#94a3b8' : '#64748b';
    const lineColor = '#FC4C02';
    const areaStart = isDark ? 'rgba(252, 76, 2, 0.4)' : 'rgba(252, 76, 2, 0.2)';
    const areaEnd = isDark ? 'rgba(252, 76, 2, 0)' : 'rgba(252, 76, 2, 0)';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    // Generate 3 y-axis labels
    const yLabels = [maxElevation, Math.round((maxElevation + minElevation) / 2), minElevation];

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * WIDTH;

        const chartX = x - PADDING.left;
        if (chartX < 0 || chartX > chartW) {
            setLocalHoverIdx(null);
            setHoveredPosition(null);
            return;
        }

        const ratio = chartX / chartW;
        const idx = samples.length > 1 ? Math.round(ratio * (samples.length - 1)) : 0;

        if (idx >= 0 && idx < samples.length) {
            setLocalHoverIdx(idx);
            setHoveredPosition(coordinates[idx] as [number, number]);
        }
    };

    const handleMouseLeave = () => {
        setLocalHoverIdx(null);
        setHoveredPosition(null);
    };

    return (
        <svg
            ref={containerRef}
            width="100%"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ display: 'block', cursor: 'crosshair' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <defs>
                <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={areaStart} />
                    <stop offset="100%" stopColor={areaEnd} />
                </linearGradient>
            </defs>

            {/* Grid lines */}
            {yLabels.map((val, i) => {
                const y = PADDING.top + (i / (yLabels.length - 1)) * chartH;
                return (
                    <g key={i}>
                        <line
                            x1={PADDING.left} y1={y}
                            x2={PADDING.left + chartW} y2={y}
                            stroke={gridColor} strokeWidth={1}
                        />
                        <text
                            x={PADDING.left - 4} y={y + 3}
                            textAnchor="end"
                            fontSize={8}
                            fill={textColor}
                            fontFamily="Inter, sans-serif"
                        >
                            {Math.round(val)}m
                        </text>
                    </g>
                );
            })}

            {/* Filled area */}
            <polygon points={areaPoints} fill="url(#elevGrad)" />

            {/* Elevation line */}
            <polyline
                points={points}
                fill="none"
                stroke={lineColor}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* X-axis baseline */}
            <line
                x1={PADDING.left} y1={PADDING.top + chartH}
                x2={PADDING.left + chartW} y2={PADDING.top + chartH}
                stroke={gridColor} strokeWidth={1}
            />

            {/* Hover Guide & Tooltip */}
            {localHoverIdx !== null && (
                <g>
                    <line
                        x1={PADDING.left + (samples.length > 1 ? (localHoverIdx / (samples.length - 1)) * chartW : 0)}
                        y1={PADDING.top}
                        x2={PADDING.left + (samples.length > 1 ? (localHoverIdx / (samples.length - 1)) * chartW : 0)}
                        y2={PADDING.top + chartH}
                        stroke={isDark ? '#fff' : '#000'}
                        strokeWidth={1}
                        strokeDasharray="4 2"
                    />

                    {/* Tooltip Background */}
                    <rect
                        x={Math.max(0, Math.min(WIDTH - 70, PADDING.left + (samples.length > 1 ? (localHoverIdx / (samples.length - 1)) * chartW : 0) - 35))}
                        y={0}
                        width={70}
                        height={24}
                        fill={isDark ? '#1e293b' : '#fff'}
                        stroke={lineColor}
                        strokeWidth={2}
                        rx={4}
                    />

                    {/* Tooltip Text */}
                    <text
                        x={Math.max(35, Math.min(WIDTH - 35, PADDING.left + (samples.length > 1 ? (localHoverIdx / (samples.length - 1)) * chartW : 0)))}
                        y={15}
                        textAnchor="middle"
                        fontSize={9}
                        fontWeight="900"
                        fill={isDark ? '#fff' : '#1e293b'}
                        fontFamily="Inter, sans-serif"
                    >
                        {Math.round(samples[localHoverIdx])}m
                        {localHoverIdx > 0 && ` (${Math.round(((samples[localHoverIdx] - samples[localHoverIdx - 1]) / 50) * 100)}%)`}
                    </text>

                    <circle
                        cx={PADDING.left + (samples.length > 1 ? (localHoverIdx / (samples.length - 1)) * chartW : 0)}
                        cy={PADDING.top + chartH - ((samples[localHoverIdx] - minElevation) / range) * chartH}
                        r={4}
                        fill={lineColor}
                        stroke="#fff"
                        strokeWidth={2}
                    />
                </g>
            )}
        </svg>
    );
};

export default ElevationChart;
