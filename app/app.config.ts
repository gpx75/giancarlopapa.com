export default defineAppConfig({
  ui: {
    /**
     * Semantic color roles → Snazzy terminal palette
     *
     * Light mode shading is handled by CSS variables in assets/css/main.css:
     *   body / headings use snazzy-dark-950 (#282a36) on light, snazzy-dark-100 (#eff0eb) on dark
     *
     * Snazzy ANSI mapping:
     *   cyan     #9aedfe  →  primary   (Nuxt UI built-in cyan scale)
     *   blue     #57c7ff  →  secondary (snazzy-blue scale)
     *   magenta  #ff6ac1  →  tertiary  (magenta scale)
     *   cyan     #9aedfe  →  info      (snazzy-cyan scale)
     *   green    #5af78e  →  success   (terminal scale)
     *   yellow   #f3f99d  →  warning   (snazzy-yellow scale)
     *   red      #ff5c57  →  error     (snazzy-red scale)
     *   bg/fg    #282a36→#eff0eb → neutral (snazzy-dark scale)
     */
    colors: {
      // ── Light: Tailwind cyan-600 (#0891b2) · Dark: cyan-400 (#22d3ee)
      primary: 'cyan',

      // ── Light/Dark: #57c7ff family
      secondary: 'snazzy-blue',

      // ── Light/Dark: #ff6ac1 family
      tertiary: 'magenta',

      // ── Light/Dark: #9aedfe family
      info: 'snazzy-cyan',

      // ── Light/Dark: #5af78e family
      success: 'terminal',

      // ── Light/Dark: #f3f99d family
      warning: 'snazzy-yellow',

      // ── Light/Dark: #ff5c57 family
      error: 'snazzy-red',

      // ── Light: 50→200 (whites/fg) · 400 (cursor) · 600 (grey) · 800→950 (dark/bg)
      //    Dark:  inverse — 950 as bg, 100 as fg
      neutral: 'snazzy-dark'
    }
  }
});
