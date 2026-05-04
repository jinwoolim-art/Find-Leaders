/**
 * 일꾼을찾다 관리자 대시보드 - Google Apps Script 백엔드
 *
 * 액션:
 *   send        - Gmail 실제 발송 + 발송내역 시트 기록
 *   sendBrochure- 랜딩 "서비스 소개서 받기" 폼 → 시트 기록 + PDF 링크 메일 자동 발송
 *   log         - 시트에만 기록 (발송 없이)
 *   getInbox    - Gmail 수신함 조회 + 자동 분류
 *   getMessage  - 특정 메시지 전체 본문 + 첨부파일 이름 조회
 *   registerApp - 수신 메일을 신청관리(2단계) 시트에 등록
 *   registerCS  - 수신 메일을 CS 시트에 등록
 *   markRead    - Gmail 메시지 읽음 처리
 *   updateRow   - 기존 시트 행 업데이트 (키 컬럼으로 찾아서 여러 컬럼 덮어쓰기)
 *
 * 배포:
 *   "배포 → 배포 관리 → 수정(연필)" 으로 업데이트하면 URL 유지됨
 */

var SHEET_ID = '1b12nC5b4gKnuCPs-n5X3x5h2MXiFqQvPZcyMJM4BFoQ';
var SENT_SHEET    = '발송내역';
var APP_SHEET     = '신청관리';
var CS_SHEET      = 'CS';
var INQUIRY_SHEET = '문의관리';
var ACCT_SHEET    = '계정';
var BROCHURE_SHEET= '소개서신청';
var REGISTRATION_SHEET = '가입신청';
var REGISTRATION_DOCS_FOLDER_NAME = '가입신청_증빙자료';
var REGISTRATION_FORM_BASE_URL = 'https://www.illkkun.cloud/registration-form.html';
var REGISTRATION_GUIDE_URL = 'https://www.illkkun.cloud/registration-guide.html';
var TERMS_URL   = 'https://www.illkkun.cloud/terms.html';
var PRIVACY_URL = 'https://www.illkkun.cloud/privacy.html';
var REFUND_URL  = 'https://www.illkkun.cloud/refund.html';
var ATTACHMENT_FOLDER_ID = '19MhKlk18IiTuIzY3CMLfVLF3DA79_MQU';

// 소개서 PDF — Drive 파일 ID로 직접 첨부 (파일 교체 시에도 ID는 유지됨)
var BROCHURE_FILE_ID = '1VqQCoArjlLSjx9l2QI4NUTAoxKQDC01A';
// 온라인 최신본 보기 URL — 인터랙티브 HTML (FAQ 아코디언·CTA 링크 등 풀 기능)
var BROCHURE_VIEW_URL = 'https://www.illkkun.cloud/brochure-product.html';
var GCHAT_WEBHOOK = 'https://chat.googleapis.com/v1/spaces/AAQALGDXWjs/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=4rjAJKb2-n4xyUmrf4lQ11-p7tA8SiyHJvQJ6VzTrog';

/**
 * Google Chat 웹훅으로 알림 전송. 실패해도 메인 로직은 계속 진행.
 */
function notifyChat(text) {
  if (!GCHAT_WEBHOOK) return;
  try {
    UrlFetchApp.fetch(GCHAT_WEBHOOK, {
      method: 'post',
      contentType: 'application/json; charset=UTF-8',
      payload: JSON.stringify({text: text}),
      muteHttpExceptions: true
    });
  } catch (e) { /* 알림 실패 무시 */ }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || 'send';

    if (action === 'send')           return sendMail(data);
    if (action === 'sendBrochure')   return sendBrochure(data);
    if (action === 'applyCandidate') return applyCandidate(data);
    if (action === 'sendRegistrationKit')   return sendRegistrationKit(data);
    if (action === 'getRegistrationPrefill')return getRegistrationPrefill(data);
    if (action === 'submitRegistration')    return submitRegistration(data);
    if (action === 'log')         return logOnly(data);
    if (action === 'getInbox')    return getInbox(data);
    if (action === 'getMessage')  return getMessage(data);
    if (action === 'registerApp') return registerApp(data);
    if (action === 'registerCS')  return registerCS(data);
    if (action === 'markRead')    return markRead(data);
    if (action === 'updateRow')   return updateRow(data);
    if (action === 'readSheet')      return readSheet(data);
    if (action === 'deleteRow')      return deleteRow(data);
    if (action === 'registerAccount')return registerAccount(data);
    if (action === 'listAttachments')return listAttachments(data);
    if (action === 'uploadFile')     return uploadFile(data);
    if (action === 'deleteFile')     return deleteFile(data);

    return json({ok: false, error: 'unknown action: ' + action});
  } catch (err) {
    return json({ok: false, error: String(err)});
  }
}

function doGet() {
  return json({ok: true, service: '일꾼을찾다 Admin API', version: '1.1'});
}

/* ═══════════════════════ 발송 ═══════════════════════ */

function sendMail(data) {
  var to = (data.to || '').trim();
  var subject = data.subject || '';
  var body = data.body || '';
  var vars = data.variables || {};
  if (!to || !subject) return json({ok: false, error: '수신자와 제목은 필수입니다'});
  subject = applyVars(subject, vars);
  body = applyVars(body, vars);

  var options = {name: '일꾼을찾다'};
  var ids = data.attachmentIds || [];
  if (ids.length) {
    var atts = [];
    for (var i = 0; i < ids.length; i++) {
      try { atts.push(DriveApp.getFileById(ids[i]).getBlob()); }
      catch(e) { /* 파일 없으면 skip */ }
    }
    if (atts.length) options.attachments = atts;
  }

  GmailApp.sendEmail(to, subject, body, options);
  appendLog({
    date: today(),
    recipient: data.recipient || vars['이름'] || '',
    email: to,
    step: data.step || '-',
    type: data.type || '수동 발송',
    subject: subject,
    status: '완료'
  });
  return json({ok: true, sent: to, subject: subject});
}

function logOnly(data) {
  appendLog({
    date: today(),
    recipient: data.recipient || '',
    email: data.to || '',
    step: data.step || '-',
    type: data.type || '수동 발송',
    subject: data.subject || '',
    status: data.status || '완료'
  });
  return json({ok: true, logged: true});
}

function appendLog(row) {
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SENT_SHEET);
  if (!sh) throw new Error('시트 없음: ' + SENT_SHEET);
  sh.appendRow([row.date, row.recipient, row.email, row.step, row.type, row.subject, row.status]);
}

/* ═══════════════════════ 수신함 ═══════════════════════ */

function getInbox(data) {
  var days = (data && data.days) || 30;
  var query = 'in:inbox newer_than:' + days + 'd -from:me' +
    ' -from:noreply -from:no-reply -from:notifications -from:mailer-daemon' +
    ' -from:drive-shares -from:alerts -from:newsletter';
  var threads = GmailApp.search(query, 0, 50);
  var result = [];
  for (var i = 0; i < threads.length; i++) {
    var msgs = threads[i].getMessages();
    var m = msgs[msgs.length - 1];
    var from = m.getFrom();
    var email = extractEmail(from);
    var name = extractName(from);
    var subject = m.getSubject() || '(제목 없음)';
    var attachments = m.getAttachments();
    result.push({
      id: m.getId(),
      threadId: threads[i].getId(),
      date: fmtDate(m.getDate()),
      from: from,
      fromName: name,
      fromEmail: email,
      subject: subject,
      attachmentCount: attachments.length,
      hasAttachment: attachments.length > 0,
      isUnread: m.isUnread(),
      category: classify(subject),
      snippet: (m.getPlainBody() || '').substring(0, 120).replace(/\s+/g, ' ')
    });
  }
  return json({ok: true, messages: result, count: result.length});
}

function getMessage(data) {
  if (!data.messageId) return json({ok: false, error: 'messageId 필수'});
  var m = GmailApp.getMessageById(data.messageId);
  var attachments = m.getAttachments({includeInlineImages: false});
  var names = [];
  for (var i = 0; i < attachments.length; i++) {
    names.push({name: attachments[i].getName(), size: attachments[i].getSize()});
  }
  return json({
    ok: true,
    id: m.getId(),
    date: fmtDate(m.getDate()),
    from: m.getFrom(),
    to: m.getTo(),
    subject: m.getSubject(),
    body: m.getPlainBody(),
    attachments: names,
    hasAttachment: attachments.length > 0,
    isUnread: m.isUnread()
  });
}

function classify(subject) {
  if (!subject) return '문의';
  if (/신청|이용|가입/.test(subject)) return '신청서';
  if (/확인증|증명서|인증/.test(subject)) return '증명서';
  return '문의';
}

function extractEmail(from) {
  var m = /<([^>]+)>/.exec(from);
  return m ? m[1] : from;
}

function extractName(from) {
  var m = /^([^<]+?)\s*</.exec(from);
  return m ? m[1].replace(/["']/g, '').trim() : from.split('@')[0];
}

/* ═══════════════════════ 시트 등록 ═══════════════════════ */

// 신청관리 컬럼: 접수일 / 후보자명 / 직급 / 이메일 / 증명서 / 상태 / 발급일
function registerApp(data) {
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(APP_SHEET);
  if (!sh) throw new Error('시트 없음: ' + APP_SHEET);
  sh.appendRow([
    today(),
    data.name || '',
    data.position || '',
    data.email || '',
    data.hasAttachment ? 'Y' : 'N',
    data.hasAttachment ? '신규' : '증명서요청',
    ''
  ]);
  if (data.messageId) {
    try { GmailApp.getMessageById(data.messageId).markRead(); } catch(e) {}
  }
  notifyChat('📋 *2단계 등록*\n'
    + '• 후보자: ' + (data.name || '') + '\n'
    + '• 직급: ' + (data.position || '') + '\n'
    + '• 이메일: ' + (data.email || '') + '\n'
    + '• 증명서: ' + (data.hasAttachment ? '✅ 있음' : '❌ 없음 (재요청 필요)'));
  return json({ok: true, registered: 'app', name: data.name});
}

// CS 컬럼: 접수일 / 후보자명 / 분류 / 제목 / 우선순위 / 담당자 / 상태 / 이메일 / 내용 / 답변
function registerCS(data) {
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(CS_SHEET);
  if (!sh) throw new Error('시트 없음: ' + CS_SHEET);
  sh.appendRow([
    today(),
    data.name || '',
    data.category || '기타',
    data.subject || '',
    data.priority || '보통',
    data.assignee || '',
    '접수',
    data.email || '',
    data.content || '',
    ''
  ]);
  if (data.messageId) {
    try { GmailApp.getMessageById(data.messageId).markRead(); } catch(e) {}
  }
  return json({ok: true, registered: 'cs', name: data.name});
}

function markRead(data) {
  if (!data.messageId) return json({ok: false, error: 'messageId 필수'});
  GmailApp.getMessageById(data.messageId).markRead();
  return json({ok: true, messageId: data.messageId});
}

// 계정 컬럼: 발급일 / 후보자명 / 직급 / 이메일 / ID / PW / 대시보드URL / 관리자발송 / 후보자발송 / 활성화 / 메모
function registerAccount(data) {
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ACCT_SHEET);
  if (!sh) throw new Error('시트 없음: ' + ACCT_SHEET);
  sh.appendRow([
    today(),                              // A 발급일
    data.name || '',                      // B 후보자명
    data.position || '',                  // C 직급
    data.email || '',                     // D 이메일
    data.id || '',                        // E ID
    data.pw || '',                        // F PW
    data.dashboardUrl || '',              // G 대시보드URL
    data.adminSent ? 'Y' : 'N',           // H 관리자발송
    data.userSent ? 'Y' : 'N',            // I 후보자발송
    data.activated ? 'Y' : 'N',           // J 활성화
    data.memo || ''                       // K 메모
  ]);
  notifyChat('🔑 *계정 발급 완료*\n'
    + '• 후보자: ' + (data.name || '') + ' (' + (data.position || '') + ')\n'
    + '• 이메일: ' + (data.email || '') + '\n'
    + '• ID: ' + (data.id || '') + '\n'
    + '• 관리자 발송: ' + (data.adminSent ? '✅' : '❌')
    + ' / 후보자 발송: ' + (data.userSent ? '✅' : '❌'));
  return json({ok: true, registered: 'account', name: data.name});
}

/* ═══════════════════════ 문의관리: Google Form 응답 자동 수집 ═══════════════════════ */

/**
 * onFormSubmit 트리거 — Google Form 제출 시 문의관리 시트에 자동 append.
 *
 * 설치 순서:
 *   1) Google Form 편집 → "응답" 탭 → 스프레드시트 연결 → 기존 스프레드시트 선택
 *      (이 스프레드시트 ID: 1b12nC5b4gKnuCPs-n5X3x5h2MXiFqQvPZcyMJM4BFoQ)
 *   2) Apps Script → 왼쪽 "트리거(시계 아이콘)" → "+ 트리거 추가"
 *      실행 함수: onFormSubmit
 *      이벤트 소스: 스프레드시트에서
 *      이벤트 유형: 양식 제출 시
 *
 * 문의관리 컬럼: A 접수일 / B 후보자명 / C 이메일 / D 후보등록범위 / E 지역구 /
 *                F 담당자연락처 / G 문의내용 / H 안내발송 / I 신청여부 / J 상태
 */
function onFormSubmit(e) {
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(INQUIRY_SHEET);
  if (!sh) throw new Error('시트 없음: ' + INQUIRY_SHEET);

  var nv = (e && e.namedValues) || {};
  var vals = (e && e.values) || [];

  // 라벨이 바뀌어도 작동하도록 여러 후보 라벨 시도 → 없으면 위치 기반(fallback)
  function byLabel(keys, posIdx) {
    for (var i = 0; i < keys.length; i++) {
      if (nv[keys[i]] && nv[keys[i]][0] != null) return String(nv[keys[i]][0]).trim();
    }
    return vals[posIdx] != null ? String(vals[posIdx]).trim() : '';
  }

  // Form 질문 순서: 후보자명, 이메일, 후보종류, 선거출마 주소, 담당자 연락처, 문의 내용
  var name    = byLabel(['후보자명'], 1);
  var email   = byLabel(['이메일'], 2);
  var scope   = byLabel(['후보종류', '후보등록범위'], 3);
  var region  = byLabel(['선거출마 주소', '지역구 또는 선거출마 주소', '지역구'], 4);
  var contact = byLabel(
    ['담당자 연락처', '담당자 연락처( 입력시 빠른 진행됩니다. )', '담당자 연락처(입력시 빠른 진행됩니다. )'],
    5
  );
  var message = byLabel(['문의 내용', '문의내용'], 6);

  sh.appendRow([
    today(),   // A 접수일
    name,      // B 후보자명
    email,     // C 이메일
    scope,     // D 후보등록범위
    region,    // E 지역구
    contact,   // F 담당자연락처
    message,   // G 문의내용
    '미발송',  // H 안내발송
    '미신청',  // I 신청여부
    '신규'     // J 상태
  ]);

  notifyChat('📥 *신규 문의 접수*\n'
    + '• 이름: ' + name + '\n'
    + '• 이메일: ' + email + '\n'
    + '• 후보종류: ' + scope + '\n'
    + '• 지역: ' + region + '\n'
    + '• 연락처: ' + contact);
}

/**
 * 기존 행 업데이트.
 * data: { sheet, keyCol, keyValue, updates: { 컬럼명: 값, ... } }
 * 예) {sheet:'신청관리', keyCol:'후보자명', keyValue:'홍길동', updates:{상태:'발급완료', 발급일:'4/22'}}
 */
function updateRow(data) {
  if (!data.sheet || !data.keyCol || data.keyValue == null || !data.updates) {
    return json({ok: false, error: 'sheet/keyCol/keyValue/updates 필수'});
  }
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(data.sheet);
  if (!sh) return json({ok: false, error: '시트 없음: ' + data.sheet});
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return json({ok: false, error: '데이터 없음'});
  var headers = values[0];
  var keyIdx = headers.indexOf(data.keyCol);
  if (keyIdx < 0) return json({ok: false, error: '키 컬럼 없음: ' + data.keyCol});
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][keyIdx]) === String(data.keyValue)) {
      var changed = [];
      var missing = [];
      for (var col in data.updates) {
        var colIdx = headers.indexOf(col);
        if (colIdx >= 0) {
          sh.getRange(i + 1, colIdx + 1).setValue(data.updates[col]);
          changed.push(col);
        } else {
          missing.push(col);
        }
      }
      if (missing.length && !changed.length) {
        return json({ok: false, error: '컬럼 없음: ' + missing.join(',') + ' (시트 헤더 확인 필요)'});
      }
      return json({ok: true, row: i + 1, changed: changed, missing: missing});
    }
  }
  return json({ok: false, error: '행 찾을 수 없음: ' + data.keyValue});
}

/**
 * 행 삭제 — 키 컬럼으로 찾아서 첫 번째 일치하는 행 제거.
 * data: { sheet, keyCol, keyValue }
 */
function deleteRow(data) {
  if (!data.sheet || !data.keyCol || data.keyValue == null) {
    return json({ok: false, error: 'sheet/keyCol/keyValue 필수'});
  }
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(data.sheet);
  if (!sh) return json({ok: false, error: '시트 없음: ' + data.sheet});
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return json({ok: false, error: '데이터 없음'});
  var headers = values[0];
  var keyIdx = headers.indexOf(data.keyCol);
  if (keyIdx < 0) return json({ok: false, error: '키 컬럼 없음: ' + data.keyCol});
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][keyIdx]) === String(data.keyValue)) {
      sh.deleteRow(i + 1);
      return json({ok: true, deletedRow: i + 1});
    }
  }
  return json({ok: false, error: '행 찾을 수 없음: ' + data.keyValue});
}

/**
 * 시트 읽기 — API 키/공개 공유 없이 Apps Script로 시트 데이터 조회.
 * data: { tab: '문의관리' }
 * 반환: { ok: true, rows: [ {headerKey: value, ...}, ... ] }
 */
function readSheet(data) {
  if (!data.tab) return json({ok: false, error: 'tab 필수'});
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(data.tab);
  if (!sh) return json({ok: false, error: '시트 없음: ' + data.tab});
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return json({ok: true, rows: []});
  var headers = values[0];
  var rows = values.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      var v = row[i];
      if (v instanceof Date) v = fmtDate(v);
      obj[h] = v == null ? '' : String(v);
    });
    return obj;
  });
  return json({ok: true, rows: rows});
}

/**
 * 진단/복구용 — Google Form 응답 시트에서 누락된 행을 문의관리로 백필.
 * 사용: Apps Script 편집기에서 함수 선택 → ▶ 실행
 * 동작: Form의 응답 시트("설문지 응답 1" 또는 "Form Responses 1")에서 모든 응답을 읽어
 *       문의관리에 이미 있는 이메일은 스킵하고 신규만 append.
 */
function backfillFormResponses() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheets = ss.getSheets();
  var formSh = null;
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (/설문지 응답|Form Responses|폼 응답/i.test(name)) { formSh = sheets[i]; break; }
  }
  if (!formSh) {
    Logger.log('❌ Form 응답 시트를 못 찾음. 시트 이름들: ' + sheets.map(function(s){return s.getName()}).join(', '));
    return;
  }
  Logger.log('✅ Form 응답 시트: ' + formSh.getName());

  var formData = formSh.getDataRange().getValues();
  if (formData.length < 2) { Logger.log('응답 데이터 없음'); return; }
  var formHeaders = formData[0];
  Logger.log('Form 헤더: ' + formHeaders.join(' | '));

  var inquirySh = ss.getSheetByName(INQUIRY_SHEET);
  var existing = {};
  var inqData = inquirySh.getDataRange().getValues();
  for (var i = 1; i < inqData.length; i++) {
    if (inqData[i][2]) existing[String(inqData[i][2]).toLowerCase().trim()] = true; // C열 이메일
  }

  function findCol(keys) {
    for (var k = 0; k < keys.length; k++) {
      var idx = formHeaders.indexOf(keys[k]);
      if (idx >= 0) return idx;
    }
    return -1;
  }
  var iName    = findCol(['후보자명']);
  var iEmail   = findCol(['이메일']);
  var iScope   = findCol(['후보종류', '후보등록범위']);
  var iRegion  = findCol(['선거출마 주소', '지역구 또는 선거출마 주소', '지역구']);
  var iContact = findCol(['담당자 연락처', '담당자 연락처( 입력시 빠른 진행됩니다. )', '담당자 연락처(입력시 빠른 진행됩니다. )']);
  var iMessage = findCol(['문의 내용', '문의내용']);

  var added = 0, skipped = 0;
  for (var r = 1; r < formData.length; r++) {
    var row = formData[r];
    var email = String(row[iEmail] || '').toLowerCase().trim();
    if (!email) continue;
    if (existing[email]) { skipped++; continue; }
    inquirySh.appendRow([
      today(),
      iName    >= 0 ? row[iName] : '',
      iEmail   >= 0 ? row[iEmail] : '',
      iScope   >= 0 ? row[iScope] : '',
      iRegion  >= 0 ? row[iRegion] : '',
      iContact >= 0 ? row[iContact] : '',
      iMessage >= 0 ? row[iMessage] : '',
      '미발송', '미신청', '신규'
    ]);
    existing[email] = true;
    added++;
  }
  Logger.log('✅ 백필 완료 — 신규 ' + added + '건, 중복 스킵 ' + skipped + '건');
  if (added > 0) {
    notifyChat('🔧 *문의관리 백필*\n• 신규 추가: ' + added + '건\n• 중복 스킵: ' + skipped + '건');
  }
}

/* ═══════════════════════ 자동화 트리거 ═══════════════════════ */

/**
 * 실시간 자동 등록 — Gmail 미처리 신청서를 신청관리 시트에 자동 append.
 * 설치: Apps Script → 트리거 → + 추가
 *   함수: autoRegisterInboxApps / 이벤트: 시간 기반 / 분 단위 타이머 / 10분 간격
 *
 * 동작:
 *   - 최근 7일 Gmail 받은편지함에서 "신청/이용/가입" 제목 메일 탐색
 *   - 신청관리 시트에 이미 있는 이메일은 스킵 (중복 방지)
 *   - 신규만 자동 등록 (직급 기본값: 기초의원 — 대시보드에서 수정 가능)
 *   - 처리 완료된 메일은 읽음 처리
 *   - 신규 등록 건 있으면 Google Chat 알림
 */
function autoRegisterInboxApps() {
  var appSh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(APP_SHEET);
  if (!appSh) return;
  var data = appSh.getDataRange().getValues();
  var existing = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i][3]) existing[String(data[i][3]).toLowerCase()] = true; // D열 이메일
  }

  var query = 'in:inbox newer_than:7d is:unread -from:me (subject:신청 OR subject:이용 OR subject:가입)';
  var threads = GmailApp.search(query, 0, 30);
  var registered = [];
  var skipped = 0;

  for (var t = 0; t < threads.length; t++) {
    var msgs = threads[t].getMessages();
    var m = msgs[msgs.length - 1];
    var subj = m.getSubject() || '';
    if (!/신청|이용|가입/.test(subj)) continue;
    if (/확인증|증명서/.test(subj)) continue; // 증명서는 별도 처리

    var from = m.getFrom();
    var email = extractEmail(from);
    var name = extractName(from);
    var emailKey = (email || '').toLowerCase();
    if (!emailKey) continue;
    if (existing[emailKey]) { skipped++; continue; }

    var hasAtt = m.getAttachments().length > 0;
    appSh.appendRow([
      today(),                                // A 접수일
      name,                                   // B 후보자명
      '기초의원',                              // C 직급 (기본값)
      email,                                  // D 이메일
      hasAtt ? 'Y' : 'N',                     // E 증명서
      hasAtt ? '신규' : '증명서요청',          // F 상태
      ''                                       // G 발급일
    ]);
    m.markRead();
    existing[emailKey] = true;
    registered.push(name + ' <' + email + '>');
  }

  if (registered.length > 0) {
    notifyChat('🤖 *자동 등록 완료*\n'
      + '• 신규: ' + registered.length + '건\n'
      + '• 중복 스킵: ' + skipped + '건\n\n'
      + registered.slice(0, 10).map(function(s){return '  · '+s}).join('\n')
      + (registered.length > 10 ? '\n  · ...외 ' + (registered.length - 10) + '건' : ''));
  }
}

/**
 * 자동 리마인더 — 3일 이상 안내발송 미처리 문의에 리마인더 발송.
 * 설치: 시간 기반 트리거 / 일 단위 타이머 / 매일 오전 10시
 */
function autoSendReminders() {
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(INQUIRY_SHEET);
  if (!sh) return;
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return;
  var headers = values[0];
  var iDate = headers.indexOf('접수일');
  var iName = headers.indexOf('후보자명');
  var iEmail = headers.indexOf('이메일');
  var iSend = headers.indexOf('안내발송');
  var iStatus = headers.indexOf('상태');
  if (iDate<0||iName<0||iEmail<0||iSend<0) return;

  var now = new Date();
  var sent = 0;
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var sendVal = String(row[iSend]||'').toUpperCase();
    var statusVal = String(row[iStatus]||'');
    if (sendVal === 'Y' || statusVal === '만료') continue;

    // 접수일이 3일 이상 지났고 아직 발송 안 된 경우
    var dateStr = row[iDate];
    if (!dateStr) continue;
    // "4/23" 형식이므로 오늘 기준 근사 판단 — 실제로는 M열에 "리마인더발송" 같은 타임스탬프 컬럼이 필요
    // 단순화: 안내발송 === '미발송' 인 것 중 아직 발송 안 한 것 대상
    if (sendVal !== '미발송') continue;

    try {
      GmailApp.sendEmail(
        row[iEmail],
        '[일꾼을찾다] 신청서 제출 안내 (리마인더)',
        (row[iName] || '') + '님 안녕하세요.\n\n지난 문의에 대한 안내서가 아직 발송되지 않았습니다.\n관리자가 곧 처리해드리겠습니다.\n\n감사합니다.\n일꾼을찾다 팀',
        {name: '일꾼을찾다'}
      );
      sh.getRange(i+1, iSend+1).setValue('리마인더');
      sent++;
    } catch(e) {}
  }
  if (sent > 0) notifyChat('⏰ *자동 리마인더 발송*\n• ' + sent + '건 발송 완료');
}

/* ═══════════════════════ 첨부파일 (Drive 폴더 관리) ═══════════════════════ */

/**
 * Drive 폴더 내 파일 리스트 조회.
 * 반환: { ok: true, files: [{id, name, size, mime, date, url}] }
 */
function listAttachments(data) {
  var folder = DriveApp.getFolderById(ATTACHMENT_FOLDER_ID);
  var it = folder.getFiles();
  var files = [];
  while (it.hasNext()) {
    var f = it.next();
    var size = f.getSize();
    var sizeStr = size > 1024 * 1024
      ? (size / 1024 / 1024).toFixed(1) + 'MB'
      : (size / 1024).toFixed(0) + 'KB';
    files.push({
      id: f.getId(),
      name: f.getName(),
      size: sizeStr,
      mime: f.getMimeType(),
      date: fmtDate(f.getDateCreated()),
      url: f.getUrl()
    });
  }
  // 이름순 정렬
  files.sort(function(a, b) { return a.name.localeCompare(b.name); });
  return json({ok: true, files: files});
}

/**
 * 대시보드에서 Base64로 업로드한 파일을 Drive에 저장.
 * data: { name, mime, content(base64) }
 */
function uploadFile(data) {
  if (!data.name || !data.content) return json({ok: false, error: 'name/content 필수'});
  var folder = DriveApp.getFolderById(ATTACHMENT_FOLDER_ID);
  var decoded = Utilities.base64Decode(data.content);
  var blob = Utilities.newBlob(decoded, data.mime || 'application/octet-stream', data.name);
  var file = folder.createFile(blob);
  return json({ok: true, id: file.getId(), name: file.getName()});
}

/**
 * Drive 파일 삭제 (휴지통으로 이동).
 */
function deleteFile(data) {
  if (!data.id) return json({ok: false, error: 'id 필수'});
  DriveApp.getFileById(data.id).setTrashed(true);
  return json({ok: true, id: data.id});
}

/* ═══════════════════════ 후보자 등록 신청 (랜딩) ═══════════════════════ */

/**
 * 랜딩 페이지 "후보자 등록 신청" 폼 제출 시:
 *   - 문의관리 시트에 직접 기록 (Google Form 거치지 않음)
 *   - Google Chat 알림
 */
function applyCandidate(data) {
  var name    = (data.name    || '').trim();
  var email   = (data.email   || '').trim();
  var scope   = (data.scope   || '').trim();
  var region  = (data.region  || '').trim();
  var contact = (data.contact || '').trim();
  var message = (data.message || '').trim();

  if (!name || !email) return json({ok: false, error: '이름과 이메일은 필수'});

  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(INQUIRY_SHEET);
  if (!sh) return json({ok: false, error: '시트 없음: ' + INQUIRY_SHEET});

  sh.appendRow([
    today(), name, email, scope, region, contact, message,
    '미발송', '미신청', '신규'
  ]);

  notifyChat('📥 *신규 후보자 등록 신청*\n'
    + '• 이름: ' + name + '\n'
    + '• 이메일: ' + email + '\n'
    + '• 후보종류: ' + scope + '\n'
    + '• 지역: ' + region + '\n'
    + '• 연락처: ' + contact
    + (message ? '\n• 문의: ' + message : ''));

  return json({ok: true, name: name, email: email});
}

/* ═══════════════════════ 소개서 신청 (랜딩) ═══════════════════════ */

/**
 * 랜딩 페이지에서 "서비스 소개서 받기" 폼 제출 시:
 *   1) 소개서신청 시트에 이메일 기록 (시트 없으면 자동 생성)
 *   2) Drive에서 BROCHURE_FILE_NAME 파일 검색 → 메일 첨부로 발송
 *   3) Google Chat 알림
 *
 * 소개서신청 컬럼: A 접수일 / B 이메일 / C 발송상태 / D 메모
 */
function sendBrochure(data) {
  var email = (data.email || '').trim();
  if (!email) return json({ok: false, error: '이메일은 필수입니다'});
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ok: false, error: '이메일 형식이 올바르지 않습니다'});
  }

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(BROCHURE_SHEET);
  if (!sh) {
    sh = ss.insertSheet(BROCHURE_SHEET);
    sh.appendRow(['접수일', '이메일', '발송상태', '메모']);
    sh.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#f1f5f9');
  }

  var sendStatus = '발송완료';
  var memo = '';
  try {
    // Drive에서 PDF 파일을 ID로 직접 가져옴
    var file = DriveApp.getFileById(BROCHURE_FILE_ID);
    var blob = file.getBlob();
    var fileName = file.getName();

    var subject = '[일꾼을묻다] 서비스 소개서를 보내드립니다';
    var bodyHtml =
      '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1e293b;line-height:1.6;max-width:560px">' +
      '<h2 style="color:#7c3aed;margin:0 0 16px">안녕하세요, 일꾼을묻다입니다.</h2>' +
      '<p>요청해주신 <b>서비스 소개서</b>를 보내드립니다.<br/>' +
      '아래 두 가지 방법으로 확인하실 수 있습니다.</p>' +
      '<p style="background:#faf5ff;border-left:3px solid #7c3aed;padding:12px 16px;border-radius:6px;margin:16px 0">' +
      '&#x1F4CE; <b>첨부파일</b> &mdash; ' + fileName + '<br/>' +
      '<span style="font-size:12px;color:#64748b">오프라인에서도 자유롭게 열람·공유하실 수 있습니다.</span>' +
      '</p>' +
      '<p style="margin:18px 0">' +
        '<a href="' + BROCHURE_VIEW_URL + '" ' +
        'style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;' +
        'padding:12px 22px;border-radius:8px;font-weight:700">&#x1F517; 온라인 보기 (인터랙티브)</a>' +
        '<span style="display:block;font-size:12px;color:#64748b;margin-top:6px">' +
        '※ FAQ 펼쳐보기·링크 클릭 등 모든 기능을 바로 사용하실 수 있습니다.</span>' +
      '</p>' +
      '<p style="font-size:13px;color:#64748b;margin-top:18px">' +
      '· AI 후보자 챗봇 · 24시간 시민 응대 · 후보자 전용 대시보드<br/>' +
      '· 도입 문의: <a href="mailto:ilkkun.official@gmail.com">ilkkun.official@gmail.com</a>' +
      '</p>' +
      '<p style="font-size:11.5px;color:#475569;margin-top:14px;background:#faf5ff;border-left:3px solid #7c3aed;padding:10px 14px;border-radius:6px">' +
      '<b style="color:#7c3aed">결제 전 확인사항</b> &mdash; 본 소개서에 <b>이용약관</b> 및 <b>개인정보 처리방침</b> 요약이 포함되어 있습니다. ' +
      '결제 진행 시 본 약관에 동의하신 것으로 간주됩니다. 전문은 ' +
      '<a href="https://www.illkkun.cloud/terms.html" style="color:#7c3aed;font-weight:700">이용약관</a> · ' +
      '<a href="https://www.illkkun.cloud/privacy.html" style="color:#7c3aed;font-weight:700">개인정보 처리방침</a>에서 확인 가능합니다.' +
      '</p>' +
      '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>' +
      '<p style="font-size:11px;color:#94a3b8">본 메일은 <b>일꾼을묻다 서비스 소개서</b> 신청에 따른 자동 발송 메일입니다.<br/>' +
      '문의가 필요하시면 본 메일에 회신해주세요.</p>' +
      '</div>';

    GmailApp.sendEmail(email,
      subject,
      '요청하신 서비스 소개서를 보내드립니다.\n\n· PDF 첨부파일 (' + fileName + ')\n· 온라인 최신본 보기: ' + BROCHURE_VIEW_URL,
      { name: '일꾼을묻다', htmlBody: bodyHtml, attachments: [blob] }
    );
  } catch (e) {
    sendStatus = '발송실패';
    memo = String(e);
  }

  sh.appendRow([today(), email, sendStatus, memo]);

  notifyChat('📩 *랜딩 소개서 발송*\n'
    + '• 이메일: ' + email + '\n'
    + '• 발송: ' + (sendStatus === '발송완료' ? '✅ 완료' : '❌ 실패')
    + (memo ? '\n• 사유: ' + memo : ''));

  return json({ok: sendStatus === '발송완료', sent: sendStatus === '발송완료', email: email});
}

/* ═══════════════════════ 가입 신청서 (3종 액션) ═══════════════════════ */

/**
 * 운영팀 admin-dashboard에서 호출. 후보자에게 신청서 작성 메일 발송.
 *
 * 1) 신청 ID 자동 생성 (req_xxx)
 * 2) 문의관리 시트 row를 찾아 ID 컬럼에 저장 (없으면 새 row 추가)
 * 3) 메일 발송 — 안내서/약관3종/신청서 링크 (PDF 첨부 X, 모두 링크)
 * 4) Google Chat 알림
 */
function sendRegistrationKit(data) {
  var name    = (data.name || '').trim();
  var email   = (data.email || '').trim();
  var contact = (data.contact || '').trim();
  var scope   = (data.scope || '').trim();
  var region  = (data.region || '').trim();

  if (!name || !email) return json({ok: false, error: '이름과 이메일은 필수'});

  // 1) ID 발급
  var id = data.id || ('req_' + Utilities.getUuid().split('-')[0]);
  var formUrl = REGISTRATION_FORM_BASE_URL + '?id=' + encodeURIComponent(id);

  // 2) 문의관리 시트에 ID 매핑 — row가 있으면 ID 컬럼만 업데이트, 없으면 새 row
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var inq = ss.getSheetByName(INQUIRY_SHEET);
  if (inq) {
    var found = false;
    var values = inq.getDataRange().getValues();
    var headers = values[0] || [];
    var idCol = headers.indexOf('신청ID');
    if (idCol === -1) {
      // 신청ID 컬럼 없으면 추가
      inq.getRange(1, headers.length + 1).setValue('신청ID');
      idCol = headers.length;
    }
    for (var r = 1; r < values.length; r++) {
      if ((values[r][2] || '').toString().trim() === email) {
        inq.getRange(r + 1, idCol + 1).setValue(id);
        found = true;
        break;
      }
    }
    if (!found) {
      // 새 row
      var newRow = [today(), name, email, scope, region, contact, '', '메일발송', '미신청', '신규'];
      while (newRow.length <= idCol) newRow.push('');
      newRow[idCol] = id;
      inq.appendRow(newRow);
    }
  }

  // 3) 메일 발송
  var subject = '[일꾼을묻다] 가입 신청 안내 — ' + name + '님';
  var bodyHtml =
    '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1e293b;line-height:1.65;max-width:560px">' +
    '<h2 style="color:#7c3aed;margin:0 0 14px;font-size:18px">안녕하세요, ' + name + '님</h2>' +
    '<p>일꾼을묻다 가입 절차를 안내드립니다.<br/>아래 두 단계를 차례로 진행해주세요.</p>' +

    // STEP 1 — 자료 검토 (큰 박스, 파란 톤, CTA 버튼)
    '<div style="margin:20px 0;padding:18px 20px;background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border-radius:10px;text-align:center">' +
      '<div style="font-size:11px;font-weight:900;color:#1d4ed8;letter-spacing:.06em;margin-bottom:8px">&#x1F4CC; STEP 1 &mdash; 자료 검토</div>' +
      '<p style="margin:0 0 14px;font-size:13px">가입 절차·결제·운영 흐름과 약관 3종을 먼저 확인해주세요.</p>' +
      '<a href="' + REGISTRATION_GUIDE_URL + '" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:900;font-size:14px">&#x1F4D8; 가입 안내서 보기 (5p) &rarr;</a>' +
      '<div style="margin-top:14px;padding-top:12px;border-top:1px dashed rgba(29,78,216,.25);font-size:11.5px;color:#1e3a8a;line-height:1.8">' +
        '제출 시 동의 필요한 약관 3종 &mdash;<br/>' +
        '<a href="' + TERMS_URL   + '" style="color:#1d4ed8;font-weight:700">이용약관</a> &middot; ' +
        '<a href="' + PRIVACY_URL + '" style="color:#1d4ed8;font-weight:700">개인정보 처리방침</a> &middot; ' +
        '<a href="' + REFUND_URL  + '" style="color:#1d4ed8;font-weight:700">환불 약정</a>' +
      '</div>' +
    '</div>' +

    // STEP 2 — 신청서 작성 (큰 박스, 보라 톤, 메인 CTA)
    '<div style="margin:20px 0;padding:18px 20px;background:linear-gradient(135deg,#faf5ff 0%,#fef3c7 100%);border-radius:10px;text-align:center">' +
      '<div style="font-size:11px;font-weight:900;color:#7c3aed;letter-spacing:.06em;margin-bottom:8px">&#x1F4CC; STEP 2 &mdash; 신청서 작성</div>' +
      '<p style="margin:0 0 14px;font-size:13px">기본 정보가 일부 자동 입력되어 있습니다. 추가 정보 + 본인 증빙 서류 + 약관 동의 후 제출해주세요.</p>' +
      '<a href="' + formUrl + '" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:900;font-size:14px">&#x1F4DD; 가입 신청서 작성하기 &rarr;</a>' +
      '<p style="margin:10px 0 0;font-size:10.5px;color:#64748b">신청 ID: ' + id + '</p>' +
    '</div>' +

    '<div style="margin:18px 0;padding:12px 14px;background:#fffbeb;border:1px dashed #b45309;border-radius:6px;font-size:12px;color:#b45309">' +
      '<b>&#x1F4CE; 준비물</b> &mdash; 후보자 등록증 사본, 본인 신분증 사본 (주민번호 뒷자리 마스킹 권장). 캠프 담당자 결제 시 위임장 + 담당자 신분증 추가.' +
    '</div>' +

    '<p style="font-size:11.5px;color:#64748b;margin-top:18px;line-height:1.7">' +
      '&middot; 신청서 제출 후 운영팀이 자격 검증<br/>' +
      '&middot; 검증 완료 시 결제 링크가 별도 메일로 발송됩니다<br/>' +
      '&middot; 결제 완료 후 후보자 대시보드 발급' +
    '</p>' +

    '<hr style="border:none;border-top:1px solid #e2e8f0;margin:22px 0"/>' +
    '<p style="font-size:11px;color:#94a3b8">문의: <a href="mailto:ilkkun.official@gmail.com">ilkkun.official@gmail.com</a> &middot; <a href="https://www.illkkun.cloud" style="color:#94a3b8">www.illkkun.cloud</a></p>' +
    '</div>';

  var bodyPlain = '안녕하세요, ' + name + '님\n\n'
    + '일꾼을묻다 가입 절차 안내드립니다.\n\n'
    + '📘 가입 안내서: ' + REGISTRATION_GUIDE_URL + '\n'
    + '📑 약관 3종:\n  · 이용약관: ' + TERMS_URL + '\n  · 개인정보 처리방침: ' + PRIVACY_URL + '\n  · 환불 약정: ' + REFUND_URL + '\n\n'
    + '📝 가입 신청서: ' + formUrl + '\n'
    + '   (신청 ID: ' + id + ')\n\n'
    + '준비물: 후보자 등록증 사본, 본인 신분증 사본\n\n'
    + '문의: ilkkun.official@gmail.com';

  GmailApp.sendEmail(email, subject, bodyPlain, { name: '일꾼을묻다', htmlBody: bodyHtml });

  appendLog({
    date: today(), recipient: name, email: email,
    step: '가입신청서', type: '발송', subject: subject, status: '완료'
  });

  notifyChat('📨 *가입 신청서 발송*\n• 후보자: ' + name + ' (' + email + ')\n• 신청 ID: ' + id + '\n• URL: ' + formUrl);

  return json({ok: true, id: id, formUrl: formUrl});
}

/**
 * registration-form.html 페이지 로드 시 호출. ID로 prefill 데이터 조회.
 */
function getRegistrationPrefill(data) {
  var id = (data.id || '').trim();
  if (!id) return json({ok: false, error: 'id required'});

  var inq = SpreadsheetApp.openById(SHEET_ID).getSheetByName(INQUIRY_SHEET);
  if (!inq) return json({ok: false, error: '문의관리 시트 없음'});

  var values = inq.getDataRange().getValues();
  var headers = values[0] || [];
  var idCol = headers.indexOf('신청ID');
  if (idCol === -1) return json({ok: false, error: '신청ID 컬럼 없음 (먼저 sendRegistrationKit 실행 필요)'});

  for (var r = 1; r < values.length; r++) {
    if ((values[r][idCol] || '').toString().trim() === id) {
      return json({
        ok: true,
        data: {
          name:   values[r][1] || '',
          email:  values[r][2] || '',
          scope:  values[r][3] || '',
          region: values[r][4] || '',
          contact:values[r][5] || ''
        }
      });
    }
  }
  return json({ok: false, error: 'not found'});
}

/**
 * 후보자가 신청서 제출 시 호출.
 * 1) 파일들을 Drive 업로드 (가입신청_증빙자료/{id}/ 폴더)
 * 2) 가입신청 시트에 row 추가
 * 3) 문의관리 시트의 신청상태 갱신
 * 4) Google Chat 알림
 */
function submitRegistration(data) {
  var id     = (data.id || '').trim() || ('req_' + Utilities.getUuid().split('-')[0]);
  var name   = (data.name || '').trim();
  var email  = (data.email || '').trim();
  var contact= (data.contact || '').trim();
  var position=(data.position || '').trim();
  var region = (data.region || '').trim();

  if (!name || !email || !position || !region)
    return json({ok: false, error: '필수 정보 누락'});
  if (!data.agreedTerms || !data.agreedPrivacy || !data.agreedRefund)
    return json({ok: false, error: '약관 3종 모두 동의 필요'});

  // 1) Drive 업로드
  var folder = getOrCreateRegistrationFolder_(id, name);
  var fileLinks = [];
  var files = data.files || [];
  for (var i = 0; i < files.length; i++) {
    try {
      var f = files[i];
      var blob = Utilities.newBlob(Utilities.base64Decode(f.base64), f.type, f.name);
      var saved = folder.createFile(blob);
      fileLinks.push(saved.getName() + ' → ' + saved.getUrl());
    } catch (e) {
      fileLinks.push('업로드실패: ' + (files[i].name || '?') + ' (' + String(e) + ')');
    }
  }
  var folderUrl = folder.getUrl();

  // 2) 가입신청 시트에 row
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(REGISTRATION_SHEET);
  if (!sh) {
    sh = ss.insertSheet(REGISTRATION_SHEET);
    sh.appendRow(['신청ID','신청일시','이름','이메일','연락처','직급','지역구','정당','등록번호','담당자명','담당자연락처','증빙폴더URL','파일목록','약관동의시각','상태','메모']);
    sh.getRange(1, 1, 1, 16).setFontWeight('bold').setBackground('#f1f5f9');
    sh.setFrozenRows(1);
  }
  sh.appendRow([
    id,
    new Date(),
    name, email, contact,
    position, region,
    data.party || '',
    data.regnum || '',
    data.agentName || '',
    data.agentContact || '',
    folderUrl,
    fileLinks.join('\n'),
    data.agreedAt || new Date().toISOString(),
    '신규접수',
    ''
  ]);

  // 3) 문의관리 시트 상태 갱신
  try {
    var inq = ss.getSheetByName(INQUIRY_SHEET);
    if (inq) {
      var values = inq.getDataRange().getValues();
      var headers = values[0] || [];
      var idCol = headers.indexOf('신청ID');
      var stateCol = 8; // I열 = 신청상태
      if (idCol >= 0) {
        for (var r = 1; r < values.length; r++) {
          if ((values[r][idCol] || '').toString().trim() === id) {
            inq.getRange(r + 1, stateCol + 1).setValue('신청완료');
            break;
          }
        }
      }
    }
  } catch (e) { /* skip */ }

  // 4) Chat 알림
  notifyChat('🎯 *가입 신청 접수*\n'
    + '• 후보자: ' + name + ' (' + position + ')\n'
    + '• 이메일: ' + email + '\n'
    + '• 지역: ' + region + '\n'
    + '• 신청 ID: ' + id + '\n'
    + '• 증빙 자료 폴더: ' + folderUrl);

  return json({ok: true, requestId: id, folderUrl: folderUrl});
}

function getOrCreateRegistrationFolder_(id, name) {
  var root = null;
  var rootIter = DriveApp.getFoldersByName(REGISTRATION_DOCS_FOLDER_NAME);
  if (rootIter.hasNext()) { root = rootIter.next(); }
  else { root = DriveApp.createFolder(REGISTRATION_DOCS_FOLDER_NAME); }

  var subName = id + '_' + (name || '').replace(/[\\/:*?"<>|]/g, '_');
  var sub = null;
  var subIter = root.getFoldersByName(subName);
  if (subIter.hasNext()) { sub = subIter.next(); }
  else { sub = root.createFolder(subName); }
  return sub;
}

/* ═══════════════════════ 유틸 ═══════════════════════ */

function applyVars(text, vars) {
  return String(text).replace(/\{\{([^}]+)\}\}/g, function(_, key){
    return vars[key.trim()] != null ? vars[key.trim()] : '';
  });
}

function today() {
  var d = new Date();
  return (d.getMonth() + 1) + '/' + d.getDate();
}

function fmtDate(d) {
  return (d.getMonth() + 1) + '/' + d.getDate();
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 진단용 — Drive 폴더 접근 테스트.
 * Apps Script 편집기에서 이 함수를 선택해 실행하면 실행 로그에 상세 정보 출력.
 */
function testDriveAccess() {
  try {
    Logger.log('폴더 ID: ' + ATTACHMENT_FOLDER_ID);
    var folder = DriveApp.getFolderById(ATTACHMENT_FOLDER_ID);
    Logger.log('✅ 폴더 접근 성공');
    Logger.log('폴더명: ' + folder.getName());
    Logger.log('URL: ' + folder.getUrl());
    var files = folder.getFiles();
    var count = 0;
    var names = [];
    while (files.hasNext() && count < 20) {
      var f = files.next();
      names.push(f.getName());
      count++;
    }
    Logger.log('파일 개수: ' + count);
    Logger.log('파일 목록: ' + names.join(', '));
    return 'OK: ' + count + '개 파일 발견';
  } catch (e) {
    Logger.log('❌ 에러: ' + e.toString());
    Logger.log('스택: ' + (e.stack || 'N/A'));
    return 'ERROR: ' + e.toString();
  }
}
