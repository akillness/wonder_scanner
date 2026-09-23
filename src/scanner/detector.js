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

/** 가장 유력한 원더 타깃 1개 반환. 없으면 null */
export async function detectTarget(source) {
  if (!model) return null;
  const preds = await model.detect(source, 6, BALANCE.resonance.minConfidence);
  const hits = preds
    .filter(p => WONDERS[p.class])
    .map(p => ({ label: p.class, score: p.score, bbox: p.bbox, area: p.bbox[2] * p.bbox[3] }));
  if (!hits.length) return null;
  // 신뢰도 + 화면 점유율(가까이 비춘 것) 가중 → "의도한 물체"에 가깝게
  const W = source.videoWidth || source.width || 1, H = source.videoHeight || source.height || 1;
  hits.forEach(h => { h.weight = h.score * 0.7 + Math.min(1, h.area / (W * H)) * 0.3; });
  hits.sort((a, b) => b.weight - a.weight);
  return hits[0];
}
