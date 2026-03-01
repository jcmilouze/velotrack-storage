import React, { useMemo } from 'react';
import type { ElevationProfile } from '../../services/elevationService';

interface Props {
    profile: ElevationProfile;
    isDark: boolean;
}

const ElevationChart: React.FC<Props> = ({ profile, isDark }) => {
    const { samples, minElevation, maxElevation } = profile;

    const WIDTH = 320;
    const HEIGHT = 80;
    const PADDING = { top: 8, right: 8, bottom: 20, left: 36 };

    const chartW = WIDTH - PADDING.left - PADDING.right;
    const chartH = HEIGHT - PADDING.top - PADDING.bottom;
    const range = maxElevation - minElevation || 1;

    const points = useMemo(() => {
        return samples.map((h, i) => {
            const x = PADDING.left + (i / (samples.length - 1)) * chartW;
            const y = PADDING.top + chartH - ((h - minElevation) / range) * chartH;
            return `${x},${y}`;
        }).join(' ');
    }, [samples, minElevation, range, chartW, chartH]);

    const areaPoints = useMemo(() => {
        const firstX = PADDING.left;
        const lastX = PADDING.left + chartW;
        const baseY = PADDING.top + chartH;
        return `${firstX},${baseY} ${points} ${lastX},${baseY}`;
    }, [points, chartW, chartH]);

    const textColor = isDark ? '#94a3b8' : '#64748b';
    const lineColor = '#FC4C02';
    const areaStart = isDark ? 'rgba(252, 76, 2, 0.4)' : 'rgba(252, 76, 2, 0.2)';
    const areaEnd = isDark ? 'rgba(252, 76, 2, 0)' : 'rgba(252, 76, 2, 0)';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    // Generate 3 y-axis labels
    const yLabels = [maxElevation, Math.round((maxElevation + minElevation) / 2), minElevation];

    return (
        <svg
            width="100%"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ display: 'block' }}
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
        </svg>
    );
};

export default ElevationChart;
