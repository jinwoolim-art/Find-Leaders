// KT Kiosk — 당선자 추출 스크립트
// 탐님 제공 당선자 명단(시정일보 + info.nec.go.kr 교육감 캡처)을
// assets/candidates-real.json(후보자 6/3 등록 데이터 + 사진)과 매칭해
// 슬림 winners.json(지역 → 시도지사/기초단체장/교육감 3인)을 생성한다.
//
// 매칭 키:
//   governor / superintendent : name (시도당 1명이라 유니크)
//   mayor                     : sido + sggName + name
//
// 사진: assets/nec-photos/nec_{huboid}.webp 가 있으면 경로, 없으면 null
//
// 실행:  node scripts/build-winners.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'candidates-real.json');
const PHOTO_DIR = path.join(ROOT, 'assets', 'nec-photos');
const OUT = path.join(ROOT, 'assets', 'winners.json');

// ── 당선자 명단 ──────────────────────────────────────────────
// 시도지사 (이름만, 16명)
const WIN_GOVERNOR = {
  '서울특별시': '오세훈', '부산광역시': '전재수', '대구광역시': '추경호',
  '인천광역시': '박찬대', '대전광역시': '허태정', '울산광역시': '김상욱',
  '세종특별자치시': '조상호', '경기도': '추미애', '강원특별자치도': '우상호',
  '충청북도': '신용한', '충청남도': '박수현', '전북특별자치도': '이원택',
  '경상북도': '이철우', '경상남도': '박완수', '제주특별자치도': '위성곤',
  '전남광주통합특별시': '민형배',
};

// 교육감 (이름만, 16명) — info.nec.go.kr 당선인 명부 캡처
const WIN_SUPER = {
  '서울특별시': '정근식', '부산광역시': '김석준', '대구광역시': '강은희',
  '인천광역시': '도성훈', '대전광역시': '오석진', '울산광역시': '조용식',
  '세종특별자치시': '강미애', '경기도': '안민석', '강원특별자치도': '강삼영',
  '충청북도': '윤건영', '충청남도': '이병도', '전북특별자치도': '천호성',
  '경상북도': '임종식', '경상남도': '권순기', '제주특별자치도': '고의숙',
  '전남광주통합특별시': '김대중',
};

// 기초단체장 (시도 → 구시군 → 당선자 이름)
const WIN_MAYOR = {
  '서울특별시': {
    '종로구': '유찬종', '중구': '김길성', '용산구': '김경대', '성동구': '유보화',
    '광진구': '김경호', '동대문구': '최동민', '중랑구': '류경기', '성북구': '이승로',
    '강북구': '정창수', '도봉구': '김동욱', '노원구': '서준오', '은평구': '김미경',
    '서대문구': '박운기', '마포구': '유동균', '양천구': '이기재', '강서구': '진교훈',
    '구로구': '장인홍', '금천구': '최기찬', '영등포구': '조유진', '동작구': '류삼영',
    '관악구': '박준희', '서초구': '전성수', '강남구': '김현기', '송파구': '서강석',
    '강동구': '이수희',
  },
  '경기도': {
    '수원시': '이재준', '용인시': '이상일', '고양시': '민경선', '화성시': '정명근',
    '성남시': '신상진', '부천시': '조용익', '남양주시': '최현덕', '안산시': '이민근',
    '평택시': '최원용', '안양시': '최대호', '시흥시': '임병택', '파주시': '손배찬',
    '김포시': '이기형', '의정부시': '김원기', '광주시': '박관열', '하남시': '이현재',
    '양주시': '정덕영', '광명시': '박승원', '군포시': '한대희', '오산시': '조용호',
    '이천시': '성수석', '안성시': '김보라', '구리시': '신동화', '포천시': '백영현',
    '의왕시': '김성제', '양평군': '전진선', '여주시': '이충우', '동두천시': '박형덕',
    '과천시': '신계용', '가평군': '서태원', '연천군': '김덕현',
  },
  '인천광역시': {
    '강화군': '박용철', '옹진군': '장정민', '제물포구': '김찬진', '영종구': '손화정',
    '미추홀구': '김정식', '연수구': '이재호', '남동구': '이병래', '부평구': '차준택',
    '계양구': '박형우', '서구': '구재용', '검단구': '김진규',
  },
  '부산광역시': {
    '중구': '최진봉', '서구': '공한수', '동구': '강철호', '영도구': '김철훈',
    '부산진구': '김영욱', '동래구': '장준용', '남구': '박재범', '북구': '정명희',
    '해운대구': '김성수', '사하구': '김태석', '금정구': '윤일현', '강서구': '박상준',
    '연제구': '주석수', '수영구': '강성태', '사상구': '서태경', '기장군': '우성빈',
  },
  '대구광역시': {
    '중구': '류규하', '동구': '우성진', '서구': '권오상', '남구': '조재구',
    '북구': '이근수', '수성구': '김대권', '달서구': '김용판', '달성군': '최재훈',
    '군위군': '김진열',
  },
  '대전광역시': {
    '동구': '황인호', '중구': '김제선', '서구': '전문학', '유성구': '정용래', '대덕구': '김찬술',
  },
  '울산광역시': {
    '중구': '김영길', '남구': '임현철', '동구': '천기옥', '북구': '이동권', '울주군': '이순걸',
  },
  '강원특별자치도': {
    '춘천시': '육동한', '원주시': '구자열', '강릉시': '김중남', '동해시': '이정학',
    '태백시': '이상호', '속초시': '이병선', '삼척시': '박상수', '홍천군': '신영재',
    '횡성군': '장신상', '영월군': '김길수', '평창군': '심재국', '정선군': '최승준',
    '철원군': '김동일', '화천군': '김세훈', '양구군': '김왕규', '인제군': '최상기',
    '고성군': '함명준', '양양군': '김정중',
  },
  '충청북도': {
    '청주시': '이장섭', '충주시': '이동석', '제천시': '이상천', '보은군': '최재형',
    '옥천군': '황규철', '영동군': '정영철', '증평군': '이재영', '진천군': '김명식',
    '괴산군': '송인헌', '음성군': '조병옥', '단양군': '김문근',
  },
  '충청남도': {
    '천안시': '장기수', '공주시': '최원철', '보령시': '엄승용', '아산시': '오세현',
    '서산시': '이완섭', '논산시': '백성현', '계룡시': '이응우', '당진시': '김기재',
    '금산군': '문정우', '부여군': '이용우', '서천군': '유승광', '청양군': '김홍열',
    '홍성군': '박정주', '예산군': '최재구', '태안군': '윤희신',
  },
  '전북특별자치도': {
    '전주시': '조지훈', '군산시': '김재준', '익산시': '최정호', '정읍시': '이학수',
    '남원시': '양충모', '김제시': '정성주', '완주군': '유희태', '진안군': '전춘성',
    '무주군': '황인홍', '장수군': '최훈식', '임실군': '한득수', '순창군': '최영일',
    '고창군': '심덕섭', '부안군': '권익현',
  },
  '경상북도': {
    '포항시': '박용선', '경주시': '주낙영', '김천시': '배낙호', '안동시': '권기창',
    '구미시': '김장호', '영주시': '황병직', '영천시': '김병삼', '상주시': '안재민',
    '문경시': '김학홍', '경산시': '조현일', '의성군': '최유철', '청송군': '윤경희',
    '영양군': '오도창', '영덕군': '조주홍', '청도군': '박권현', '고령군': '이남철',
    '성주군': '전화식', '칠곡군': '김재욱', '예천군': '안병윤', '봉화군': '최기영',
    '울진군': '황이주', '울릉군': '남한권',
  },
  '경상남도': {
    '창원시': '강기윤', '진주시': '조규일', '통영시': '강석주', '사천시': '박동식',
    '김해시': '정영두', '밀양시': '안병구', '거제시': '변광용', '양산시': '나동연',
    '의령군': '오태완', '함안군': '차석호', '창녕군': '성낙인', '고성군': '하학열',
    '남해군': '류경완', '하동군': '김현수', '산청군': '유명현', '함양군': '진병영',
    '거창군': '이홍기', '합천군': '김윤철',
  },
  '광주광역시': {
    '동구': '임택', '서구': '김이강', '남구': '김병내', '북구': '신수정', '광산구': '박병규',
  },
  '전라남도': {
    '목포시': '강성휘', '여수시': '서영학', '순천시': '손훈모', '나주시': '윤병태',
    '광양시': '박성현', '담양군': '박종원', '곡성군': '조상래', '구례군': '장길선',
    '고흥군': '공영민', '보성군': '김철우', '화순군': '임지락', '장흥군': '사순문',
    '강진군': '강진원', '해남군': '명현관', '영암군': '우승희', '무안군': '김산',
    '함평군': '이남오', '영광군': '장세일', '장성군': '김한종', '완도군': '김신',
    '진도군': '이재각', '신안군': '김태성',
  },
};

// ── 헬퍼 ─────────────────────────────────────────────────────
const photoSet = new Set(fs.readdirSync(PHOTO_DIR).filter((f) => f.endsWith('.webp')));
const photoFor = (huboid) =>
  photoSet.has(`nec_${huboid}.webp`) ? `assets/nec-photos/nec_${huboid}.webp` : null;

// 아바타 캐릭터 이미지 (assets/avatars/{huboid}.png) — 있으면 대화 화면에 표시
const AVATAR_DIR = path.join(ROOT, 'assets', 'avatars');
const avatarSet = new Set(fs.existsSync(AVATAR_DIR) ? fs.readdirSync(AVATAR_DIR).filter((f) => f.endsWith('.png')) : []);
const avatarFor = (huboid) =>
  avatarSet.has(`${huboid}.png`) ? `assets/avatars/${huboid}.png` : null;

// 기관 로고 (assets/org-logos/{huboid}.png) — 헤더 이름 앞에 표시
const ORG_DIR = path.join(ROOT, 'assets', 'org-logos');
const orgSet = new Set(fs.existsSync(ORG_DIR) ? fs.readdirSync(ORG_DIR).filter((f) => f.endsWith('.png')) : []);
const orgLogoFor = (huboid) =>
  orgSet.has(`${huboid}.png`) ? `assets/org-logos/${huboid}.png` : null;

function slim(c, roleLabel) {
  return {
    huboid: c.huboid,
    name: c.name,
    party: c.party,
    partyColor: c.partyColor || null,
    number: c.number ?? null,
    age: c.age ?? null,
    gender: c.gender || '',
    sido: c.sido,
    sggName: c.sggName || '',
    roleLabel,
    photo: photoFor(c.huboid),
    avatar: avatarFor(c.huboid),
    orgLogo: orgLogoFor(c.huboid),
    education: c.education || '',
    birthplace: c.birthplace || '',
    career: Array.isArray(c.career) ? c.career : [],
    pledges: Array.isArray(c.pledges)
      ? c.pledges.map((p) => ({ title: p.title || '', content: (p.content || '').slice(0, 600) }))
      : [],
  };
}

// 광주·전남: mayor 데이터는 '광주광역시'/'전라남도'로 분리 저장되지만,
// region은 통합('전남광주통합특별시')이므로 둘을 통합 region으로 묶는다.
const SIDO_ALIAS = { '광주광역시': '전남광주통합특별시', '전라남도': '전남광주통합특별시' };
const regionKey = (sido) => SIDO_ALIAS[sido] || sido;

const govRole = (sido) => {
  if (/도$/.test(sido)) return sido.replace('특별자치도', '도').replace(/도$/, '도지사');
  return sido + '장'; // 서울특별시장, 부산광역시장, 세종특별자치시장 ...
};
const mayorRole = (sgg) => {
  if (sgg.endsWith('구')) return sgg + '청장';
  if (sgg.endsWith('군')) return sgg + '수';
  if (sgg.endsWith('시')) return sgg + '장';
  return sgg + '장';
};

// ── 매칭 ─────────────────────────────────────────────────────
const data = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const regions = {};
const fails = [];

const findGov = (list, sido, name) =>
  list.find((c) => c.sido === sido && c.name === name) ||
  list.find((c) => c.name === name); // sido 표기 어긋나도 이름 fallback

for (const [sido, name] of Object.entries(WIN_GOVERNOR)) {
  regions[sido] ??= { label: sido, governor: null, superintendent: null, mayors: {} };
  const c = findGov(data.governor, sido, name);
  if (c) regions[sido].governor = slim(c, govRole(sido));
  else fails.push(`시도지사 매칭실패: ${sido} ${name}`);
}

for (const [sido, name] of Object.entries(WIN_SUPER)) {
  regions[sido] ??= { label: sido, governor: null, superintendent: null, mayors: {} };
  const c = findGov(data.superintendent, sido, name);
  if (c) regions[sido].superintendent = slim(c, sido.replace(/(특별자치도|특별자치시|특별시|광역시|도)$/, '') + '교육감');
  else fails.push(`교육감 매칭실패: ${sido} ${name}`);
}

for (const [sido, byGu] of Object.entries(WIN_MAYOR)) {
  const rk = regionKey(sido);
  regions[rk] ??= { label: rk, governor: null, superintendent: null, mayors: {} };
  for (const [sgg, name] of Object.entries(byGu)) {
    const c = data.mayor.find((x) => x.sido === sido && x.sggName === sgg && x.name === name);
    if (c) regions[rk].mayors[sgg] = slim(c, mayorRole(sgg));
    else fails.push(`구청장·시장·군수 매칭실패: ${sido} ${sgg} ${name}`);
  }
}

// 각 시도의 전체 선거구 목록(당선자 유무와 무관) — 드롭다운 채우기용.
// candidates의 mayor 후보 데이터에서 시도별 선거구명을 모은다.
const sggSets = {};
for (const c of data.mayor) {
  const rk = regionKey(c.sido);
  (sggSets[rk] ??= new Set()).add(c.sggName);
}
for (const [sido, r] of Object.entries(regions)) {
  r.sggList = sggSets[sido] ? [...sggSets[sido]].sort((a, b) => a.localeCompare(b, 'ko')) : [];
}

// ── 출력 ─────────────────────────────────────────────────────
const sidoOrder = [
  '서울특별시', '경기도', '인천광역시', '부산광역시', '대구광역시', '대전광역시',
  '울산광역시', '세종특별자치시', '강원특별자치도', '충청북도', '충청남도',
  '전북특별자치도', '경상북도', '경상남도', '제주특별자치도', '전남광주통합특별시',
];

const out = {
  _generated: new Date().toISOString().slice(0, 10),
  _sgId: data._sgId,
  _note: 'KT Kiosk 당선자 시드. governor/superintendent=전국, mayor=서울·경기·인천만(데모).',
  sidoOrder: sidoOrder.filter((s) => regions[s]),
  regions,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
// file:// 더블클릭으로도 열리도록 전역변수 형태(js)도 생성
const OUT_JS = path.join(ROOT, 'assets', 'winners.js');
fs.writeFileSync(OUT_JS, 'window.KT_WINNERS = ' + JSON.stringify(out) + ';\n', 'utf8');

// ── 리포트 ───────────────────────────────────────────────────
let nGov = 0, nSup = 0, nMayor = 0, nPhoto = 0, nTotal = 0;
for (const s of Object.values(regions)) {
  if (s.governor) { nGov++; nTotal++; if (s.governor.photo) nPhoto++; }
  if (s.superintendent) { nSup++; nTotal++; if (s.superintendent.photo) nPhoto++; }
  for (const m of Object.values(s.mayors)) { nMayor++; nTotal++; if (m.photo) nPhoto++; }
}
console.log('✅ winners.json 생성:', path.relative(ROOT, OUT));
console.log(`   시도지사 ${nGov}/16 · 교육감 ${nSup}/16 · 구청장·시장·군수 ${nMayor}/227`);
console.log(`   사진 매칭 ${nPhoto}/${nTotal}명`);
if (fails.length) {
  console.log(`\n⚠️ 매칭 실패 ${fails.length}건:`);
  fails.forEach((f) => console.log('   - ' + f));
} else {
  console.log('   🎉 매칭 실패 0건');
}
