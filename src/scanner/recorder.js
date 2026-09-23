import { MEDIA } from '../game/media.js';
import { audioStream } from '../ui/fx.js';

/** 포획 클립 녹화: 비디오 프레임 + AR 오버레이를 합성 캔버스에 그려 MediaRecorder로 저장 (게임 사운드 믹스 포함) */
export function createRecorder() {
  let rec = null, chunks = [], canvas = null, ctx = null, timer = 0, stopResolve = null, result = null, startedAt = 0;
  const type = pickType();
  return {
    get supported() { return !!type && typeof MediaRecorder !== 'undefined' && !!HTMLCanvasElement.prototype.captureStream; },
    get recording() { return !!rec && rec.state === 'recording'; },
    start(source, overlay) {
      if (!this.supported || rec) return false;
      const sw = source.videoWidth || source.naturalWidth || 640, sh = source.videoHeight || source.naturalHeight || 480;
      const s = MEDIA.clipWidth / sw; canvas = document.createElement('canvas'); canvas.width = Math.round(sw * s); canvas.height = Math.round(sh * s); ctx = canvas.getContext('2d');
      const stream = canvas.captureStream(MEDIA.clipFps);
      const a = audioStream(); if (a) a.getAudioTracks().forEach(t => stream.addTrack(t));
      try { rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: MEDIA.clipKbps * 1000, audioBitsPerSecond: 64000 }); } catch { rec = null; return false; }
      chunks = []; result = null; startedAt = performance.now();
      rec.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
      rec.onstop = () => { result = chunks.length ? new Blob(chunks, { type }) : null; stopResolve?.(result); stopResolve = null; rec = null; };
      rec.start(250);
      timer = setTimeout(() => this.stop(), this.manual ? 20000 : MEDIA.clipMaxMs);
      this._src = source; this._ov = overlay; return true;
    },
    /** 매 프레임 호출: 소스 + 오버레이 합성 (cover 기준으로 오버레이를 소스 좌표에 맞춤) */
    frame() {
      if (!rec || !ctx) return;
      const src = this._src, ov = this._ov, W = canvas.width, H = canvas.height;
      ctx.drawImage(src, 0, 0, W, H);
      // 오버레이 캔버스는 화면(cover) 좌표 → 소스 비율로 되돌려 그림
      const sw = src.videoWidth || src.naturalWidth, sh = src.videoHeight || src.naturalHeight, cw = ov.width, ch = ov.height;
      const sc = Math.max(cw / sw, ch / sh), vw = sw * sc, vh = sh * sc, ox = (cw - vw) / 2, oy = (ch - vh) / 2;
      ctx.drawImage(ov, -ox, -oy, vw, vh, 0, 0, W, H);
    },
    stop() { clearTimeout(timer); if (!rec) return Promise.resolve(result); if (rec.state === 'inactive') return Promise.resolve(result); return new Promise(res => { stopResolve = res; try { rec.stop(); } catch { res(null); } }); },
    cancel() { clearTimeout(timer); try { rec?.stop(); } catch {} rec = null; chunks = []; },
    get type() { return type; },
    get elapsed() { return rec ? performance.now() - startedAt : 0; },
  };
}
function pickType() {
  if (typeof MediaRecorder === 'undefined') return null;
  return ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(t => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } }) ?? null;
}
