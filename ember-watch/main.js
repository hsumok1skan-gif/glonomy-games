// Ember Watch — 시작, 화면 고리(requestAnimationFrame 하나), 시험 훅
(function () {
  'use strict';
  const EW = window.EW;
  const STEP = 1 / 60;
  let rafId = 0, last = 0, acc = 0;
  // 멈춘 동안에는 다시 그리지 않는다. 멈춤·화면·크기가 바뀐 뒤 한 번만 그린다 (dirty)
  let dirty = true, wasRunning = false;

  function frame(ts) {
    if (EW.testMode) { rafId = 0; return; }
    rafId = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.1, (ts - last) / 1000) : STEP;
    last = ts;
    if (EW.currentScreen() !== 'scr-game') { acc = 0; dirty = true; wasRunning = false; return; }
    const running = EW.isRunning();
    if (running !== wasRunning) { dirty = true; wasRunning = running; }
    if (running) {
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 6) { EW.update(STEP); acc -= STEP; n++; }
      if (n >= 6) acc = 0;
      EW.render(dt);
      EW.updateHud();
      return;
    }
    acc = 0;
    if (!dirty) return;
    // 멈춘 화면은 그대로 한 장만 그린다 (효과 시간도 흐르지 않는다)
    dirty = false;
    EW.render(0);
    EW.updateHud();
  }

  // 판 밖에서 화면을 다시 그려야 할 때 (크기 바뀜 등)
  EW.requestDraw = function () { dirty = true; };

  function startLoop() { if (!rafId && !EW.testMode) { last = 0; rafId = requestAnimationFrame(frame); } }
  EW.stopLoop = function () { if (rafId) cancelAnimationFrame(rafId); rafId = 0; };

  function onResize() {
    EW.resizeCanvas();
    EW.checkOrientation();
  }

  function boot() {
    // 캔버스 크기를 바꾸면 그림이 지워지므로 멈춘 동안에도 한 번 다시 그린다
    const resizeCanvas = EW.resizeCanvas;
    EW.resizeCanvas = function () { resizeCanvas(); dirty = true; };
    EW.renderInit();
    EW.uiInit();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    onResize();
    startLoop();
  }

  // 시험 훅 (자료\게임앱\기획지시.md 14장) — 화면 버튼과 같은 게임 함수를 부른다
  window.__test = {
    reset: function (seed) {
      EW.testMode = true;
      EW.stopLoop();
      EW.newRun({ region: 0, lantern: 'old', prep: null, relicPool: null, seed: seed });
      return true;
    },
    actions: function () { return EW.actions(); },
    act: function (a) { EW.act(a); },
    advance: function (ms) {
      const n = Math.max(0, Math.round((ms || 0) / (1000 * STEP)));
      for (let i = 0; i < n; i++) {
        EW.update(STEP);
        const s = EW.state();
        if (s.over) break;
        const R = EW.getRun();
        if (R && R.phase !== 'night') break;
      }
    },
    state: function () { return EW.state(); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
