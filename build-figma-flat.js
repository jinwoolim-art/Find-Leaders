#!/usr/bin/env node
// ilgun-platform-v3.html → ilgun-platform-v3-figma-flat.html
// - body.figma-flat 강제 (세로 스택, 모달/페이지 모두 펼침)
// - 1200px 폭 고정
// - <img> 전부 제거 (정적 + JS 템플릿)
// - material-symbols-outlined / iconify-icon → 인라인 24x24 SVG 플레이스홀더

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'ilgun-platform-v3.html');
const DST = path.join(__dirname, 'ilgun-platform-v3-figma-flat.html');

let html = fs.readFileSync(SRC, 'utf8');

// 1. <img ...> 태그 전체 제거 (자체 닫힘 + 일반)
//    - 정적 HTML, 템플릿 리터럴 안의 모든 <img ...> 매치
html = html.replace(/<img\b[^>]*\/?>(?:\s*<\/img>)?/gi, '');

// 2. material-symbols-outlined → 24x24 inline SVG 플레이스홀더
//    <span class="material-symbols-outlined ...">icon_name</span>
//    -> <svg width="24" height="24" viewBox="0 0 24 24" data-icon="icon_name">...</svg>
const ICON_SVG = (name, extraClass = '') => {
    const cls = extraClass ? ` class="${extraClass}"` : '';
    // 24x24 라운드 사각형 + 점: Figma export에서 명확한 SVG 노드로 잡힘
    return `<svg${cls} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-icon="${name}"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`;
};

// span 안의 텍스트 전부 → svg
html = html.replace(
    /<span\b([^>]*?)class="([^"]*\bmaterial-symbols-outlined\b[^"]*)"([^>]*)>([\s\S]*?)<\/span>/g,
    (m, pre, cls, post, inner) => {
        const name = inner.trim().replace(/<[^>]+>/g, '').replace(/"/g, '&quot;') || 'icon';
        // 클래스에서 material-symbols-outlined 제거 후 보존(색/크기 유틸리티 유지)
        const cleanedCls = cls.replace(/\bmaterial-symbols-outlined\b/g, '').replace(/\s+/g, ' ').trim();
        return ICON_SVG(name, cleanedCls);
    }
);

// 3. <iconify-icon icon="..."></iconify-icon> → SVG 플레이스홀더
html = html.replace(
    /<iconify-icon\b([^>]*?)icon="([^"]+)"([^>]*?)(?:\/>|>[\s\S]*?<\/iconify-icon>)/g,
    (m, pre, name, post) => ICON_SVG(name)
);

// 4. body 클래스에 figma-flat 강제 추가
html = html.replace(
    /<body\b([^>]*?)class="([^"]*)"([^>]*)>/,
    (m, pre, cls, post) => `<body${pre}class="${cls} figma-flat"${post}>`
);

// 5. 1200px 캔버스 + 모바일 콘텐츠 480px 유지 + 세로 정렬 CSS 주입
//    NOTE: 이 파일은 모바일 앱 (max-w-[480px]). 캔버스 폭만 1200px로 두고
//    실제 페이지/모달 콘텐츠는 480px 모바일 폭을 유지해서 가로로 늘어나는 사고 방지.
const FIGMA_OVERRIDE_CSS = `
    <style id="figma-flat-override">
        /* === Figma flat export — 1200px 캔버스 + 480px 모바일 콘텐츠 === */
        html, body {
            width: 1200px !important;
            min-width: 1200px !important;
            max-width: 1200px !important;
            margin: 0 !important;
            background: #f1f5f9 !important;
        }
        /* 외곽 wrapper: 1200px 폭(캔버스) — 모바일 콘텐츠는 가운데 480px */
        body.figma-flat > div.max-w-\\[480px\\] {
            width: 480px !important;
            max-width: 480px !important;
            margin: 0 auto !important;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08) !important;
            overflow: visible !important;
            background: #ffffff !important;
        }
        /* 페이지/모달 — 480px 모바일 폭 유지, 세로로만 스택 */
        body.figma-flat .page,
        body.figma-flat #report-modal,
        body.figma-flat #policy-modal,
        body.figma-flat #candidate-policy-modal,
        body.figma-flat #login-modal {
            width: 480px !important;
            max-width: 480px !important;
            margin: 0 auto !important;
            position: relative !important;
            display: block !important;
            float: none !important;
        }
        /* 절대/고정 위치 요소 → static 으로 변환해 겹침 방지 */
        body.figma-flat .absolute,
        body.figma-flat .fixed,
        body.figma-flat .sticky {
            position: relative !important;
            inset: auto !important;
            top: auto !important; left: auto !important; right: auto !important; bottom: auto !important;
            transform: none !important;
        }
        body.figma-flat #toast { display: none !important; }
        /* compare-fab 도 모바일 폭 유지 */
        body.figma-flat .compare-fab,
        body.figma-flat #compare-fab {
            width: 100% !important;
            max-width: 480px !important;
            margin: 16px auto !important;
        }
        /* 아이콘 SVG 가운데 정렬 */
        body.figma-flat svg[data-icon] { display: inline-block; vertical-align: middle; }
        /* 페이지 라벨도 모바일 폭에 맞춤 */
        body.figma-flat .page-section-label {
            width: 480px !important;
            margin: 0 auto !important;
            box-sizing: border-box;
        }
    </style>
`;
html = html.replace('</head>', FIGMA_OVERRIDE_CSS + '\n</head>');

// 6. 페이지 로드 시 모든 .hidden / .page 가시화 + 라벨 부착
const FORCE_REVEAL_SCRIPT = `
<script>
// figma-flat 강제 펼침: 모든 page / 모달 가시화 + 섹션 라벨 자동 삽입
window.addEventListener('DOMContentLoaded', function () {
    document.body.classList.add('figma-flat');
    // 모든 .page에 active + 라벨 부착
    document.querySelectorAll('.page').forEach(function (p) {
        p.classList.add('active');
        if (!p.previousElementSibling || !p.previousElementSibling.classList.contains('page-section-label')) {
            var lbl = document.createElement('div');
            lbl.className = 'page-section-label';
            lbl.textContent = (p.id || 'PAGE').toUpperCase();
            p.parentNode.insertBefore(lbl, p);
        }
    });
    // 모든 모달의 hidden 해제
    ['report-modal','policy-modal','candidate-policy-modal','login-modal'].forEach(function (id) {
        var m = document.getElementById(id);
        if (m) m.classList.remove('hidden');
    });
});
</script>
`;
html = html.replace('</body>', FORCE_REVEAL_SCRIPT + '\n</body>');

fs.writeFileSync(DST, html);

const srcSize = fs.statSync(SRC).size;
const dstSize = fs.statSync(DST).size;
console.log('OK — wrote', DST);
console.log('  src:', srcSize, 'bytes');
console.log('  dst:', dstSize, 'bytes');
console.log('  imgs removed, icons → inline svg, body.figma-flat forced, width=1200px');
