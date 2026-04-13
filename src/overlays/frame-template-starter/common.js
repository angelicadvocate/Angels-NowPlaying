// Angels Now Playing Widget — common.js
//
// Shared overlay logic for all Angels-NowPlaying overlays.
// Responsibilities:
//   - Poll Tuna's HTTP endpoint for the current track
//   - Update DOM elements (#artist, #song, #image, #progress-bar, #background)
//   - Scroll long text using a GPU-accelerated rAF transform scroller
//   - Animate the progress bar independently of the poll interval
//   - Support ?edit=1 mode for live preview inside the editor iframe
//
// DOM IDs this file expects to find in main.html:
//   #artist      — <span> inside a .text-box; displays the artist name
//   #song        — <span> inside a .text-box; displays the track title
//   #image       — <img>; src is set to the Tuna cover_url on each track change
//   #progress-bar — <div>; width% is animated to reflect playback position
//   #background  — outer container; slides in when a track is playing, out when idle
//
// This file is shared across all overlay variants. Keep it configuration-light.
// Per-overlay tuning belongs in main.css CSS variables (--scroll-extra,
// --scroll-start-offset) or as data attributes on the container element.
(function () {
  // How often (ms) to poll Tuna for track updates. 2000ms is a good balance
  // between responsiveness and unnecessary requests. Lower values are fine but
  // won't make the progress bar smoother — that runs on its own rAF loop.
  const POLL_INTERVAL = 2000;

  // Base URL for Tuna's built-in HTTP server. Tuna serves current track JSON at
  // this URL and album art at the cover_url field returned in each response.
  // Override this port in the Angels-NowPlaying app under Settings → Tuna Configuration;
  // the app saves the port to ../settings.json which is read at startup below.
  let TUNA_BASE_URL = 'http://localhost:1608';

  // Most-recently received values from Tuna.
  let newArtist = '';
  let newSong = '';
  let newCoverUrl = '';

  // Whether the #background container is currently visible (slid in).
  let shown = false;

  // Last values written to the DOM. Compared on each poll so we only trigger
  // the hide/update/show animation sequence when the track actually changes.
  let lastDisplayedSong = null;
  let lastDisplayedArtist = null;

  // Progress bar state. Updated each poll; the rAF loop interpolates between polls.
  let lastProgress = 0;      // seconds into the track at last poll
  let lastUpdateTime = Date.now(); // wall-clock ms when lastProgress was recorded
  let currentDuration = 1;  // total track duration in seconds

  // Tracks active scroll animations keyed by DOM element.
  // WeakMap so entries are GC'd automatically if elements are removed.
  const _scrollers = new WeakMap();

  // ── CSS variable helpers ─────────────────────────────────────────────────────
  //
  // These read tuning values from CSS custom properties (or data attribute
  // fallbacks) so per-overlay behaviour can be controlled from main.css alone
  // without touching this file.
  //
  // CSS variables to declare in your overlay's main.css :root block:
  //   --scroll-extra (px)        Extra width added when deciding whether text
  //                              overflows and needs to scroll. Increase this if
  //                              text should start scrolling earlier.
  //   --scroll-start-offset (px) How far off-screen (to the right) the text
  //                              starts before scrolling in. Tune this to align
  //                              the entry point with your frame artwork edge.
  //   --text-start-offset (px)   Where the text rests horizontally when not
  //                              scrolling. Defaults to 7px if not declared.
  //
  // Fallback data attributes (set on the container element in main.html):
  //   data-scroll-extra
  //   data-scroll-start-offset

  // Returns the effective container width for overflow detection.
  // Adds --scroll-extra so you can tune the trigger point from CSS alone.
  function getEffectiveParentWidthElement(parentEl) {
    try {
      const $p = $(parentEl);
      // Use .text-clip if present — it constrains visible width more accurately
      // than the raw parent when the text area is narrower than the full element.
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

  // Returns how far off the right edge (px) the text starts before scrolling in.
  // Reads --scroll-start-offset from CSS or the data-scroll-start-offset attribute.
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
      return Number(attr) || 30;
    } catch (e) { return 30; }
  }

  // Returns the resting horizontal position (px) for non-scrolling text.
  // Reads --text-start-offset (or --text-left-px) from the nearest .text-clip ancestor.
  function getTextStartOffset(el) {
    try {
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

  // ── Scroller ─────────────────────────────────────────────────────────────────
  //
  // GPU-accelerated transform scroller using requestAnimationFrame.
  // Only activated when the text's intrinsic width exceeds the container width
  // (adjusted by --scroll-extra). Loops continuously until stopScroll() is called.
  //
  // You should not need to modify this function for most overlays. Instead, tune
  // the behaviour from main.css using --scroll-extra and --scroll-start-offset.

  function startScroll(el) {
    if (!el) return;
    stopScroll(el); // cancel any in-progress scroll on this element first

    const $el = $(el);
    // Use .text-clip as the measurement container if present, otherwise the direct parent.
    const $parent = $el.closest('.text-clip').length ? $el.closest('.text-clip') : $el.parent();
    const parentW = getEffectiveParentWidthElement($parent[0]);

    // Force inline-block + nowrap so scrollWidth reports the full unwrapped text width.
    el.style.display = 'inline-block';
    el.style.whiteSpace = 'nowrap';
    const textW = el.scrollWidth || el.clientWidth || 0;

    // If the text fits, no scrolling needed.
    if (textW <= parentW) return;

    // Calculate scroll geometry.
    const buffer = 24; // extra px of blank space at the end of each scroll pass
    const startOffset = getScrollStartOffset($parent[0]) || 30;
    const startPos = parentW + startOffset;       // initial off-screen-right position
    const totalDistance = parentW + textW + buffer * 2; // full travel distance per pass
    const durationSeconds = Math.max(5, totalDistance / 100); // ~100px/s scroll speed
    const durMs = Math.round(durationSeconds * 1000);

    let rafId = null;
    let startTime = null;
    let running = true;

    // Register cancel callback so stopScroll() can cleanly halt the rAF loop.
    _scrollers.set(el, {
      running: true,
      cancel: function() { running = false; if (rafId) cancelAnimationFrame(rafId); }
    });

    // Position the element off-screen to the right before the first frame.
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
        // One pass complete — snap back to start position and loop.
        if (running) {
          startTime = null;
          try { el.style.transform = `translateX(${startPos}px)`; } catch (e) {}
          setTimeout(function () { if (running) rafId = requestAnimationFrame(step); }, 80);
        }
      }
    }

    // Short delay before first frame lets the browser finish any pending layout.
    setTimeout(function () { rafId = requestAnimationFrame(step); }, 40);
  }

  // Cancels an active scroll animation on el and restores its inline styles.
  function stopScroll(el) {
    try {
      const info = _scrollers.get(el);
      if (info) {
        if (typeof info.cancel === 'function') info.cancel();
        info.running = false;
      }
      _scrollers.delete(el);
      if (el && el.style) {
        el.style.transform = '';
        el.style.willChange = '';
        el.style.marginLeft = '';
      }
      // Cancel any in-flight jQuery animations too (e.g. opacity fades).
      try { $(el).stop(true, true); } catch (e) {}
    } catch (e) { /* ignore */ }
  }

  // ── DOM update sequence ───────────────────────────────────────────────────────
  //
  // Track changes trigger a three-step sequence:
  //   1. hideText()  — fade out + stop scrollers
  //   2. updateText() — write new text values (while hidden)
  //   3. showText()  — fade in, start scrollers if needed
  //
  // The 300/400ms setTimeout offsets give the hide animation time to finish
  // before the new text appears. Adjust these if your overlay uses longer
  // transitions.

  // Animate #artist and #song out of view and cancel any active scrollers.
  function hideText() {
    $('#artist').animate({ marginLeft: '-100px', opacity: 0 }, 300);
    $('#song').animate({ marginLeft: '-100px', opacity: 0 }, 300);
    stopScroll(document.getElementById('artist'));
    stopScroll(document.getElementById('song'));
  }

  // Write the latest artist/song values to the DOM (called while elements are hidden).
  function updateText() {
    $('#artist').text(newArtist);
    $('#song').text(newSong);
  }

  // Fade #artist and #song back in. If the text overflows its container, starts
  // the transform scroller instead of animating margin-left.
  function showText() {
    const artistEl = document.getElementById('artist');
    const songEl = document.getElementById('song');
    // Measure against .text-clip if present — its width matches the visible text area.
    const clipEl = (artistEl && artistEl.closest && artistEl.closest('.text-clip')) || null;
    const parentW = clipEl ? getEffectiveParentWidthElement(clipEl) : ((artistEl && artistEl.parentElement) ? getEffectiveParentWidthElement(artistEl.parentElement) : 260);

    // For each element: if it overflows, fade it in from off-screen-right then
    // hand off to the rAF scroller. If it fits, just animate margin-left back in.

    // #artist
    if (artistEl && artistEl.scrollWidth > parentW) {
      const startOffset = getScrollStartOffset(artistEl.parentElement) || 30;
      const reset = getTextStartOffset(artistEl) + 'px';
      try { artistEl.style.transform = `translateX(${parentW + startOffset}px)`; artistEl.style.display = 'inline-block'; artistEl.style.whiteSpace = 'nowrap'; } catch (e) {}
      $('#artist').css('opacity', 0).animate({ opacity: 1 }, 300, function () {
        try { artistEl.style.transform = `translateX(${reset})`; } catch (e) {}
      });
      setTimeout(function () { startScroll(artistEl); }, 360);
    } else {
      const reset = getTextStartOffset(artistEl) + 'px';
      $('#artist').animate({ marginLeft: reset, opacity: 1 }, 300);
    }

    // #song
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

  // ── Tuna polling ─────────────────────────────────────────────────────────────
  //
  // Tuna response fields used here:
  //   title        — track title string
  //   album_artist — preferred artist field (falls back to artists[] array)
  //   artists      — array of artist strings (used when album_artist is absent)
  //   progress     — playback position (ms if > 1000, seconds otherwise)
  //   duration     — total track length (ms if > 1000, seconds otherwise)
  //   cover_url    — full HTTP URL to the current album art (e.g. http://localhost:1608/cover.png)
  //
  // If Tuna is not running the request will fail silently and retry on
  // the next POLL_INTERVAL. The overlay stays showing the last known track.

  function checkUpdate() {
    // Cache-bust with a timestamp so the browser never serves a stale response.
    $.getJSON(TUNA_BASE_URL + '?t=' + Date.now()).done(function (data) {
      try {
        const artist = (data && (data.album_artist || (data.artists && data.artists.join(', ')))) || 'Unknown Artist';
        const title = (data && data.title) || 'Unknown Track';
        const rawProgress = Number(data && data.progress) || 0;
        const rawDuration = Number(data && data.duration) || 0;
        // Tuna may return ms or seconds depending on version — normalise to seconds.
        const normalizedProgress = rawProgress > 1000 ? rawProgress / 1000 : rawProgress;
        const normalizedDuration = rawDuration > 1000 ? rawDuration / 1000 : rawDuration || 1;

        lastProgress = normalizedProgress;
        currentDuration = normalizedDuration || 1;
        lastUpdateTime = Date.now();

        newArtist = artist;
        newSong = title;
        newCoverUrl = (data && data.cover_url) || (TUNA_BASE_URL + '/cover.png');

        displayData();
      } catch (e) {
        // Malformed response — ignore and retry next cycle.
      }
    }).fail(function () {
      // Tuna not running or unreachable — retry silently next cycle.
    }).always(function () {
      setTimeout(checkUpdate, POLL_INTERVAL);
    });
  }

  // Called after each successful poll. Compares new values against what is
  // currently displayed and only triggers the animation sequence when something
  // actually changed — preventing the overlay from flashing on every poll.
  function displayData() {
    const songChanged = newSong !== lastDisplayedSong;
    const artistChanged = newArtist !== lastDisplayedArtist;

    if (!songChanged && !artistChanged) return;

    lastDisplayedSong = newSong;
    lastDisplayedArtist = newArtist;

    // Slide #background in when a track starts, out when no track is playing.
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

    // Reload album art with a cache-buster so the browser fetches the new image
    // even if the URL path hasn't changed (Tuna always serves to the same URL).
    if (songChanged) {
      const imgpath = newCoverUrl + (newCoverUrl.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now();
      $('#image').fadeOut(500, function () { $(this).attr('src', imgpath).fadeIn(500); });
    }
  }

  // ── Progress bar ──────────────────────────────────────────────────────────────
  //
  // Runs on every animation frame (independent of the poll interval) so the bar
  // moves smoothly rather than jumping every 2 seconds. Interpolates from the
  // last known position using elapsed wall-clock time.
  //
  // #progress-bar width is set as a percentage of #progress-container width.
  // Style the container in main.css; this function only sets the width.
  function animateProgressBar() {
    const now = Date.now();
    const elapsed = (now - lastUpdateTime) / 1000;
    const progress = Math.min(lastProgress + elapsed, currentDuration);
    const percent = (currentDuration > 0 ? (progress / currentDuration) * 100 : 0);
    if (isFinite(percent)) $('#progress-bar').css('width', percent + '%');
    requestAnimationFrame(animateProgressBar);
  }

  // ── Startup ───────────────────────────────────────────────────────────────────

  // Reads ../settings.json (written by the Angels-NowPlaying app) to pick up a
  // non-default Tuna port before the first poll. The file is one level above the
  // overlay folder so it is shared by all installed overlays.
  //
  // If the file doesn't exist (e.g. first run, or overlay loaded outside the app)
  // this fails silently and the default port 1608 is used.
  //
  // You should not need to modify this function. Change the Tuna port in the
  // Angels-NowPlaying app under Settings → Tuna Configuration instead.
  function loadTunaConfig(callback) {
    if (window.TUNA_PORT) TUNA_BASE_URL = 'http://localhost:' + window.TUNA_PORT;
    callback();
  }

  // ── ?edit=1 mode ──────────────────────────────────────────────────────────────
  //
  // When editor.html loads main.html inside an <iframe src="main.html?edit=1">,
  // this branch runs instead of the normal Tuna polling path.
  //
  // In edit mode this file:
  //   - Populates the DOM with static placeholder text and SampleAlbum.png
  //   - Starts the progress bar at 50% so it's visible in the preview
  //   - Listens for postMessage events from the parent editor frame
  //
  // The editor sends messages in this shape to update CSS variables live:
  //   { type: 'setCSSVar', name: '--some-var', value: '42px' }
  //
  // This means the editor preview and the OBS output always render the same
  // HTML — there is no separate mock DOM to keep in sync.
  //
  // You should not need to modify this block. To change the placeholder content,
  // update the strings below or replace SampleAlbum.png with your own image.
  const isEditMode = new URLSearchParams(location.search).get('edit') === '1';

  if (isEditMode) {
    // Apply CSS variable updates sent from the editor via postMessage.
    window.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'setCSSVar') {
        document.documentElement.style.setProperty(e.data.name, e.data.value);
      }
    });

    $(document).ready(function () {
      // Use opacity: 1 directly — main.css defaults spans to opacity: 0 as the
      // starting state for the fade-in animation, which is skipped in edit mode.
      $('#artist').text('Sample Artist').css('opacity', 1);
      $('#song').text('Sample Song Title').css('opacity', 1);
      $('#image').attr('src', './SampleAlbum.png');
      $('#background').css('margin-left', '0px');

      // Seed progress bar partway through so it's visible at a glance.
      lastProgress = 0.5;
      currentDuration = 1;
      lastUpdateTime = Date.now() - 500;
      animateProgressBar();
    });

    return; // Skip Tuna polling entirely in edit mode.
  }

  $(document).ready(function () {
    loadTunaConfig(function () {
      checkUpdate();
      animateProgressBar();
    });
  });
})();
