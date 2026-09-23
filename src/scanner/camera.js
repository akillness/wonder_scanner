let stream = null;
let facing = 'environment';

export function hasCamera() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

export async function startCamera(video, facingMode = facing) {
  stopCamera(video);
  facing = facingMode;
  // 안드로이드 일부 기기는 해상도·facingMode 제약에서 OverconstrainedError → 점점 느슨하게 재시도
  const tries = [
    { video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
    { video: { facingMode: { ideal: facingMode } }, audio: false },
    { video: true, audio: false },
  ];
  let lastErr = null;
  for (const c of tries) { try { stream = await navigator.mediaDevices.getUserMedia(c); break; } catch (e) { lastErr = e; if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') throw e; } }
  if (!stream) throw lastErr ?? new Error('camera-unavailable');
  video.setAttribute('playsinline', ''); video.setAttribute('muted', ''); video.muted = true;
  video.srcObject = stream;
  if (video.readyState < 1) await new Promise(res => { const t = setTimeout(res, 4000); video.onloadedmetadata = () => { clearTimeout(t); res(); }; });
  try { await video.play(); } catch { /* iOS 저전력 모드: 다음 사용자 탭에서 재생 */ document.addEventListener('pointerdown', () => video.play().catch(() => {}), { once: true }); }
  return stream;
}
export function cameraAlive() { return !!stream && stream.getVideoTracks().some(t => t.readyState === 'live'); }

export function stopCamera(video) {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  if (video) video.srcObject = null;
}

export async function flipCamera(video) {
  return startCamera(video, facing === 'environment' ? 'user' : 'environment');
}

export function currentFacing() { return facing; }

/** 비디오/이미지의 현재 프레임을 JPEG dataURL로 캡처 (카드 썸네일용) */
export function snapshot(source, bbox = null, size = 640) {
  const c = document.createElement('canvas');
  const sw = source.videoWidth || source.naturalWidth || source.width;
  const sh = source.videoHeight || source.naturalHeight || source.height;
  let sx = 0, sy = 0, s = Math.min(sw, sh);
  if (bbox) { // 물체 주변을 정사각형으로 크롭(여백 35%)
    const [x, y, w, h] = bbox;
    s = Math.min(Math.max(w, h) * 1.7, sw, sh);
    sx = Math.max(0, Math.min(sw - s, x + w / 2 - s / 2));
    sy = Math.max(0, Math.min(sh - s, y + h / 2 - s / 2));
  } else { sx = (sw - s) / 2; sy = (sh - s) / 2; }
  c.width = size; c.height = size;
  c.getContext('2d').drawImage(source, sx, sy, s, s, 0, 0, size, size);
  return c.toDataURL('image/jpeg', 0.85);
}
