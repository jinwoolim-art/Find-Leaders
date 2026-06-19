#!/usr/bin/env node
/**
 * merge-build.js
 * candidate-dashboard-bundle_02.html → 물리적 병합 + SVG 아이콘 교체 + 숨김 해제
 */
const fs = require('fs');

// ── 1. SVG 아이콘 맵 (Material Symbols Outlined → inline SVG) ──
const SVG = {
  'person_search': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z"/><path d="M20.47 17.47l-2.44-2.44A4.02 4.02 0 0 0 19 12.5a4 4 0 1 0-4 4c.93 0 1.8-.33 2.53-.97l2.44 2.44 1.06-1.06ZM16 12.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"/></svg>',
  'face': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M9 11.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm6 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37a9.96 9.96 0 0 0 8.61 5.22c.07.33.13.67.13 1.01 0 4.41-3.59 8-8 8Z"/></svg>',
  'dashboard': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z"/></svg>',
  'person': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z"/></svg>',
  'smart_toy': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3ZM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5ZM16 17H8v-2h8v2Zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13Z"/></svg>',
  'bar_chart': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M4 9h4v11H4V9Zm6-5h4v16h-4V4Zm6 8h4v8h-4v-8Z"/></svg>',
  'shopping_cart': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2ZM1 2v2h2l3.6 7.59-1.35 2.45C4.52 15.37 5.48 17 7 17h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 20.01 4H5.21l-.94-2H1Zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2Z"/></svg>',
  'settings': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94a7.07 7.07 0 0 0 .06-.94c0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.26.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58ZM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2Z"/></svg>',
  'logout': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5ZM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5Z"/></svg>',
  'construction': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M13.78 15.3l4.76 4.75-1.42 1.42-4.75-4.76-1.42 1.42L6.2 13.37l.71-.71 2.83-2.83-.71-.71 2.83-2.83.71.71 2.12-2.12-1.42-1.42 4.25-4.24 2.83 2.83-4.24 4.24-1.42-1.41-2.12 2.12.71.71-2.83 2.83-.71-.71-2.83 2.83.71.71z"/></svg>',
  'check_circle': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9Z"/></svg>',
  'edit': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/></svg>',
  'upload_file': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6Zm4 18H6V4h7v5h5v11Zm-6-8.12L15.88 16l-1.41 1.41L13 15.94V20h-2v-4.06l-1.47 1.47L8.12 16 12 11.88Z"/></svg>',
  'campaign': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18 11v2h4v-2h-4Zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61ZM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4ZM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1l5 3V6L5 9H4Zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34Z"/></svg>',
  'add_photo_alternate': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3Zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8h-3Zm-5 7l-3-4-2.25 3h9l-3.75-5"/></svg>',
  'close': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12Z"/></svg>',
  'visibility': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5ZM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5Zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3Z"/></svg>',
  'trending_up': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="m16 6 2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6Z"/></svg>',
  'schedule': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2ZM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8Zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7Z"/></svg>',
  'groups': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91ZM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2Zm1.13 1.1c-.37-.06-.74-.1-1.13-.1-.99 0-1.93.21-2.78.58A2.01 2.01 0 0 0 0 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29ZM20 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2Zm4 3.43c0-.81-.48-1.53-1.22-1.85A6.95 6.95 0 0 0 20 14c-.39 0-.76.04-1.13.1.4.68.63 1.46.63 2.29V18H24v-1.57ZM12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3Z"/></svg>',
  'info': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z"/></svg>',
  'warning': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z"/></svg>',
  'expand_more': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6Z"/></svg>',
  'expand_less': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="m12 8-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14Z"/></svg>',
  'navigate_next': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6Z"/></svg>',
  'navigate_before': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12Z"/></svg>',
  'add': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z"/></svg>',
  'delete': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z"/></svg>',
  'save': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V7l-4-4Zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3Zm3-10H5V5h10v4Z"/></svg>',
  'search': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z"/></svg>',
  'favorite': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z"/></svg>',
  'photo_camera': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3.2"/><path d="M9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9Zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5Z"/></svg>',
  'help': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm1 17h-2v-2h2v2Zm2.07-7.75-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25Z"/></svg>',
  'help_outline': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M11 18h2v-2h-2v2Zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4Z"/></svg>',
  'arrow_forward': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="m12 4-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8Z"/></svg>',
  'arrow_back': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2Z"/></svg>',
  'more_vert': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2Zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2Zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2Z"/></svg>',
  'menu': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2Zm0-5h18v-2H3v2Zm0-7v2h18V6H3Z"/></svg>',
  'location_on': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5Z"/></svg>',
  'event': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17 12h-5v5h5v-5ZM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2Zm3 18H5V8h14v11Z"/></svg>',
  'email': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z"/></svg>',
  'phone': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2Z"/></svg>',
  'link': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1ZM8 13h8v-2H8v2Zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5Z"/></svg>',
  'download': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M5 20h14v-2H5v2ZM19 9h-4V3H9v6H5l7 7 7-7Z"/></svg>',
  'play_arrow': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7Z"/></svg>',
  'mic': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3Zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7Z"/></svg>',
  'notifications': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2Zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2Z"/></svg>',
  'account_circle': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3Zm0 14.2a7.2 7.2 0 0 1-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 0 1-6 3.22Z"/></svg>',
  'thumb_up': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h4V9H1v12Zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2Z"/></svg>',
  'share': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81a3 3 0 1 0-3-3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9a3 3 0 1 0 0 6c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65a2.92 2.92 0 0 0 2.92 2.92A2.92 2.92 0 0 0 21 18.92 2.92 2.92 0 0 0 18 16.08Z"/></svg>',
  'policy': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4Zm-1 6h2v2h-2V7Zm0 4h2v6h-2v-6Z"/></svg>',
  'verified': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="m23 12-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5 12 21.04l3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12Zm-12.91 4.72-3.8-3.8 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.34Z"/></svg>',
  'record_voice_over': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="9" r="4"/><path d="M9 15c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Zm7.76-9.64-1.68 1.69c.84 1.18.84 2.71 0 3.89l1.68 1.69c2.02-2.02 2.02-5.07 0-7.27ZM20.07 2l-1.63 1.63c2.77 3.02 2.77 7.56 0 10.74L20.07 16c3.9-3.89 3.91-9.95 0-14Z"/></svg>',
  'monitoring': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 11.5c0 2-2.5 3.5-2.5 5h-2c0-1.5-2.5-3-2.5-5a3.5 3.5 0 1 1 7 0ZM11 19h2v1h-2v-1ZM12 2C6.48 2 2 6.48 2 12h2a8 8 0 0 1 8-8V2Zm0 4c-3.31 0-6 2.69-6 6h2c0-2.21 1.79-4 4-4V6Zm8 6c0-4.42-3.58-8-8-8v2a6 6 0 0 1 6 6h2Z"/></svg>',
  'token': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5-10-5-10 5Zm0-5l10 5 10-5-10-5-10 5Z"/></svg>',
  'toll': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M15 4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8Zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6ZM3 12a6 6 0 0 1 4-5.66V4.26C3.55 5.15 1 8.27 1 12s2.55 6.85 6 7.74v-2.08A6 6 0 0 1 3 12Z"/></svg>',
  'credit_card': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2Zm0 14H4v-6h16v6Zm0-10H4V6h16v2Z"/></svg>',
  'diamond': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5L2 9l10 12L22 9l-3-6ZM9.62 8l1.5-3h1.76l1.5 3H9.62ZM11 10v6.68L5.44 10H11Zm2 0h5.56L13 16.68V10Zm6.26-2h-2.65l-1.5-3h2.65l1.5 3ZM6.24 5h2.65l-1.5 3H4.74l1.5-3Z"/></svg>',
  'payments': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2Zm-9-1c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3Zm13-6v11c0 1.1-.9 2-2 2H4v-2h17V7h2Z"/></svg>',
  'speed': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="m20.38 8.57-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44Zm-9.79 6.84a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83Z"/></svg>',
  'insights': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M21 8c-1.45 0-2.26 1.44-1.93 2.51l-3.55 3.56c-.3-.09-.74-.09-1.04 0l-2.55-2.55C12.27 10.45 11.46 9 10 9c-1.45 0-2.27 1.44-1.93 2.52l-4.56 4.55C2.44 15.74 1 16.55 1 18c0 1.1.9 2 2 2s2-.9 2-2c0-.45-.12-.86-.34-1.22l4.56-4.56c.3.1.74.1 1.04 0l2.55 2.55C12.73 15.55 13.54 17 15 17c1.45 0 2.27-1.44 1.93-2.52l3.56-3.55c1.07.33 2.51-.48 2.51-1.93 0-1.1-.9-2-2-2Z"/></svg>',
  'local_fire_department': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12.9a2.13 2.13 0 0 0-2 2.22c0 1.23.8 2.22 2 2.22s2-1 2-2.22-.8-2.22-2-2.22ZM16 6l-.44.55C14.38 8.02 12 7.19 12 5.3V2S4 7 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8c0-2.96-1.61-5.62-4-7.03ZM12 20c-2.76 0-5-2.21-5-4.92C7 12.25 9.68 9.5 11.21 8.4 11.79 9.94 13.36 11 15 11c.58 0 1.13-.12 1.64-.32.19.82.36 1.76.36 2.4 0 2.71-2.24 4.92-5 4.92Z"/></svg>',
  'person_add': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6Zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z"/></svg>',
  'lock': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2Zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2Zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2Z"/></svg>',
  'how_to_vote': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18 13h-.68l-2 2h1.91L19 17H5l1.78-2h2.05l-2-2H6l-3 3v4c0 1.1.89 2 1.99 2H19c1.1 0 2-.89 2-2v-4l-3-3Zm-1-5.05-4.95 4.95-3.54-3.54 4.95-4.95L17 7.95Zm-4.24-5.66L6.39 8.66a.996.996 0 0 0 0 1.41l4.95 4.95c.39.39 1.02.39 1.41 0l6.36-6.36a.996.996 0 0 0 0-1.41l-4.95-4.95a.996.996 0 0 0-1.41 0Z"/></svg>',
  'block': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2ZM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9A7.902 7.902 0 0 1 4 12Zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1A7.902 7.902 0 0 1 20 12c0 4.42-3.58 8-8 8Z"/></svg>',
  'send': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
  'chat': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2ZM6 9h12v2H6V9Zm8 5H6v-2h8v2Zm4-6H6V6h12v2Z"/></svg>',
  'emoji_people': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm3.5 5h-7C7.67 7 7 7.67 7 8.5V12h2v7h2v-4h2v4h2v-7h2V8.5C17 7.67 16.33 7 15.5 7Z"/></svg>',
  'psychology': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M13 8.57a1.43 1.43 0 1 0 0 2.86 1.43 1.43 0 0 0 0-2.86ZM13 3C9.25 3 6.2 5.94 6.02 9.64L4.1 12.2a.5.5 0 0 0 .4.8H6v3c0 1.1.9 2 2 2h1v3h7v-4.68A7 7 0 0 0 13 3Zm2.99 8.83L15 12.39V17h-3v-3h-1c-1.1 0-2-.9-2-2v-2H7.17l.91-1.22C8.56 6.55 10.59 5 13 5c2.76 0 5 2.24 5 5 0 1.12-.37 2.16-1.01 2.99v-.16Z"/></svg>',
  'description': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6Zm2 16H8v-2h8v2Zm0-4H8v-2h8v2Zm-3-5V3.5L18.5 9H13Z"/></svg>',
  'library_books': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6Zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2Zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2Z"/></svg>',
  'newspaper': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="m22 3-1.67 1.67L18.67 3 17 4.67 15.33 3l-1.66 1.67L12 3l-1.67 1.67L8.67 3 7 4.67 5.33 3 3.67 4.67 2 3v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V3ZM11 19H4v-2h7v2Zm0-4H4v-2h7v2Zm0-4H4V9h7v2Zm9 8h-7v-6h7v6Zm0-8h-7V9h7v2Z"/></svg>',
  'mark_email_unread': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-2-5.18V4l-6 3.73L4 4v2l8 5 6-3.73A3.96 3.96 0 0 1 18 2.82ZM18 8c-.68 0-1.34-.13-1.95-.35L12 10 4 6v10h16V7.65c-.61.22-1.27.35-1.95.35H18ZM4 4h7.08a6.04 6.04 0 0 0-.55 2H4l8 5 .42-.26A5.9 5.9 0 0 0 14 12l-2 1.25L4 8v-2h.01L4 4Zm0-2c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8.83A5.91 5.91 0 0 1 20 9.18V16H4V4h7.08c-.1-.33-.17-.66-.2-1H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9.18c-.31.11-.65.18-1 .22V16H4V6l8 5 2.61-1.63c-.06-.12-.09-.24-.14-.37L12 10.75 4 6V4Z"/></svg>',
  'audio_file': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6Zm-1 11h-2v5c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.37 0 .7.11 1 .28V10h3v3Zm0-4V3.5L18.5 9H13Z"/></svg>',
  'music_note': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6Z"/></svg>',
  'volume_up': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3Zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02ZM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77Z"/></svg>',
  'videocam': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4Z"/></svg>',
  'check': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z"/></svg>',
};

// ── 2. 아이콘 교체 함수 ──
function replaceIcons(html) {
  // Match <span ... class="...ms..." ...>iconname</span>
  return html.replace(/<span([^>]*class="[^"]*\bms\b[^"]*"[^>]*)>([a-z_]+)<\/span>/g, (match, attrs, name) => {
    if (!SVG[name]) return match; // unknown icon, keep as-is
    // Extract style to get font-size and color
    let size = 24;
    const fsMatch = attrs.match(/font-size:\s*(\d+)px/);
    if (fsMatch) size = parseInt(fsMatch[1]);
    const colorMatch = attrs.match(/color:\s*([^;"]+)/);
    let color = 'currentColor';
    if (colorMatch) color = colorMatch[1].trim();
    // Build SVG with correct size
    let svg = SVG[name]
      .replace(/width="\d+"/, `width="${size}"`)
      .replace(/height="\d+"/, `height="${size}"`)
      .replace(/fill="currentColor"/, `fill="${color}"`);
    return `<span style="display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;line-height:1">${svg}</span>`;
  });
}

// ── 3. 숨김 해제 함수 ──
function unhideAll(html) {
  // Remove "hidden" class
  html = html.replace(/\bclass="([^"]*)"/g, (m, cls) => {
    const newCls = cls.replace(/\bhidden\b/g, '').replace(/\s+/g, ' ').trim();
    return `class="${newCls}"`;
  });
  // Remove display:none from inline styles
  html = html.replace(/display:\s*none\s*;?/gi, '');
  // Open all <details>
  html = html.replace(/<details/g, '<details open');
  return html;
}

// ── 4. 각 임베디드 페이지에서 body 내부 + style 추출 ──
function extractPage(filename) {
  const html = fs.readFileSync(filename, 'utf8');
  // Extract styles from <head>
  const styles = [];
  const styleRe = /<style>([\s\S]*?)<\/style>/g;
  let sm;
  while ((sm = styleRe.exec(html)) !== null) {
    styles.push(sm[1]);
  }
  // Extract body inner content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
  let body = bodyMatch ? bodyMatch[1] : html;
  // Extract inline scripts (but skip tailwind config)
  const scripts = [];
  const scriptRe = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g;
  let scm;
  while ((scm = scriptRe.exec(body)) !== null) {
    if (!scm[1].includes('tailwind.config')) {
      scripts.push(scm[1]);
    }
  }
  // Remove script tags from body
  body = body.replace(/<script[\s\S]*?<\/script>/g, '');
  // Remove any embedded sidebars (they have their own in-iframe sidebars we don't need)
  // Remove aside elements (duplicate sidebars)
  body = body.replace(/<aside[\s\S]*?<\/aside>/g, '');
  // Remove references to sidebar width offset (ml-[216px] etc.)
  body = body.replace(/margin-left:\s*216px/g, 'margin-left:0');
  body = body.replace(/left:\s*216px/g, 'left:0');
  body = body.replace(/ml-\[216px\]/g, '');
  // Fix position:fixed elements to position:relative for stacking
  body = body.replace(/position:\s*fixed/g, 'position:relative');
  return { styles: styles.join('\n'), body, scripts };
}

// ── 5. 메인 빌드 ──
const mainHtml = fs.readFileSync('candidate-dashboard-bundle_02.html', 'utf8');

// Extract main page head styles
const mainStyleMatch = mainHtml.match(/<style>([\s\S]*?)<\/style>/);
const mainStyles = mainStyleMatch ? mainStyleMatch[1] : '';

// Extract sidebar HTML
const sidebarMatch = mainHtml.match(/<!-- ══════════ SIDEBAR ══════════ -->\n([\s\S]*?)<!-- ══════════ CONTENT ══════════ -->/);
const sidebarHtml = sidebarMatch ? sidebarMatch[1] : '';

// Extract terms overlay
const termsMatch = mainHtml.match(/<!-- ══════════ D-5:[\s\S]*?<\/div>\n<\/div>/);
const termsHtml = termsMatch ? termsMatch[0] : '';

// Page configs
const pages = [
  { name: 'operations', label: '1. 운영현황 (Operations)', file: 'SRC_OPERATIONS.extracted.html' },
  { name: 'candidate', label: '2. 후보자 (Candidate)', file: 'SRC_CANDIDATE.extracted.html' },
  { name: 'avatar',    label: '3. 아바타 (Avatar)',      file: 'SRC_AVATAR.extracted.html' },
  { name: 'analytics', label: '4. 통계 (Analytics)',     file: 'SRC_ANALYTICS.extracted.html' },
  { name: 'purchase',  label: '5. 구매 (Purchase)',      file: 'SRC_PURCHASE.extracted.html' },
];

// Build
let allStyles = mainStyles + '\n/* ══ CAPTURE OVERRIDES ══ */\n';
allStyles += `
body{overflow:auto!important;height:auto!important}
.screen.hidden,.pane.hidden{display:block!important}
#content{position:relative!important;width:100%!important;top:auto!important;left:auto!important;right:auto!important;bottom:auto!important}
.section-label{background:#7c3aed;color:#fff;font-size:18px;font-weight:900;padding:16px 24px;text-align:center;letter-spacing:1px;font-family:'Noto Sans KR',sans-serif}
.section-wrap{background:#f0f4f8;min-height:200px;position:relative}
iframe{display:none!important}
`;

let allScripts = [];
let sectionsHtml = '';

pages.forEach(p => {
  const { styles, body, scripts } = extractPage(p.file);
  allStyles += `\n/* ══ ${p.label} ══ */\n${styles}\n`;
  sectionsHtml += `<div class="section-label">${p.label}</div>\n`;
  sectionsHtml += `<div class="section-wrap" id="section-${p.name}">${body}</div>\n`;
  allScripts.push(...scripts);
});

// Build final HTML
let output = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>후보자 대시보드 (통합 병합) | 일꾼을찾다</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet"/>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script>tailwind.config={theme:{extend:{colors:{primary:"#7c3aed","primary-dark":"#6d28d9"},fontFamily:{sans:["Noto Sans KR","sans-serif"]}}}}<\/script>
  <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async><\/script>
  <style>
${allStyles}
  </style>
</head>
<body style="font-family:'Noto Sans KR',sans-serif;margin:0;background:#111827">
<div style="display:flex;min-height:100vh">

<!-- ══════════ SIDEBAR ══════════ -->
${sidebarHtml}

<!-- ══════════ MERGED CONTENT ══════════ -->
<div id="content" style="flex:1;display:flex;flex-direction:column">
${sectionsHtml}

<div class="section-label">6. 약관 동의 (Terms Agreement)</div>
<div class="section-wrap" style="background:rgba(0,0,0,.6);padding:20px 0">
${termsHtml.replace(/style="display:none;position:fixed[^"]*"/, 'style="display:block;position:relative;padding:20px 0"')}
</div>
</div>
</div>

<script>
${allScripts.join('\n')}
<\/script>
</body>
</html>`;

// Apply icon replacement and unhide
output = replaceIcons(output);
output = unhideAll(output);

fs.writeFileSync('candidate-dashboard-bundle_02_merged.html', output);
console.log('✅ Merged file written: candidate-dashboard-bundle_02_merged.html');
console.log('Size:', (output.length / 1024).toFixed(1), 'KB');
