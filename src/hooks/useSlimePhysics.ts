import { useRef, useEffect, useCallback } from 'react';
import { Dimensions } from 'react-native';
import { Expression } from '../components/Slime';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const CANVAS_H = SCREEN_HEIGHT * 0.72;

export interface SlimeData {
  id: string;
  color: string;
  size: number;
  x: number;
  y: number;
  text: string;
  expression: Expression;
  createdAt: number;
}

export function useSlimePhysics(
  setSlimes: React.Dispatch<React.SetStateAction<SlimeData[]>>,
) {
  const draggingIdsRef = useRef<Set<string>>(new Set());
  const velocitiesRef = useRef<Map<string, { vx: number; vy: number }>>(new Map());

  const triggerShake = useCallback(() => {
    const vels = velocitiesRef.current;
    for (const id of vels.keys()) {
      const angle = Math.random() * Math.PI * 2;
      const power = 2.5 + Math.random() * 2.5;
      vels.set(id, {
        vx: Math.cos(angle) * power,
        vy: Math.sin(angle) * power,
      });
    }
  }, []);

  useEffect(() => {
    const MAX_SPEED = 1.8;
    const DAMPING = 0.95;
    const DRIFT = 0.03;
    const COHESION = 0.021;

    const intervalId = setInterval(() => {
      setSlimes(prev => {
        if (prev.length === 0) return prev;

        const vels = velocitiesRef.current;
        const dragging = draggingIdsRef.current;

        for (const s of prev) {
          if (!vels.has(s.id)) {
            vels.set(s.id, {
              vx: (Math.random() - 0.5) * 0.4,
              vy: (Math.random() - 0.5) * 0.4,
            });
          }
        }
        const activeIds = new Set(prev.map(s => s.id));
        for (const k of vels.keys()) {
          if (!activeIds.has(k)) vels.delete(k);
        }

        let changed = false;
        const next = prev.map(slime => {
          if (dragging.has(slime.id)) return slime;

          let { vx, vy } = vels.get(slime.id)!;

          // 무작위 표류
          vx += (Math.random() - 0.5) * DRIFT;
          vy += (Math.random() - 0.5) * DRIFT;

          // 같은 감정끼리 군집
          const peers = prev.filter(s => s.id !== slime.id && s.expression === slime.expression);
          if (peers.length > 0) {
            const cx = peers.reduce((acc, p) => acc + p.x + p.size * 0.41, 0) / peers.length;
            const cy = peers.reduce((acc, p) => acc + p.y + p.size * 0.5, 0) / peers.length;
            const dx = cx - (slime.x + slime.size * 0.41);
            const dy = cy - (slime.y + slime.size * 0.5);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const avgMinDist = peers.reduce((acc, p) => acc + (slime.size + p.size) * 0.42, 0) / peers.length;
            if (dist > avgMinDist * 0.5 && dist < 320) {
              const force = Math.min((dist - avgMinDist) / 120, 1) * COHESION;
              vx += (dx / dist) * force;
              vy += (dy / dist) * force;
            }
          }

          // 충돌 바운스 (모든 슬라임)
          for (const other of prev) {
            if (other.id === slime.id) continue;
            const dx = (slime.x + slime.size * 0.41) - (other.x + other.size * 0.41);
            const dy = (slime.y + slime.size * 0.5) - (other.y + other.size * 0.5);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const touchDist = (slime.size + other.size) * 0.42;
            if (dist < touchDist && dist > 0.5) {
              const nx = dx / dist;
              const ny = dy / dist;
              const relVel = vx * nx + vy * ny;
              if (relVel < 0) {
                vx -= 1.8 * relVel * nx;
                vy -= 1.8 * relVel * ny;
                if (other.expression !== slime.expression) {
                  const side = Math.random() > 0.5 ? 1 : -1;
                  vx += side * ny * 0.4;
                  vy += -side * nx * 0.4;
                }
              } else if (dist < touchDist * 0.4) {
                vx += nx * 0.4;
                vy += ny * 0.4;
              }
            }
          }

          vx *= DAMPING;
          vy *= DAMPING;

          const speed = Math.sqrt(vx * vx + vy * vy);
          if (speed > MAX_SPEED) {
            vx = (vx / speed) * MAX_SPEED;
            vy = (vy / speed) * MAX_SPEED;
          }

          let newX = slime.x + vx;
          let newY = slime.y + vy;

          const maxX = SCREEN_WIDTH - slime.size * 0.82 - 8;
          const maxY = CANVAS_H - slime.size - 8;
          if (newX < 8) { vx = Math.abs(vx) * 0.5; newX = 8; }
          else if (newX > maxX) { vx = -Math.abs(vx) * 0.5; newX = maxX; }
          if (newY < 8) { vy = Math.abs(vy) * 0.5; newY = 8; }
          else if (newY > maxY) { vy = -Math.abs(vy) * 0.5; newY = maxY; }

          vels.set(slime.id, { vx, vy });

          if (Math.abs(newX - slime.x) > 0.05 || Math.abs(newY - slime.y) > 0.05) {
            changed = true;
            return { ...slime, x: newX, y: newY };
          }
          return slime;
        });

        return changed ? next : prev;
      });
    }, 50); // 20fps

    return () => clearInterval(intervalId);
  }, []);

  return { draggingIdsRef, triggerShake };
}
