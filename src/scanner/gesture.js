// 손 제스처 + 얼굴 블렌드셰이프 (MediaPipe Tasks Vision, 동적 import, WASM/모델은 CDN)
// 출력: { gesture, hand:{x,y}|null, face:{blink,jawOpen,browUp,smile}|null } — scan.js가 액션으로 매핑
const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const GESTURE_MODEL = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export function createGestureTracker({ face = false } = {}) {
  let vision = null, rec = null, fl = null, lastT = 0, ready = false, loading = null, status = 'idle';
  const hold = { name: null, since: 0 }; const blinks = []; let blinkClosed = false, lastJaw = 0;
  return {
    get ready() { return ready; }, get status() { return status; },
    async load(onStatus = () => {}) {
      if (loading) return loading;
      status = 'loading'; onStatus('제스처 모델 로딩…');
      loading = (async () => {
        const mp = await import('@mediapipe/tasks-vision');
        vision = await mp.FilesetResolver.forVisionTasks(CDN);
        const mk = async (Cls, path, extra) => { try { return await Cls.createFromOptions(vision, { baseOptions: { modelAssetPath: path, delegate: 'GPU' }, runningMode: 'VIDEO', ...extra }); } catch { return Cls.createFromOptions(vision, { baseOptions: { modelAssetPath: path, delegate: 'CPU' }, runningMode: 'VIDEO', ...extra }); } };
        rec = await mk(mp.GestureRecognizer, GESTURE_MODEL, { numHands: 1 });
        if (face) { try { fl = await mk(mp.FaceLandmarker, FACE_MODEL, { numFaces: 1, outputFaceBlendshapes: true }); } catch { fl = null; } }
        ready = true; status = 'ready'; onStatus(face && fl ? '손·얼굴 제스처 준비' : '손 제스처 준비');
      })().catch(e => { status = 'error'; onStatus('제스처 모델 로드 실패'); throw e; });
      return loading;
    },
    /** 100ms 간격으로만 추론. 비디오 좌표(0~1) 기준 결과 */
    update(video, now) {
      if (!ready || !rec || video.readyState < 2 || now - lastT < 100) return null; lastT = now;
      const out = { gesture: null, hand: null, face: null, events: [] };
      try {
        const g = rec.recognizeForVideo(video, now);
        const name = g.gestures?.[0]?.[0]?.categoryName; const score = g.gestures?.[0]?.[0]?.score ?? 0;
        if (g.landmarks?.[0]) { const tip = g.landmarks[0][8]; out.hand = { x: tip.x, y: tip.y }; }
        if (name && name !== 'None' && score > 0.6) { out.gesture = name; if (hold.name !== name) { hold.name = name; hold.since = now; } else if (now - hold.since > 350 && !hold.fired) { hold.fired = true; out.events.push({ type: 'gesture', name }); } }
        else { hold.name = null; hold.fired = false; }
      } catch {}
      if (fl) { try {
        const f = fl.detectForVideo(video, now); const bs = f.faceBlendshapes?.[0]?.categories; if (bs) {
          const v = (n) => bs.find(c => c.categoryName === n)?.score ?? 0;
          const blink = (v('eyeBlinkLeft') + v('eyeBlinkRight')) / 2, jaw = v('jawOpen'), brow = (v('browInnerUp') + v('browOuterUpLeft') + v('browOuterUpRight')) / 3, smile = (v('mouthSmileLeft') + v('mouthSmileRight')) / 2;
          out.face = { blink, jawOpen: jaw, browUp: brow, smile };
          if (blink > 0.5 && !blinkClosed) { blinkClosed = true; blinks.push(now); while (blinks.length && now - blinks[0] > 900) blinks.shift(); if (blinks.length >= 2) { out.events.push({ type: 'face', name: 'doubleBlink' }); blinks.length = 0; } } else if (blink < 0.3) blinkClosed = false;
          if (jaw > 0.6 && now - lastJaw > 4000) { lastJaw = now; out.events.push({ type: 'face', name: 'jawOpen' }); }
          if (brow > 0.7 && !this._brow) { this._brow = true; out.events.push({ type: 'face', name: 'browUp' }); } else if (brow < 0.4) this._brow = false;
          if (smile > 0.7 && !this._smile) { this._smile = true; out.events.push({ type: 'face', name: 'smile' }); } else if (smile < 0.4) this._smile = false;
        } } catch {} }
      return out;
    },
    close() { try { rec?.close(); fl?.close(); } catch {} rec = fl = null; ready = false; loading = null; status = 'idle'; },
  };
}
export const GESTURE_MAP = [
  { g: 'Victory',     icon: 'target', action: 'tap',    label: '포획 탭' },
  { g: 'Closed_Fist', icon: 'fragment', action: 'grab',   label: '손끝 근처 정령 포획' },
  { g: 'Open_Palm',   icon: 'rec', action: 'record', label: '영상 촬영 시작/정지' },
  { g: 'Thumb_Up',    icon: 'prism', action: 'token',  label: '프리즘 토큰 장착' },
  { g: 'ILoveYou',    icon: 'camera', action: 'snap',   label: '스냅 (사진 즉시 저장)' },
  { g: 'Pointing_Up', icon: 'arrow-right', action: 'point',  label: '손끝 포인터' },
];
export const FACE_MAP = [
  { f: 'doubleBlink', icon: 'target', action: 'tap',   label: '두 번 깜빡 = 포획 탭' },
  { f: 'jawOpen',     icon: 'fragment', action: 'inhale', label: '입 벌리기 = 정령 흡입' },
  { f: 'browUp',      icon: 'prism', action: 'token', label: '눈썹 올리기 = 토큰 장착' },
  { f: 'smile',       icon: 'camera', action: 'snap',  label: '미소 = 스냅' },
];
