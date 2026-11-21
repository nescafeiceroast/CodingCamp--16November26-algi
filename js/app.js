(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Shared utility
  // ---------------------------------------------------------------------------

  /**
   * Wraps localStorage.setItem in a try/catch.
   * Returns true on success, false if the write throws
   * (e.g. storage quota exceeded or private-browsing restriction).
   *
   * @param {string} key
   * @param {string} value
   * @returns {boolean}
   */
  function safeWrite(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // ThemeModule — Task 2.2
  // Requirement 11: Light / Dark Mode Toggle
  // ---------------------------------------------------------------------------

  const ThemeModule = (function () {
    // Valid theme values; anything else falls back to the default.
    const VALID_THEMES = ['light', 'dark'];
    const DEFAULT_THEME = 'light';
    const STORAGE_KEY = 'tld_theme';

    // Internal state: tracks the currently applied theme for the session.
    let _currentTheme = DEFAULT_THEME;

    /**
     * Apply `theme` to the <html> data-theme attribute.
     * @param {string} theme  "light" | "dark"
     */
    function _applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      _currentTheme = theme;
    }

    /**
     * Show or clear the inline write-failure warning adjacent to #theme-toggle.
     * The warning element is created lazily so the HTML need not define it.
     * @param {boolean} show
     */
    function _setStorageWarning(show) {
      const toggle = document.getElementById('theme-toggle');
      if (!toggle) return;

      let warning = document.getElementById('theme-storage-warning');

      if (show) {
        if (!warning) {
          warning = document.createElement('span');
          warning.id = 'theme-storage-warning';
          warning.setAttribute('role', 'alert');
          warning.className = 'error-msg';
          warning.textContent = 'Theme preference could not be saved.';
          toggle.insertAdjacentElement('afterend', warning);
        }
      } else {
        if (warning) {
          warning.remove();
        }
      }
    }

    /**
     * Initialises the theme module:
     *  1. Reads tld_theme from localStorage.
     *  2. Validates the value is "light" or "dark"; defaults to "light".
     *  3. Sets data-theme on <html>.
     *  4. Attaches a click handler to #theme-toggle.
     *
     * Requirements: 11.4, 11.5, 11.6
     */
    function init() {
      const stored = localStorage.getItem(STORAGE_KEY);
      const theme = VALID_THEMES.includes(stored) ? stored : DEFAULT_THEME;
      _applyTheme(theme);

      const toggleBtn = document.getElementById('theme-toggle');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', function () {
          // Flip between the two valid themes.
          const next = _currentTheme === 'light' ? 'dark' : 'light';
          _applyTheme(next);

          // Persist and show a warning only if the write fails.
          const saved = safeWrite(STORAGE_KEY, next);
          _setStorageWarning(!saved);
        });
      }
    }

    /**
     * Returns the currently applied theme string.
     * @returns {"light"|"dark"}
     */
    function getTheme() {
      return _currentTheme;
    }

    return { init, getTheme };
  })();

  // ---------------------------------------------------------------------------
  // GreetingModule — Task 3.1
  // Requirements 1 (Greeting Panel) and 2 (Custom Name in Greeting)
  // ---------------------------------------------------------------------------

  const GreetingModule = (function () {
    const STORAGE_KEY = 'tld_name';
    const MAX_NAME_LENGTH = 50;

    let _intervalId = null;

    /**
     * Returns the greeting phrase for a given hour (0–23).
     *  5–11  → "Good Morning"
     *  12–17 → "Good Afternoon"
     *  18–20 → "Good Evening"
     *  else  → "Good Night"
     *
     * @param {number} hour  Integer in range 0–23.
     * @returns {string}
     */
    function _greetingPhrase(hour) {
      if (hour >= 5 && hour <= 11) return 'Good Morning';
      if (hour >= 12 && hour <= 17) return 'Good Afternoon';
      if (hour >= 18 && hour <= 20) return 'Good Evening';
      return 'Good Night';
    }

    /**
     * Formats a Date as "Weekday, DD Month YYYY"
     * (e.g. "Saturday, 21 November 2026") using the user's locale
     * with explicit options so the structure is always predictable.
     *
     * @param {Date} date
     * @returns {string}
     */
    function _formatDate(date) {
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    }

    /**
     * Formats hours and minutes as "HH:MM" (24-hour, zero-padded).
     * @param {Date} date
     * @returns {string}
     */
    function _formatTime(date) {
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }

    /**
     * Builds the full greeting string from the current phrase and the
     * stored name (if any).
     *
     * @param {string} phrase   e.g. "Good Morning"
     * @param {string|null} name  Trimmed stored name, or null/empty.
     * @returns {string}
     */
    function _buildGreetingText(phrase, name) {
      return name ? `${phrase}, ${name}` : phrase;
    }

    /**
     * Reads the stored name from localStorage (returns empty string if absent).
     * @returns {string}
     */
    function _readStoredName() {
      return localStorage.getItem(STORAGE_KEY) || '';
    }

    /**
     * Updates #greeting-time, #greeting-date, and #greeting-text from
     * the current date/time and the currently stored name.
     * Called once during init() and then every second by setInterval.
     */
    function _tick() {
      const now = new Date();
      const timeEl = document.getElementById('greeting-time');
      const dateEl = document.getElementById('greeting-date');
      const textEl = document.getElementById('greeting-text');

      if (timeEl) timeEl.textContent = _formatTime(now);
      if (dateEl) dateEl.textContent = _formatDate(now);
      if (textEl) {
        const phrase = _greetingPhrase(now.getHours());
        const name = _readStoredName();
        textEl.textContent = _buildGreetingText(phrase, name);
      }
    }

    /**
     * Handles name form submission.
     *  - Trims the raw value.
     *  - If empty → clears name display, removes localStorage entry.
     *  - If > 50 chars → shows inline error on #greeting-name-form, rejects.
     *  - Otherwise → updates greeting display and persists via safeWrite.
     *
     * @param {string} rawValue  The current value of the name input.
     */
    function _submitName(rawValue) {
      const errorEl = document.getElementById('greeting-name-error');
      const trimmed = rawValue.trim();

      // Clear any previous error.
      if (errorEl) errorEl.textContent = '';

      if (trimmed.length === 0) {
        // Empty submission — clear the stored name and re-render greeting.
        localStorage.removeItem(STORAGE_KEY);
        _tick();
        return;
      }

      if (trimmed.length > MAX_NAME_LENGTH) {
        if (errorEl) errorEl.textContent = 'Name must be 50 characters or fewer.';
        return;
      }

      // Valid name — persist and re-render.
      safeWrite(STORAGE_KEY, trimmed);
      _tick();
    }

    /**
     * Initialises the GreetingModule:
     *  1. Renders the initial time, date, and greeting (including saved name).
     *  2. Starts a 1 000 ms interval that calls _tick().
     *  3. Attaches a submit handler to #greeting-name-form.
     *
     * Requirements: 1.1, 1.2, 1.3–1.7, 2.1–2.6
     */
    function init() {
      // Initial render.
      _tick();

      // Start the clock.
      _intervalId = setInterval(_tick, 1000);

      // Name form handler.
      const form = document.getElementById('greeting-name-form');
      if (form) {
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          const input = document.getElementById('greeting-name-input');
          _submitName(input ? input.value : '');
        });

        // Clear error on input modification (Requirement 2.6 UX).
        const input = document.getElementById('greeting-name-input');
        if (input) {
          input.addEventListener('input', function () {
            const errorEl = document.getElementById('greeting-name-error');
            if (errorEl) errorEl.textContent = '';
          });
        }
      }
    }

    return { init, _greetingPhrase, _formatDate, _submitName, _tick };
  })();

  // ---------------------------------------------------------------------------
  // TimerModule — placeholder (Task 5.1)
  // ---------------------------------------------------------------------------
  // const TimerModule = { init() {} };

  // ---------------------------------------------------------------------------
  // TodoModule — placeholder (Tasks 6.1, 7.1)
  // ---------------------------------------------------------------------------
  // const TodoModule = { init() {} };

  // ---------------------------------------------------------------------------
  // QuickLinksModule — placeholder (Task 9.1)
  // ---------------------------------------------------------------------------
  // const QuickLinksModule = { init() {} };

  // ---------------------------------------------------------------------------
  // Bootstrap — initialise modules in dependency order on DOMContentLoaded
  // ThemeModule runs first to prevent a flash of the default theme.
  // ---------------------------------------------------------------------------

  document.addEventListener('DOMContentLoaded', function () {
    ThemeModule.init();
    GreetingModule.init();
    // TimerModule.init();      // uncomment when Task 5.1 is complete
    // TodoModule.init();       // uncomment when Tasks 6.1/7.1 are complete
    // QuickLinksModule.init(); // uncomment when Task 9.1 is complete
  });

})();
