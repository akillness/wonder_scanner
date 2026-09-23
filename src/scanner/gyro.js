// 자이로(deviceorientation): 3-DoF "둘러보기" AR 앵커용. iOS는 사용자 제스처에서 권한 요청 필요.
let yaw = 0, pitch = 0, active = false, listening = false;

export async function requestGyro() {
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const r = await DeviceOrientationEvent.requestPermission();
      if (r !== 'granted') return false;
    }
  } catch { return false; }
  return startGyro();
}
export function startGyro() {
  if (listening) return active;
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return false;
  window.addEventListener('deviceorientation', onOrient, true);
  listening = true;
  return true;
}
function onOrient(e) {
  if (e.alpha == null && e.beta == null) return;
  active = true;
  yaw = (e.webkitCompassHeading ?? (360 - (e.alpha ?? 0))) % 360;   // 0~360, 시계방향
  pitch = (e.beta ?? 0) - 90;                                       // 폰을 세워 정면을 보면 0
}
export function gyro() { return { yaw, pitch, active }; }
/** 두 각도의 최단 차이 (-180~180) */
export function angleDiff(a, b) { let d = ((a - b) % 360 + 540) % 360 - 180; return d; }
