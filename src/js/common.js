// Angels Now Playing Widget - Common JavaScript Library v0.4.2
// Minimal Now Playing script modeled after the reference example
// Polls Song.json, updates DOM, and uses a JS margin-left scroller for long text.
(function () {
  const POLL_INTERVAL = 2000;

  let newArtist = '';
  let newSong = '';
  let shown = false;

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
  // if a .text-clip exists, use it as the measurement container
  const $parent = $el.closest('.text-clip').length ? $el.closest('.text-clip') : $el.parent();
  const parentW = getEffectiveParentWidthElement($parent[0]);
    // temporarily ensure the element is inline-block + nowrap so scrollWidth reports full intrinsic width
    const prevDisplay = el.style.display;
    const prevWhite = el.style.whiteSpace;
    el.style.display = 'inline-block';
    el.style.whiteSpace = 'nowrap';
    const textW = el.scrollWidth || el.clientWidth || 0;
    // startScroll: measurements logged only in dev backups
    if (textW <= parentW) return;

    // Use transform-based requestAnimationFrame scroller to avoid layout thrashing from margin-left.
    const buffer = 24;
    const startOffset = getScrollStartOffset($parent[0]) || 30;
    const startPos = parentW + startOffset; // pixels to position element off-right
    const totalDistance = parentW + textW + buffer * 2; // total horizontal distance to travel
    const durationSeconds = Math.max(5, totalDistance / 100); // speed heuristic: px per 100s
    const durMs = Math.round(durationSeconds * 1000);

    let rafId = null;
    let startTime = null;
    let running = true;
    // store state in map so stopScroll can cancel
    _scrollers.set(el, { running: true, cancel: function() { running = false; if (rafId) cancelAnimationFrame(rafId); } });

    // Prepare element for transform animation (GPU-accelerated)
    // Reset any existing transform and ensure will-change for smoother motion
    try { el.style.transform = `translateX(${startPos}px)`; el.style.willChange = 'transform, opacity'; } catch (e) {}

    function step(ts) {
      if (!running) return;
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const t = Math.min(1, elapsed / durMs);
      // linear timing
      const currentX = startPos + (-(totalDistance) * t);
      try { el.style.transform = `translateX(${Math.round(currentX)}px)`; } catch (e) {}
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        // completed one pass; debug log
        // rAF pass complete
        // reset and loop after tiny delay to avoid jank
        if (running) {
          startTime = null;
          try { el.style.transform = `translateX(${startPos}px)`; } catch (e) {}
          setTimeout(function () { if (running) rafId = requestAnimationFrame(step); }, 80);
        }
      }
    }

    // small timeout to allow layout settling
    setTimeout(function () { rafId = requestAnimationFrame(step); }, 40);
    // when .stopScroll() is called, the _scrollers entry will be cleared and cancel() invoked
  }

  function stopScroll(el) {
    try {
  // stopScroll called
      const info = _scrollers.get(el);
      if (info) {
        if (typeof info.cancel === 'function') info.cancel();
        info.running = false;
      }
      _scrollers.delete(el);
      if (el && el.style) {
        // clear transform and will-change to restore normal layout
        try { el.style.transform = ''; el.style.willChange = ''; } catch (e) {}
        try { el.style.marginLeft = ''; } catch (e) {}
      }
      // stop any jQuery animations as well (show/hide uses them)
      try { $(el).stop(true, true); } catch (e) {}
    } catch (e) { /* ignore */ }
  }

  function hideText() {
  // hideText called
    $('#artist').animate({ marginLeft: '-100px', opacity: 0 }, 300);
    $('#song').animate({ marginLeft: '-100px', opacity: 0 }, 300);
    stopScroll(document.getElementById('artist'));
    stopScroll(document.getElementById('song'));
  }

  function updateText() {
    $('#artist').text(newArtist);
    $('#song').text(newSong);
  }

  function showText() {
    const artistEl = document.getElementById('artist');
    const songEl = document.getElementById('song');
  // prefer measuring against the optional .text-clip ancestor so visible width matches progress bar
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
    // cache-busted GET for JSON
    $.getJSON('Song.json?t=' + Date.now()).done(function (data) {
      try {
        const artist = data && (data.album_artist || (data.artists && data.artists.join(', '))) || 'Unknown Artist';
        const title = data && (data.title) || 'Unknown Track';
        const rawProgress = Number(data && data.progress) || 0;
        const rawDuration = Number(data && data.duration) || 0;
        const normalizedProgress = rawProgress > 1000 ? rawProgress / 1000 : rawProgress;
        const normalizedDuration = rawDuration > 1000 ? rawDuration / 1000 : rawDuration || 1;

        // update progress bookkeeping
        lastProgress = normalizedProgress;
        currentDuration = normalizedDuration || 1;
        lastUpdateTime = Date.now();

        newArtist = artist;
        newSong = title;

        displayData();
      } catch (e) {
        // ignore parse errors
      }
    }).fail(function () {
      // ignore file:// blocking here; just retry next poll
    }).always(function () {
      setTimeout(checkUpdate, POLL_INTERVAL);
    });
  }

  function displayData() {
    const curSong = document.getElementById('song') && document.getElementById('song').innerHTML;
    if (newSong !== curSong) {
  // displayData: new song changed
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

      const imgpath = 'Artwork.png?t=' + encodeURIComponent(newSong + newArtist + Date.now());
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

  $(document).ready(function () {
    $('#image').attr('src', 'Artwork.png?t=' + Date.now());
    checkUpdate();
    animateProgressBar();
  });
})();
