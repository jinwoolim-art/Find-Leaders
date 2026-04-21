/**
 * 일꾼을찾다 관리자 대시보드 - Google Apps Script 백엔드
 *
 * 기능:
 * 1) Gmail 실제 발송 (GmailApp.sendEmail)
 * 2) 발송내역 시트에 자동 기록 (appendRow)
 * 3) 계정발급/CS답변/단체발송 공용
 *
 * 배포:
 *   확장 프로그램 → Apps Script → 이 코드 전체 붙여넣기
 *   배포 → 새 배포 → 유형: 웹앱
 *   액세스: "모든 사용자"  /  실행: "나"
 *   → 웹앱 URL 복사해서 admin-dashboard.html의 WEB_APP_URL에 붙여넣기
 */

var SHEET_ID = '1LAIocXzfb1rLUrdBgqU9JNOpHUd90g9dKL5Xh4YiMeE';
var SENT_SHEET = '발송내역';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || 'send';

    if (action === 'send') return sendMail(data);
    if (action === 'log')  return logOnly(data);

    return json({ok: false, error: 'unknown action: ' + action});
  } catch (err) {
    return json({ok: false, error: String(err)});
  }
}

function doGet() {
  return json({ok: true, service: '일꾼을찾다 Admin API', version: '1.0'});
}

/**
 * 실제 메일 발송 + 시트 기록
 * payload: { to, subject, body, recipient, step, type, variables }
 */
function sendMail(data) {
  var to       = (data.to || '').trim();
  var subject  = data.subject || '';
  var body     = data.body || '';
  var vars     = data.variables || {};

  if (!to || !subject) return json({ok: false, error: '수신자와 제목은 필수입니다'});

  subject = applyVars(subject, vars);
  body    = applyVars(body,    vars);

  GmailApp.sendEmail(to, subject, body, {
    name: '일꾼을찾다',
    noReply: false
  });

  appendLog({
    date:      today(),
    recipient: data.recipient || vars['이름'] || '',
    email:     to,
    step:      data.step || '-',
    type:      data.type || '수동 발송',
    subject:   subject,
    status:    '완료'
  });

  return json({ok: true, sent: to, subject: subject});
}

/**
 * 시트에만 기록 (실제 발송 X, 외부 메일 시스템 사용 시)
 */
function logOnly(data) {
  appendLog({
    date:      today(),
    recipient: data.recipient || '',
    email:     data.to || '',
    step:      data.step || '-',
    type:      data.type || '수동 발송',
    subject:   data.subject || '',
    status:    data.status || '완료'
  });
  return json({ok: true, logged: true});
}

function appendLog(row) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(SENT_SHEET);
  if (!sh) throw new Error('시트 없음: ' + SENT_SHEET);
  sh.appendRow([row.date, row.recipient, row.email, row.step, row.type, row.subject, row.status]);
}

function applyVars(text, vars) {
  return String(text).replace(/\{\{([^}]+)\}\}/g, function(_, key){
    return vars[key.trim()] != null ? vars[key.trim()] : '';
  });
}

function today() {
  var d = new Date();
  return (d.getMonth() + 1) + '/' + d.getDate();
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
