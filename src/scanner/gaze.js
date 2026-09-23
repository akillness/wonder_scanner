// 시선 어댑터: FaceLandmarker(블렌드셰이프 + 변환 행렬) → { gx, gy, open, present, yaw, pitch } | null
// DOM·캔버스 없음. 전면 카메라 + settings.eyeGauge 일 때만 동적 import.
const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export function createGaze({ headGain = 0.6 } = {}) {
  let fl = null, loading = null, lastT = 0, last = null, status = 'idle';
  return {
    get ready() { return !!fl; }, get status() { return status; },
    async load(onStatus = () => {}) {
      if (loading) return loading;
      status = 'loading'; onStatus('시선 모델 로딩…');
      loading = (async () => {
        const mp = await import('@mediapipe/tasks-vision');
        const vision = await mp.FilesetResolver.forVisionTasks(CDN);
        const opts = (delegate) => ({ baseOptions: { modelAssetPath: FACE_MODEL, delegate }, runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true });
        try { fl = await mp.FaceLandmarker.createFromOptions(vision, opts('GPU')); } catch { fl = await mp.FaceLandmarker.createFromOptions(vision, opts('CPU')); }
        status = 'ready'; onStatus('시선 추적 준비');
      })().catch(e => { status = 'error'; onStatus('시선 모델 로드 실패'); loading = null; throw e; });
      return loading;
    },
    /** 66ms(15Hz)마다 추론, 그 사이에는 마지막 샘플 재사용 */
    sample(video, now) {
      if (!fl || video.readyState < 2) return null;
      if (now - lastT < 66) return last; lastT = now;
      try {
        const r = fl.detectForVideo(video, now); const bs = r.faceBlendshapes?.[0]?.categories;
        if (!bs) return (last = { gx: 0, gy: 0, open: 0, present: false, yaw: 0, pitch: 0 });
        const v = (n) => bs.find(c => c.categoryName === n)?.score ?? 0;
        let gx = ((v('eyeLookOutRight') - v('eyeLookInRight')) + (v('eyeLookInLeft') - v('eyeLookOutLeft'))) / 2;
        let gy = ((v('eyeLookDownLeft') + v('eyeLookDownRight')) - (v('eyeLookUpLeft') + v('eyeLookUpRight')));
        const open = 1 - (v('eyeBlinkLeft') + v('eyeBlinkRight')) / 2;
        let yaw = 0, pitch = 0; const m = r.facialTransformationMatrixes?.[0]?.data;
        if (m) { yaw = Math.atan2(m[8], m[10]); pitch = Math.asin(Math.max(-1, Math.min(1, -m[9]))); }
        gx += (yaw / 0.5) * headGain; gy += (pitch / 0.5) * headGain;
        gx = -gx; // 전면 카메라는 미러 표시
        return (last = { gx, gy, open, present: true, yaw, pitch });
      } catch { return last; }
    },
    close() { try { fl?.close(); } catch {} fl = null; loading = null; status = 'idle'; },
  };
}
