# Angels-NowPlaying Todo List

This document outlines suggested improvements, potential issues, and future development ideas for the Angels-NowPlaying project.

## 🟢 Current Development Status (October 2025)

### 🎯 **IMMEDIATE TOP PRIORITY**
**Test editor `generateCSS()` end-to-end for frames** (manual integration test):
- Open each editor (F1–F4), generate CSS, download the file
- Replace the corresponding file in `css/` with the downloaded CSS  
- Load the matching HTML frame in OBS (or a local static server + browser) and verify:
  - Text displays correctly and long titles scroll using the JS scroller
  - Progress bar updates and artwork loads
  - No console errors related to missing classes or CSS variables
- Record any mismatches (file name, missing class names, different variable names) and file small follow-up fixes

### 🔄 **IN PROGRESS**
- Update editor `generateCSS()` to emit CSS that matches the runtime frame structure (use `.text-clip`, `.text-row`, `.text-inner`, and the runtime variable names) so downloaded CSS works with `js/common.js`

### 📝 **CURRENT DEV NOTES**
- The active runtime JS is `js/common.js`. A backup with debug traces is saved as `js/common.js.bak` in the same folder
- Per-frame tuning variables are located in `css/*-Styles.css` (notably `--scroll-extra` and `--scroll-start-offset`)
- OBS file:// behavior varies by environment; for local browser testing, prefer running a static HTTP server

---

## �🔴 Critical Issues


## 🟠 High Priority Issues

### Scaling Preview to Template Consistency

**Current State:**
- Frame 1 uses a `scale = 2` variable to properly scale preview to actual template
- Frame 2 also implements the scale system
- Frames 3 and 4 don't implement the scale system consistently
- Preview dimensions in editors don't match actual OBS dimensions

**Problem:** 
Users editing in the preview see different sizes than what appears in OBS, making it difficult to properly customize their widgets.

**Solution Implemented in F1:**
```javascript
const scale = 2;
// Then all CSS values are multiplied:
width: ${400 * scale}px;  // Preview = 400px, OBS = 800px
font-size: ${artistSizeValue * scale}px;
```

**Recommendations:**
1. **Standardize scale implementation** across all editors (F3, F4, and future frames)
2. **Document the scale factor** in each editor for consistency
3. **Consider making scale configurable** per frame if different frames need different ratios
4. **Add visual indicators** in the editor showing "Preview Size" vs "OBS Size"

### Missing OBS Dimensions

**Issue:** Many frames in `00-TemplateEditor.html` show "OBS: Width xxx, Height xxx"

**Affected Frames:**
- Frame 2: Width xxx, Height xxx
- Frame 3: Width xxx, Height xxx
- Frame 4: Width xxx, Height xxx
- Frames 5-7: Width xxx, Height xxx

**Recommendation:** 
1. Determine and document the correct OBS dimensions for each frame
2. Update the main editor page with accurate dimensions
3. Consider adding these dimensions as comments in each template file

## 🟡 Medium Priority Improvements

### Tasks from Active Development
- **Add placeholder HTML files** for frames 5–7 that display `static_assets/coming-soon.png`
- **Run lint/static checks** and address obvious DOM-query/usability issues in `js/common.js`
- **Add per-frame JSON configs** to make `js/common.js` fully declarative
- **Add automated visual regression tests** (requires serving over HTTP during test runs)
- **Clean up backup files** — remove `js/common.js.bak` or move it to an `archive/` folder when no longer needed

### Code Duplication

**Issue:** Template files (F1, F2, F3) have identical JavaScript logic with only CSS differences

**Impact:** 
- Maintenance burden - bugs need to be fixed in multiple places
- Inconsistent updates between frames
- Larger repository size

**Recommendations:**
1. **Extract common JavaScript to shared file:**
   - Create `shared/nowplaying-core.js` with common functions
   - Each template imports and uses shared code
   - Only frame-specific styling remains in individual files

2. **Create a template generator:**
   - Build a simple script to generate templates from a base
   - Reduces manual duplication errors

**Example structure:**
```
shared/
  ├── nowplaying-core.js       (fetchNowPlaying, animations, etc.)
  └── nowplaying-styles-base.css (common styles)
01-NowPlaying-F1.html          (imports core.js + F1 styles)
```

### Editor Code Duplication

**Issue:** All editor files have nearly identical JavaScript with only parameter differences

**Common code repeated:**
- HSL to Hex conversion function
- applyPreview() logic
- generateCSS() structure
- Event listeners setup

**Recommendations:**
1. **Create shared editor library:** `editor_assets/editor-core.js`
2. **Use configuration objects** for frame-specific parameters
3. **Reduce file sizes** and maintenance burden

### CSS Generation Workflow

**Current User Flow:**
1. Open editor in browser
2. Adjust sliders
3. Click "Save" to download CSS
4. Manually find and replace CSS file in `css_files/` folder
5. Refresh OBS browser source

**Pain Points:**
- Manual file replacement is error-prone
- Easy to save to wrong location
- No validation that CSS was replaced correctly

**Recommendations:**
1. **Add clear instructions** in the download dialog:
   ```
   "Save this file to: Angels-NowPlaying/css_files/01-NowPlaying-F1-Styles.css"
   "Then refresh your OBS browser source to see changes"
   ```

2. **Add file naming enforcement:** 
   - CSS downloads should have non-editable, correct filenames
   - Consider adding version/timestamp to prevent confusion

3. **Create a video tutorial** showing the complete workflow

4. **Add a "Test Your Changes" section** to the instructions page with common troubleshooting

### .gitignore Missing

**Issue:** No `.gitignore` file exists in the repository

**Risks:**
- Users might accidentally commit `Song.json` (personal music data)
- Users might accidentally commit `Artwork.png` (album artwork)
- Development files could be committed

**Recommendation:** Create `.gitignore` with:
```gitignore
# Tuna output files (user-specific)
Song.json
Artwork.png

# OS files
.DS_Store
Thumbs.db

# Editor files
*.swp
*.swo
*~

# Backup files
*.bak
*.backup
```

### Inconsistent Editor Layouts

**Observation:**
- Frame 3 has a different layout with additional sliders in a different section
- Frame 1 and 2 have similar layouts
- This inconsistency makes the UI less predictable

**Recommendation:**
- Standardize editor layout across all frames
- Group similar controls together
- Use consistent spacing and styling

## 🟢 Enhancement Suggestions

### Preview Improvements

1. **Add live text preview:**
   - Show how marquee/scrolling works with long text
   - Allow users to enter custom preview text
   - Show progress bar animation

2. **Add zoom controls:**
   - Let users zoom preview to match actual OBS scale
   - Add "View at 100%" and "View at 50%" buttons

3. **Add dark/light background toggle:**
   - Test widget visibility on different stream backgrounds
   - Help users see transparency issues

### Editor Feature Additions

1. **Color palette presets:**
   - Save favorite color schemes
   - Load preset color themes (Gaming, Chill, Neon, etc.)
   - Share color codes easily

2. **Import/Export settings:**
   - Export all slider values as JSON
   - Import settings from a file
   - Share configurations between users

3. **Reset to defaults button:**
   - Quick way to start over
   - Undo all changes at once

4. **Side-by-side comparison:**
   - Show preview next to "before" state
   - Help users see their changes more clearly

5. **Text alignment options for F3:**
   - Add radio buttons for align left, center, and right
   - F3's vertical layout would benefit from flexible text positioning
   - Consider implementing for other frames if successful

6. **Font selection dropdown:**
   - Add dropdown with Google Fonts or system font options
   - Include popular choices like Roboto, Open Sans, Poppins, etc.
   - Apply to all frames for consistency
   - Consider web font loading implications for OBS

### Documentation Improvements

1. **Add screenshots to README:**
   - Show each frame in action
   - Include setup screenshots
   - Add before/after customization examples

2. **Create troubleshooting guide:**
   - Widget not updating → Check Song.json path
   - Artwork not showing → Check Artwork.png path
   - CSS changes not applying → Refresh OBS source

3. **Add video tutorials:**
   - Initial setup walkthrough
   - Customization tutorial
   - Adding multiple frames to OBS

4. **Add Tuna configuration documentation:**
   - Include pictures/screenshots showing how to configure Tuna plugin
   - Step-by-step visual guide for Tuna setup
   - Add GIF showing editor workflow for users to see the complete customization process

5. **Create FAQ section:**
   - Why VLC and not Media Source?
   - Can I use with Spotify? (future feature)
   - How do I update the widget?

### User Experience

1. **Add success feedback:**
   - Show confirmation when CSS is downloaded
   - Display what the user should do next
   - Add visual checkmarks for completed steps

2. **Improve error handling:**
   - Validate slider ranges
   - Show warnings for extreme values
   - Prevent invalid configurations

3. **Add keyboard shortcuts:**
   - Ctrl+S to save
   - Ctrl+R to reset
   - ESC to cancel/go back

4. **Improve button positioning and responsiveness:**
   - Revise back buttons and save buttons to anchor them to the page
   - Make buttons work properly on different screen sizes
   - Current implementation uses fixed margin-top which doesn't scale

## 💡 New Frame Ideas

### Glassmorphism Frames (5-7)

**Current Plan:** Frames 5-7 are intended to use glassmorphism styling

**Additional Glassmorphism Variations:**

1. **F5: Full-Width Glass Banner**
   - Wide glass-morphic card across bottom of screen
   - Blurred background using album artwork
   - Frosted glass effect with backdrop-filter
   - Minimal controls (harder to customize due to nature of effect)
   - Recommended size: 1920x200

2. **F6: Circular Glass Bubble**
   - Compact circular design
   - Album art as circular element
   - Text wraps around or overlays glass circle
   - Perfect for corner placement
   - Recommended size: 400x400

3. **F7: Vertical Glass Panel**
   - Side panel style
   - Vertical text layout option
   - Subtle glow effects
   - Good for side-mounted camera setups
   - Recommended size: 300x800

### Additional Frame Concepts

4. **F8: Retro Vinyl/Cassette Theme**
   - Design inspired by vinyl records or cassette tapes
   - Animated spinning record effect
   - Warm, vintage color palette
   - Scanline effects optional
   - Great for retro gaming streams

5. **F9: Neon/Cyberpunk Theme**
   - Bright neon borders and text
   - Glitch effects on song changes
   - Animated neon glow
   - Dark background with vibrant accents
   - Perfect for cyberpunk/sci-fi games

6. **F10: Minimalist Text-Only**
   - No album artwork
   - Large, beautiful typography
   - Animated text transitions
   - Multiple font choices
   - Ultra-minimal for distraction-free streams

7. **F11: Compact Corner Card**
   - Very small footprint (200x200)
   - Just artwork and tiny text
   - Hover to expand animation (if OBS supports)
   - Perfect for crowded layouts

8. **F12: Equalizer Bars Theme**
   - Animated audio visualizer bars
   - Syncs with music beat (if possible)
   - Colorful spectrum display
   - Modern, dynamic look

9. **F13: Animated Waveform**
   - Audio waveform visualization
   - Smooth animations
   - Multiple color themes
   - Eye-catching and modern

10. **F14: Neumorphism/Soft UI**
    - Soft shadows and highlights
    - Subtle 3D effect
    - Pastel color options
    - Modern, trendy design

## 📋 **IMPLEMENTATION NOTES FOR NEW TEMPLATES (F8-F11)**

### **F8: Retro Vinyl/Cassette Theme - Implementation Details**
- **Toggle Method:** CSS opacity-based switching between vinyl and cassette modes
  ```css
  :root {
    --vinyl-opacity: 1;
    --cassette-opacity: 0;
  }
  ```
- **Vinyl Mode:** 
  - Spinning record animation using CSS `@keyframes rotate`
  - Static layout, minimal customization options
- **Cassette Mode:**
  - Animated tape winding effect (CSS animation on tape reels)
  - **No progress bar** for this variation
  - Static layout, minimal customization options
- **Editor Controls:** Simple radio button/toggle to switch between vinyl and cassette

### **F11: Retro OS Theme - Implementation Details**
- **Toggle Method:** CSS opacity-based background image switching
  ```css
  :root {
    --win98-opacity: 1;
    --winxp-opacity: 0;
    --win2k-opacity: 0;
  }
  ```
- **Background Variations:**
  - Windows 98-style frame image
  - Windows XP-style frame image  
  - Windows 2000-style frame image (optional)
  - Other classic OS variations as needed
- **Editor Controls:**
  - Background image selector (radio buttons or dropdown)
  - Font selection dropdown (system fonts like MS Sans Serif, Tahoma, etc.)
- **Implementation:** Hardcoded values for positioning, sizing, colors
- **Customization:** Minimal - just background theme and font choice

### **Development Strategy for F8 & F11**
- Keep layout modifications minimal
- Focus on visual theming rather than layout flexibility
- Use CSS custom properties for easy switching
- Hardcode most positioning/styling values
- Limit editor controls to essential theme toggles

---

### Theme Packs Concept

**Idea:** Group frames into theme packs

- **Classic Pack:** F1-F4 (current designs)
- **Glass Pack:** F5-F7 (glassmorphism)
- **Retro Pack:** Vinyl, cassette, VHS themes
- **Future Pack:** Neon, cyberpunk, holographic
- **Minimal Pack:** Text-only, clean designs

## 🔧 Technical Improvements

### Performance Optimization

1. **Reduce polling frequency:**
   - Current: Checks Song.json every 2000ms (2 seconds)
   - Consider: Only poll when OBS is streaming/recording
   - Could add configurable interval

2. **Optimize image loading:**
   - Cache artwork to reduce flicker
   - Preload next artwork if possible
   - Add loading states

3. **Minimize repaints:**
   - Use CSS transforms for animations (GPU accelerated)
   - Batch DOM updates
   - Use requestAnimationFrame appropriately

### Code Quality

1. **Add JSDoc comments:**
   - Document function parameters
   - Explain complex logic
   - Make code more maintainable

2. **Use modern JavaScript:**
   - Replace jQuery with vanilla JS or keep for consistency
   - Use ES6+ features (const/let, arrow functions, template literals)
   - Consider using modules

3. **Standardize code style:**
   - Consistent indentation (2 or 4 spaces)
   - Consistent quotes (single or double)
   - Add ESLint configuration

4. **Add error boundaries:**
   - Handle missing Song.json gracefully
   - Handle missing Artwork.png
   - Show user-friendly error messages

### Testing Considerations

1. **Manual test checklist:**
   - Test all sliders in each editor
   - Verify CSS downloads correctly
   - Test in OBS with different scenes
   - Check on different browsers

2. **Browser compatibility:**
   - Test in Chrome (most OBS users)
   - Test in Firefox
   - Document any known issues

## 📊 Future Feature Ideas

### Advanced Features

1. **Multiple data sources:**
   - Spotify Web API integration
   - YouTube Music support
   - Apple Music integration
   - Last.fm scrobbling

2. **Animation presets:**
   - Choose from different entrance/exit animations
   - Transition effects between songs
   - Customizable animation speeds

3. **Historical tracking:**
   - Show recently played songs
   - Export playlist to file
   - Share "Now Playing" history

4. **Interactive elements:**
   - Click to skip song (if API supports)
   - Request song functionality
   - Chat integration for song requests

### Community Features

1. **Template sharing:**
   - Users can share their CSS configurations
   - Community template gallery
   - Rating system for templates

2. **Plugin system:**
   - Allow community-created frames
   - Standardized frame interface
   - Easy installation process

## 📋 Implementation Priority

### Phase 1 (Immediate)
- [ ] Create placeholder templates for F4-F7 or hide them
- [ ] Generate default CSS files for all frames
- [ ] Add .gitignore file
- [ ] Document correct OBS dimensions for all frames
- [ ] Improve back button with fallback logic

### Phase 2 (Short-term)
- [ ] Implement scale system consistently across all editors
- [ ] Standardize editor layouts
- [ ] Add better CSS download instructions
- [ ] Improve README with screenshots and troubleshooting

### Phase 3 (Medium-term)
- [ ] Extract common JavaScript to shared files
- [ ] Create editor configuration system
- [ ] Implement new frame designs (glassmorphism)
- [ ] Add preview improvements (live text, zoom, backgrounds)

### Phase 4 (Long-term)
- [ ] Additional frame themes (retro, neon, minimal, etc.)
- [ ] Advanced features (multiple data sources)
- [ ] Community features (template sharing)
- [ ] Performance optimizations

## 🐛 Potential Bugs to Watch For

1. **Race conditions:**
   - Fast song changes might cause animation glitches
   - Multiple AJAX requests overlapping

2. **Memory leaks:**
   - Image cache growing indefinitely
   - Event listeners not being cleaned up

3. **Browser compatibility:**
   - CSS backdrop-filter not supported in all browsers
   - Some animations might not work in older OBS versions

4. **File path issues:**
   - Relative paths breaking when files are moved
   - Song.json/Artwork.png in wrong location

5. **Text overflow:**
   - Very long song titles breaking layout
   - Marquee animation calculation errors
   - Special characters causing display issues

## 📝 Notes

- Keep the no-backend constraint in mind for all suggestions
- All features must work as local files in OBS
- Focus on simplicity and ease of use for streamers
- Maintain backward compatibility with existing user setups
- Consider adding version numbers to releases for easier support

## 🎯 Immediate Next Steps

Based on recent development work, the recommended action plan is:

1. **Run the Top priority integration test** for F1–F4 and file any mismatches as issues
2. **When editor `generateCSS()` is stable**, consider adding a small automated test harness (optional manual script) to exercise the download-and-verify flow
3. **Address critical missing files** for F4-F7 to prevent broken browser sources
4. **Standardize scaling implementation** across all editors for consistent preview behavior

---

**Last Updated:** 2025-10-26  
**Version:** Based on repository version 0.3.4


