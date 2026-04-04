// Angels Now Playing Widget — common.js
// Polls Tuna's HTTP endpoint for the current track, updates DOM,
// scrolls long text, animates the progress bar, and supports ?edit=1 preview mode.
(function () {
  const POLL_INTERVAL = 2000;

  // Cassette tape has fixed physical label space — truncate to fit.
  // Adjust these values to dial in the visible character limit.
  const ARTIST_MAX_CHARS = 20;
  // Short titles (≤ SONG_SHORT_MAX chars): centered on the label.
  // Long titles (> SONG_SHORT_MAX chars): left-aligned past the INDEX artwork text,
  //   truncated at SONG_LONG_MAX. Tune SONG_LONG_MAX and --song-index-offset together.
  const SONG_SHORT_MAX = 21;
  const SONG_LONG_MAX  = 24;

  function truncateText(str, maxLen) {
    return str.length > maxLen ? str.slice(0, maxLen).trimEnd() + '…' : str;
  }

  let TUNA_BASE_URL = 'http://localhost:1608';

  let newArtist = '';
  let newSong = '';
  let newCoverUrl = '';
  let shown = false;

  let lastDisplayedSong = null;
  let lastDisplayedArtist = null;

  let lastProgress = 0;
  let lastUpdateTime = Date.now();
  let currentDuration = 1;

  // Simple scroller bookkeeping
  const _scrollers = new WeakMap();

  // Helper: compute parent width plus optional CSS var or data attribute override
  function getEffectiveParentWidthElement(parentEl) {
    try {
      const $p = $(parentEl);
      // prefer a .text-clip inside the parent if present (constrains to progress width)
      const $clip = $p.find('.text-clip');
      const base = ($clip && $clip.length) ? $clip.width() : ($p.width() || 0);
      let extra = 0;
      const cs = window.getComputedStyle(parentEl);
      const v = (cs && cs.getPropertyValue('--scroll-extra')) || '';
      if (v && v.trim()) {
        const m = v.match(/(-?\d+\.?\d*)px/);
        if (m) extra = Number(m[1]);
        else extra = Number(v) || 0;
      } else {
        const attr = $p.attr('data-scroll-extra') || ($p.closest('[data-scroll-extra]').attr('data-scroll-extra'));
        extra = Number(attr) || 0;
      }
      return base + extra;
    } catch (e) {
      return (parentEl && parentEl.clientWidth) || 0;
    }
  }

  // Helper: read scroll start offset (px) from CSS var --scroll-start-offset or data attribute
  function getScrollStartOffset(parentEl) {
    try {
      const $p = $(parentEl);
      const cs = window.getComputedStyle(parentEl);
      const v = (cs && cs.getPropertyValue('--scroll-start-offset')) || '';
      if (v && v.trim()) {
        const m = v.match(/(-?\d+\.?\d*)px/);
        if (m) return Number(m[1]);
        return Number(v) || 0;
      }
      const attr = $p.attr('data-scroll-start-offset') || ($p.closest('[data-scroll-start-offset]').attr('data-scroll-start-offset'));
      return Number(attr) || 30; // default 30px to match previous behavior
    } catch (e) { return 30; }
  }

  // Helper: read a text start/reset margin from CSS var --text-start-offset on the clip or parent
  function getTextStartOffset(el) {
    try {
      // prefer the closest .text-clip
      const $el = $(el);
      const $clip = $el.closest('.text-clip');
      const target = ($clip && $clip.length) ? $clip[0] : (el && el.parentElement) ? el.parentElement : document.documentElement;
      const cs = window.getComputedStyle(target);
      const v = (cs && (cs.getPropertyValue('--text-start-offset') || cs.getPropertyValue('--text-left-px'))) || '';
      if (v && v.trim()) {
        const m = v.match(/(-?\d+\.?\d*)px/);
        if (m) return Number(m[1]);
        const asNum = Number(v);
        return isFinite(asNum) ? asNum : 7;
      }
      return 7;
    } catch (e) { return 7; }
  }

  function startScroll(el) {
    if (!el) return;
    stopScroll(el);
    const $el = $(el);
    const $parent = $el.closest('.text-clip').length ? $el.closest('.text-clip') : $el.parent();
    const parentW = getEffectiveParentWidthElement($parent[0]);
    el.style.display = 'inline-block';
    el.style.whiteSpace = 'nowrap';
    const textW = el.scrollWidth || el.clientWidth || 0;
    if (textW <= parentW) return;

    const buffer = 24;
    const startOffset = getScrollStartOffset($parent[0]) || 30;
    const startPos = parentW + startOffset;
    const totalDistance = parentW + textW + buffer * 2;
    const durationSeconds = Math.max(5, totalDistance / 100);
    const durMs = Math.round(durationSeconds * 1000);

    let rafId = null;
    let startTime = null;
    let running = true;
    _scrollers.set(el, { running: true, cancel: function() { running = false; if (rafId) cancelAnimationFrame(rafId); } });

    try { el.style.transform = `translateX(${startPos}px)`; el.style.willChange = 'transform, opacity'; } catch (e) {}

    function step(ts) {
      if (!running) return;
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const t = Math.min(1, elapsed / durMs);
      const currentX = startPos - totalDistance * t;
      try { el.style.transform = `translateX(${Math.round(currentX)}px)`; } catch (e) {}
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        if (running) {
          startTime = null;
          try { el.style.transform = `translateX(${startPos}px)`; } catch (e) {}
          setTimeout(function () { if (running) rafId = requestAnimationFrame(step); }, 80);
        }
      }
    }

    setTimeout(function () { rafId = requestAnimationFrame(step); }, 40);
  }

  function stopScroll(el) {
    try {
      const info = _scrollers.get(el);
      if (info) {
        if (typeof info.cancel === 'function') info.cancel();
        info.running = false;
      }
      _scrollers.delete(el);
      if (el && el.style) {
        try { el.style.transform = ''; el.style.willChange = ''; } catch (e) {}
        try { el.style.marginLeft = ''; } catch (e) {}
      }
      try { $(el).stop(true, true); } catch (e) {}
    } catch (e) { /* ignore */ }
  }

  function hideText() {
    $('#artist').animate({ marginLeft: '-100px', opacity: 0 }, 300);
    $('#song').animate({ marginLeft: '-100px', opacity: 0 }, 300);
    stopScroll(document.getElementById('artist'));
    stopScroll(document.getElementById('song'));
  }

  function applySongMode(isLong) {
    const el = document.getElementById('song');
    if (!el) return;
    if (isLong) el.classList.add('song-long');
    else el.classList.remove('song-long');
  }

  function updateText() {
    $('#artist').text(truncateText(newArtist, ARTIST_MAX_CHARS));
    const songIsLong = newSong.length > SONG_SHORT_MAX;
    applySongMode(songIsLong);
    $('#song').text(songIsLong
      ? truncateText(newSong, SONG_LONG_MAX)
      : newSong);
  }

  function showText() {
    const artistEl = document.getElementById('artist');
    const songEl = document.getElementById('song');
    const clipEl = (artistEl && artistEl.closest && artistEl.closest('.text-clip')) || null;
    const parentW = clipEl ? getEffectiveParentWidthElement(clipEl) : ((artistEl && artistEl.parentElement) ? getEffectiveParentWidthElement(artistEl.parentElement) : 260);

    // artist
    if (artistEl && artistEl.scrollWidth > parentW) {
      const startOffset = getScrollStartOffset(artistEl.parentElement) || 30;
      const reset = getTextStartOffset(artistEl) + 'px';
      // position using transform to avoid margin-left layout thrash; fade in opacity
      try { artistEl.style.transform = `translateX(${parentW + startOffset}px)`; artistEl.style.display = 'inline-block'; artistEl.style.whiteSpace = 'nowrap'; } catch (e) {}
      $('#artist').css('opacity', 0).animate({ opacity: 1 }, 300, function () {
        try { artistEl.style.transform = `translateX(${reset})`; } catch (e) {}
      });
      // start scroller after layout
      setTimeout(function () { startScroll(artistEl); }, 360);
    } else {
      const reset = getTextStartOffset(artistEl) + 'px';
      $('#artist').animate({ marginLeft: reset, opacity: 1 }, 300);
    }

    // song
    if (songEl && songEl.scrollWidth > parentW) {
      const startOffset2 = getScrollStartOffset(songEl.parentElement) || 30;
      const reset2 = getTextStartOffset(songEl) + 'px';
      try { songEl.style.transform = `translateX(${parentW + startOffset2}px)`; songEl.style.display = 'inline-block'; songEl.style.whiteSpace = 'nowrap'; } catch (e) {}
      $('#song').css('opacity', 0).animate({ opacity: 1 }, 300, function () {
        try { songEl.style.transform = `translateX(${reset2})`; } catch (e) {}
      });
      setTimeout(function () { startScroll(songEl); }, 360);
    } else {
      const reset2 = getTextStartOffset(songEl) + 'px';
      $('#song').animate({ marginLeft: reset2, opacity: 1 }, 300);
    }
  }

  function checkUpdate() {
    $.getJSON(TUNA_BASE_URL + '?t=' + Date.now()).done(function (data) {
      try {
        const artist = (data && (data.album_artist || (data.artists && data.artists.join(', ')))) || 'Unknown Artist';
        const title = (data && data.title) || 'Unknown Track';
        const rawProgress = Number(data && data.progress) || 0;
        const rawDuration = Number(data && data.duration) || 0;
        const normalizedProgress = rawProgress > 1000 ? rawProgress / 1000 : rawProgress;
        const normalizedDuration = rawDuration > 1000 ? rawDuration / 1000 : rawDuration || 1;

        lastProgress = normalizedProgress;
        currentDuration = normalizedDuration || 1;
        lastUpdateTime = Date.now();

        newArtist = artist;
        newSong = title;
        newCoverUrl = (data && data.cover_url) || (TUNA_BASE_URL + '/cover.png');

        displayData();
      } catch (e) { /* ignore malformed response */ }
    }).fail(function () {
      // Tuna not running — retry silently next cycle.
    }).always(function () {
      setTimeout(checkUpdate, POLL_INTERVAL);
    });
  }

  function displayData() {
    const songChanged = newSong !== lastDisplayedSong;
    const artistChanged = newArtist !== lastDisplayedArtist;

    if (!songChanged && !artistChanged) return;

    lastDisplayedSong = newSong;
    lastDisplayedArtist = newArtist;

    if (newSong && !shown) {
      $('#background').animate({ marginLeft: '0px' }, 500);
      shown = true;
    }
    if (!newSong && shown) {
      $('#background').animate({ marginLeft: '-500px' }, 500);
      shown = false;
    }

    hideText();
    setTimeout(updateText, 300);
    setTimeout(showText, 400);

    if (songChanged) {
      const imgpath = newCoverUrl + (newCoverUrl.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now();
      $('#image').fadeOut(500, function () { $(this).attr('src', imgpath).fadeIn(500); });
    }
  }

  function animateProgressBar() {
    const now = Date.now();
    const elapsed = (now - lastUpdateTime) / 1000;
    const progress = Math.min(lastProgress + elapsed, currentDuration);
    const percent = (currentDuration > 0 ? (progress / currentDuration) * 100 : 0);
    if (isFinite(percent)) $('#progress-bar').css('width', percent + '%');
    requestAnimationFrame(animateProgressBar);
  }

  function loadTunaConfig(callback) {
    $.getJSON('../settings.json?t=' + Date.now())
      .done(function (cfg) {
        if (cfg && cfg.tuna_port) TUNA_BASE_URL = 'http://localhost:' + cfg.tuna_port;
      })
      .always(callback);
  }

  // ── Cassette-tape specific: apply tape style images ─────────────────────────
  // styleValue format: "[tapeColor]-[textColor]-[labelStyle]" e.g. "black-black-light"
  function applyTapeStyle(styleValue) {
    if (!styleValue) return;
    const parts = styleValue.replace(/['"]|\s/g, '').split('-');
    if (parts.length < 3) return;
    const [tapeColor, textColor, labelStyle] = parts;
    const mainImg = document.getElementById('cassette-main');
    const labelImg = document.getElementById('cassette-label');
    if (mainImg) mainImg.src = `./cassette-tape-${labelStyle}-label-base.png`;
    if (labelImg) labelImg.src = `./cassette-tape-${tapeColor}-tape-${textColor}-text.png`;
  }

  // ── ?edit=1 mode ──────────────────────────────────────────────────────────────

  const isEditMode = new URLSearchParams(location.search).get('edit') === '1';

  if (isEditMode) {
    window.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'setCSSVar') {
        document.documentElement.style.setProperty(e.data.name, e.data.value);
        if (e.data.name === '--tape-style') applyTapeStyle(e.data.value);
      }
    });

    $(document).ready(function () {
      $('#artist').text(truncateText('Sample Artist', ARTIST_MAX_CHARS)).css('opacity', 1);
      // Use a long title in the preview so the left-align / INDEX-offset mode is visible.
      // Swap to a short title (≤ 22 chars) to preview the centered mode instead.
      const previewSong = 'Sample Song Title';
      const previewIsLong = previewSong.length > SONG_SHORT_MAX;
      applySongMode(previewIsLong);
      $('#song').text(previewIsLong
        ? truncateText(previewSong, SONG_LONG_MAX)
        : previewSong).css('opacity', 1);
      $('#image').attr('src', './SampleAlbum.png');
      $('#background').css('margin-left', '0px');
      // Apply initial tape style from :root
      const initialStyle = getComputedStyle(document.documentElement).getPropertyValue('--tape-style').trim();
      if (initialStyle) applyTapeStyle(initialStyle);

      lastProgress = 0.5;
      currentDuration = 1;
      lastUpdateTime = Date.now() - 500;
      animateProgressBar();
    });

    return;
  }

  $(document).ready(function () {
    loadTunaConfig(function () {
      checkUpdate();
      animateProgressBar();
    });
  });
})();
