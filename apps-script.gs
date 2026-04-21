/**
 * 일꾼을찾다 관리자 대시보드 - Google Apps Script 백엔드
 *
 * 액션:
 *   send        - Gmail 실제 발송 + 발송내역 시트 기록
 *   log         - 시트에만 기록 (발송 없이)
 *   getInbox    - Gmail 수신함 조회 + 자동 분류
 *   getMessage  - 특정 메시지 전체 본문 + 첨부파일 이름 조회
 *   registerApp - 수신 메일을 신청관리(2단계) 시트에 등록
 *   registerCS  - 수신 메일을 CS 시트에 등록
 *   markRead    - Gmail 메시지 읽음 처리
 *
 * 배포:
 *   "배포 → 배포 관리 → 수정(연필)" 으로 업데이트하면 URL 유지됨
 */

var SHEET_ID = '1b12nC5b4gKnuCPs-n5X3x5h2MXiFqQvPZcyMJM4BFoQ';
var SENT_SHEET = '발송내역';
var APP_SHEET  = '신청관리';
var CS_SHEET   = 'CS';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || 'send';

    if (action === 'send')        return sendMail(data);
    if (action === 'log')         return logOnly(data);
    if (action === 'getInbox')    return getInbox(data);
    if (action === 'getMessage')  return getMessage(data);
    if (action === 'registerApp') return registerApp(data);
    if (action === 'registerCS')  return registerCS(data);
    if (action === 'markRead')    return markRead(data);

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
  GmailApp.sendEmail(to, subject, body, {name: '일꾼을찾다'});
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
