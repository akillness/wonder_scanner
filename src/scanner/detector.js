import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { WONDERS } from '../data/wonders.js';
import { BALANCE } from '../game/balance.js';

let model = null;

/** 온디바이스 모델 로드 (lite_mobilenet_v2: 모바일에서 가장 빠름) */
export async function loadDetector(onStatus = () => {}) {
  if (model) return model;
  onStatus('렌즈 초기화 중…');
  await tf.ready();
  onStatus(`렌즈 회로 연결 (${tf.getBackend()})`);
  model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
  onStatus('원더 감지 준비 완료');
  return model;
}

/** 가장 유력한 원더 타깃 1개 반환. 없으면 null.
 *  heldLabel: 이미 잠긴 라벨 — 새 잠금은 minConfidence 이상만, 잠긴 라벨의 추적 유지는 (minConfidence − weakDelta) 까지 허용(연속성 ↑) */
export async function detectTarget(source, heldLabel = null) {
  if (!model) return null;
  const min = BALANCE.resonance.minConfidence, D = BALANCE.detect ?? { weakDelta: 0.15, centerWeight: 0.15 };
  const weakMin = Math.max(0.2, min - D.weakDelta);
  const preds = await model.detect(source, 6, weakMin);
  const W = source.videoWidth || source.width || 1, H = source.videoHeight || source.height || 1;
  const hits = preds
    .filter(p => WONDERS[p.class])
    .map(p => ({ label: p.class, score: p.score, bbox: p.bbox, area: p.bbox[2] * p.bbox[3] }));
  if (!hits.length) return null;
  // 신뢰도 + 화면 점유율(가까이 비춘 것) + 중앙 가까움 → "의도한 물체"에 가깝게
  hits.forEach(h => {
    const cx = (h.bbox[0] + h.bbox[2] / 2) / W - 0.5, cy = (h.bbox[1] + h.bbox[3] / 2) / H - 0.5;
    const center = Math.max(0, 1 - Math.hypot(cx, cy) / 0.7071);
    h.weight = h.score * (0.7 - D.centerWeight * 0.5) + Math.min(1, h.area / (W * H)) * 0.3 + center * D.centerWeight;
  });
  hits.sort((a, b) => b.weight - a.weight);
  const strong = hits.find(h => h.score >= min);
  if (strong) return strong;
  const weak = heldLabel ? hits.find(h => h.label === heldLabel) : null;
  return weak ? { ...weak, weak: true } : null;
}
