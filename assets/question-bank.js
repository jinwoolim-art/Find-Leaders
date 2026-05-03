/**
 * 일꾼을묻다 — 후보자 사전 답변 질문은행 (Question Bank)
 *
 * 구조:
 *   common: 공통 질문 50개 (전 직급 동일)
 *   byScope.headOfLocal: 단체장용 80개 (도지사·시장·군수·구청장)
 *   byScope.councilor: 지방의원용 80개 (도의원·시의원·군의원·구의원)
 *   byScope.superintendent: 교육감용 80개
 *
 * audience 필드:
 *   "candidate" — 후보자가 답변 등록
 *   "operator"  — 운영사(플레이4)가 답변 (모든 후보자 공통 노출)
 *
 * priority 필드:
 *   1 — 필수 답변 권장 (시민이 자주 묻는 핵심)
 *   2 — 선택 답변 (시간 되면)
 *
 * 후보자별 노출 기준:
 *   - 단체장 후보자: common(audience=candidate) + headOfLocal = 40 + 80 = 120문항
 *   - 지방의원 후보자: common(audience=candidate) + councilor = 40 + 80 = 120문항
 *   - 교육감 후보자: common(audience=candidate) + superintendent = 40 + 80 = 120문항
 *
 * 운영사 공통 답변(audience=operator) 10문항은 모든 후보자에게 동일 노출.
 *
 * 사용 예:
 *   <script src="assets/question-bank.js"></script>
 *   const bank = window.QUESTION_BANK;
 *   const candidateQuestions = bank.common.filter(q => q.audience === 'candidate');
 */
window.QUESTION_BANK = {
  version: '1.0',
  lastUpdated: '2026-05-04',
  meta: {
    description: '후보자 AI 사전 답변 등록용 질문은행. 공통 50 + 직급별 80개씩.',
    totalCommon: 50,
    totalByScope: { headOfLocal: 80, councilor: 80, superintendent: 80 },
    grandTotal: 290,
    candidateFacingPerScope: 120
  },

  // ═══════════════════ 공통 질문 50개 ═══════════════════
  common: [
    // 후보자 신뢰 (10) — 모두 candidate
    { id: 'c-trust-01', category: 'trust', categoryLabel: '후보자 신뢰', audience: 'candidate', priority: 1, text: '후보자로 나온 이유가 뭔가요?', recommendedLength: '300~600자' },
    { id: 'c-trust-02', category: 'trust', categoryLabel: '후보자 신뢰', audience: 'candidate', priority: 1, text: '왜 본인을 선택해야 하나요?', recommendedLength: '300~600자' },
    { id: 'c-trust-03', category: 'trust', categoryLabel: '후보자 신뢰', audience: 'candidate', priority: 1, text: '기존 후보들과 뭐가 다른가요?', recommendedLength: '300~600자' },
    { id: 'c-trust-04', category: 'trust', categoryLabel: '후보자 신뢰', audience: 'candidate', priority: 1, text: '어떤 경험이 있나요?', recommendedLength: '300~600자' },
    { id: 'c-trust-05', category: 'trust', categoryLabel: '후보자 신뢰', audience: 'candidate', priority: 2, text: '정치 경험이 없는데 괜찮나요?', recommendedLength: '200~400자' },
    { id: 'c-trust-06', category: 'trust', categoryLabel: '후보자 신뢰', audience: 'candidate', priority: 1, text: '지금까지 성과가 있나요?', recommendedLength: '300~600자' },
    { id: 'c-trust-07', category: 'trust', categoryLabel: '후보자 신뢰', audience: 'candidate', priority: 2, text: '말만 하는 거 아닌가요?', recommendedLength: '200~400자' },
    { id: 'c-trust-08', category: 'trust', categoryLabel: '후보자 신뢰', audience: 'candidate', priority: 1, text: '공약 믿어도 되나요?', recommendedLength: '300~600자' },
    { id: 'c-trust-09', category: 'trust', categoryLabel: '후보자 신뢰', audience: 'candidate', priority: 2, text: '이전에 했던 약속은 다 지켰나요?', recommendedLength: '200~400자' },
    { id: 'c-trust-10', category: 'trust', categoryLabel: '후보자 신뢰', audience: 'candidate', priority: 1, text: '책임 어떻게 지실 건가요?', recommendedLength: '300~600자' },

    // 공약 실현성 (10) — 모두 candidate
    { id: 'c-feas-01', category: 'feasibility', categoryLabel: '공약 실현성', audience: 'candidate', priority: 1, text: '이 공약 정말 가능한가요?', recommendedLength: '300~600자' },
    { id: 'c-feas-02', category: 'feasibility', categoryLabel: '공약 실현성', audience: 'candidate', priority: 1, text: '예산은 어디서 나오나요?', recommendedLength: '300~600자' },
    { id: 'c-feas-03', category: 'feasibility', categoryLabel: '공약 실현성', audience: 'candidate', priority: 1, text: '언제까지 가능한가요?', recommendedLength: '300~600자' },
    { id: 'c-feas-04', category: 'feasibility', categoryLabel: '공약 실현성', audience: 'candidate', priority: 2, text: '안 되면 어떻게 하실 건가요?', recommendedLength: '200~400자' },
    { id: 'c-feas-05', category: 'feasibility', categoryLabel: '공약 실현성', audience: 'candidate', priority: 1, text: '우선순위는 어떻게 정하나요?', recommendedLength: '300~600자' },
    { id: 'c-feas-06', category: 'feasibility', categoryLabel: '공약 실현성', audience: 'candidate', priority: 1, text: '가장 먼저 할 건 뭔가요?', recommendedLength: '300~600자' },
    { id: 'c-feas-07', category: 'feasibility', categoryLabel: '공약 실현성', audience: 'candidate', priority: 2, text: '현실적으로 가능한 수준인가요?', recommendedLength: '200~400자' },
    { id: 'c-feas-08', category: 'feasibility', categoryLabel: '공약 실현성', audience: 'candidate', priority: 2, text: '이전에도 비슷한 공약 있었는데 왜 안됐나요?', recommendedLength: '200~400자' },
    { id: 'c-feas-09', category: 'feasibility', categoryLabel: '공약 실현성', audience: 'candidate', priority: 2, text: '공약이 너무 많은데 다 가능한가요?', recommendedLength: '200~400자' },
    { id: 'c-feas-10', category: 'feasibility', categoryLabel: '공약 실현성', audience: 'candidate', priority: 1, text: '실현 안 되면 책임지나요?', recommendedLength: '300~600자' },

    // 시민 소통 (10) — 모두 candidate
    { id: 'c-comm-01', category: 'communication', categoryLabel: '시민 소통', audience: 'candidate', priority: 1, text: '시민 의견은 어떻게 반영하나요?', recommendedLength: '300~600자' },
    { id: 'c-comm-02', category: 'communication', categoryLabel: '시민 소통', audience: 'candidate', priority: 1, text: '당선되면 계속 소통하나요?', recommendedLength: '200~400자' },
    { id: 'c-comm-03', category: 'communication', categoryLabel: '시민 소통', audience: 'candidate', priority: 1, text: '민원은 어떻게 처리하나요?', recommendedLength: '300~600자' },
    { id: 'c-comm-04', category: 'communication', categoryLabel: '시민 소통', audience: 'candidate', priority: 2, text: '직접 만날 수 있나요?', recommendedLength: '200~400자' },
    { id: 'c-comm-05', category: 'communication', categoryLabel: '시민 소통', audience: 'candidate', priority: 2, text: '온라인 소통도 하나요?', recommendedLength: '200~400자' },
    { id: 'c-comm-06', category: 'communication', categoryLabel: '시민 소통', audience: 'candidate', priority: 2, text: '답변 안 하는 경우는 없나요?', recommendedLength: '200~400자' },
    { id: 'c-comm-07', category: 'communication', categoryLabel: '시민 소통', audience: 'candidate', priority: 2, text: '의견을 어디에 남기면 되나요?', recommendedLength: '200~400자' },
    { id: 'c-comm-08', category: 'communication', categoryLabel: '시민 소통', audience: 'candidate', priority: 1, text: '반영된 사례 있나요?', recommendedLength: '300~600자' },
    { id: 'c-comm-09', category: 'communication', categoryLabel: '시민 소통', audience: 'candidate', priority: 2, text: '시민 참여 방식 있나요?', recommendedLength: '200~400자' },
    { id: 'c-comm-10', category: 'communication', categoryLabel: '시민 소통', audience: 'candidate', priority: 1, text: '비판 의견도 받나요?', recommendedLength: '300~600자' },

    // 민감 질문 대응 (10) — 모두 candidate, priority 1=5/2=5로 분배
    { id: 'c-sens-01', category: 'sensitive', categoryLabel: '민감 질문 대응', audience: 'candidate', priority: 1, text: '논란 있는 이슈에 입장은?', recommendedLength: '300~600자' },
    { id: 'c-sens-02', category: 'sensitive', categoryLabel: '민감 질문 대응', audience: 'candidate', priority: 2, text: '과거 발언 문제 없나요?', recommendedLength: '200~400자' },
    { id: 'c-sens-03', category: 'sensitive', categoryLabel: '민감 질문 대응', audience: 'candidate', priority: 1, text: '부정 이슈 대응 어떻게 하나요?', recommendedLength: '300~600자' },
    { id: 'c-sens-04', category: 'sensitive', categoryLabel: '민감 질문 대응', audience: 'candidate', priority: 2, text: '상대 후보보다 나은 점은?', recommendedLength: '200~400자' },
    { id: 'c-sens-05', category: 'sensitive', categoryLabel: '민감 질문 대응', audience: 'candidate', priority: 1, text: '실수했을 때 어떻게 하나요?', recommendedLength: '200~400자' },
    { id: 'c-sens-06', category: 'sensitive', categoryLabel: '민감 질문 대응', audience: 'candidate', priority: 1, text: '정책 실패하면 어떻게 하나요?', recommendedLength: '300~600자' },
    { id: 'c-sens-07', category: 'sensitive', categoryLabel: '민감 질문 대응', audience: 'candidate', priority: 2, text: '공약 바뀔 수 있나요?', recommendedLength: '200~400자' },
    { id: 'c-sens-08', category: 'sensitive', categoryLabel: '민감 질문 대응', audience: 'candidate', priority: 1, text: '정치적 입장 명확한가요?', recommendedLength: '300~600자' },
    { id: 'c-sens-09', category: 'sensitive', categoryLabel: '민감 질문 대응', audience: 'candidate', priority: 1, text: '갈등 상황 어떻게 해결하나요?', recommendedLength: '300~600자' },
    { id: 'c-sens-10', category: 'sensitive', categoryLabel: '민감 질문 대응', audience: 'candidate', priority: 2, text: '압박 받으면 입장 바뀌나요?', recommendedLength: '200~400자' },

    // 플랫폼 / AI 신뢰 (10) — 모두 operator (운영사 답변, 모든 후보자에 동일 노출)
    { id: 'c-plat-01', category: 'platform', categoryLabel: '플랫폼·AI 신뢰', audience: 'operator', priority: 1, text: '이거 AI가 답하는 건가요?', recommendedLength: '운영사 작성' },
    { id: 'c-plat-02', category: 'platform', categoryLabel: '플랫폼·AI 신뢰', audience: 'operator', priority: 1, text: '후보자가 직접 답하는 건가요?', recommendedLength: '운영사 작성' },
    { id: 'c-plat-03', category: 'platform', categoryLabel: '플랫폼·AI 신뢰', audience: 'operator', priority: 1, text: '잘못된 답변 나오면요?', recommendedLength: '운영사 작성' },
    { id: 'c-plat-04', category: 'platform', categoryLabel: '플랫폼·AI 신뢰', audience: 'operator', priority: 1, text: '데이터는 안전한가요?', recommendedLength: '운영사 작성' },
    { id: 'c-plat-05', category: 'platform', categoryLabel: '플랫폼·AI 신뢰', audience: 'operator', priority: 1, text: '질문은 다 전달되나요?', recommendedLength: '운영사 작성' },
    { id: 'c-plat-06', category: 'platform', categoryLabel: '플랫폼·AI 신뢰', audience: 'operator', priority: 1, text: '답변 수정 가능한가요?', recommendedLength: '운영사 작성' },
    { id: 'c-plat-07', category: 'platform', categoryLabel: '플랫폼·AI 신뢰', audience: 'operator', priority: 1, text: '이상한 질문은 어떻게 처리하나요?', recommendedLength: '운영사 작성' },
    { id: 'c-plat-08', category: 'platform', categoryLabel: '플랫폼·AI 신뢰', audience: 'operator', priority: 1, text: '조작되는 거 아닌가요?', recommendedLength: '운영사 작성' },
    { id: 'c-plat-09', category: 'platform', categoryLabel: '플랫폼·AI 신뢰', audience: 'operator', priority: 1, text: '누가 관리하나요?', recommendedLength: '운영사 작성' },
    { id: 'c-plat-10', category: 'platform', categoryLabel: '플랫폼·AI 신뢰', audience: 'operator', priority: 1, text: '개인정보는 어떻게 되나요?', recommendedLength: '운영사 작성' }
  ],

  // ═══════════════════ 직급별 질문 80개 × 3 ═══════════════════
  byScope: {
    // ───── 1. 단체장 (도지사·시장·군수·구청장) ─────
    headOfLocal: {
      label: '단체장',
      subLabels: ['도지사', '시장', '군수', '구청장'],
      categories: ['economy', 'welfare', 'education', 'housing', 'environment', 'culture', 'admin', 'agriculture'],
      questions: [
        // 경제·일자리 (10)
        { id: 'h-eco-01', category: 'economy', categoryLabel: '경제·일자리', priority: 1, text: '우리 지역 경제를 어떻게 살릴 건가요?', recommendedLength: '500~1000자' },
        { id: 'h-eco-02', category: 'economy', categoryLabel: '경제·일자리', priority: 1, text: '청년 일자리는 어떻게 늘릴 건가요?', recommendedLength: '500~1000자' },
        { id: 'h-eco-03', category: 'economy', categoryLabel: '경제·일자리', priority: 1, text: '중장년 일자리 대책은 있나요?', recommendedLength: '400~800자' },
        { id: 'h-eco-04', category: 'economy', categoryLabel: '경제·일자리', priority: 1, text: '소상공인 지원은 어떻게 하나요?', recommendedLength: '400~800자' },
        { id: 'h-eco-05', category: 'economy', categoryLabel: '경제·일자리', priority: 1, text: '전통시장과 골목상권을 어떻게 살릴 건가요?', recommendedLength: '400~800자' },
        { id: 'h-eco-06', category: 'economy', categoryLabel: '경제·일자리', priority: 2, text: '기업 유치 계획이 있나요?', recommendedLength: '400~800자' },
        { id: 'h-eco-07', category: 'economy', categoryLabel: '경제·일자리', priority: 2, text: '창업 지원 정책은 있나요?', recommendedLength: '400~800자' },
        { id: 'h-eco-08', category: 'economy', categoryLabel: '경제·일자리', priority: 1, text: '지역 산업을 어떻게 키울 건가요?', recommendedLength: '500~1000자' },
        { id: 'h-eco-09', category: 'economy', categoryLabel: '경제·일자리', priority: 2, text: '일자리 예산은 어떻게 확보하나요?', recommendedLength: '300~600자' },
        { id: 'h-eco-10', category: 'economy', categoryLabel: '경제·일자리', priority: 1, text: '지역 청년이 떠나지 않게 할 방법은 뭔가요?', recommendedLength: '500~1000자' },

        // 복지·보건 (10)
        { id: 'h-wel-01', category: 'welfare', categoryLabel: '복지·보건', priority: 1, text: '노인 돌봄 정책은 무엇인가요?', recommendedLength: '500~1000자' },
        { id: 'h-wel-02', category: 'welfare', categoryLabel: '복지·보건', priority: 1, text: '장애인 복지 확대 계획이 있나요?', recommendedLength: '400~800자' },
        { id: 'h-wel-03', category: 'welfare', categoryLabel: '복지·보건', priority: 1, text: '저소득층 지원은 어떻게 하나요?', recommendedLength: '400~800자' },
        { id: 'h-wel-04', category: 'welfare', categoryLabel: '복지·보건', priority: 1, text: '아동 돌봄 공백은 어떻게 줄이나요?', recommendedLength: '400~800자' },
        { id: 'h-wel-05', category: 'welfare', categoryLabel: '복지·보건', priority: 1, text: '공공의료는 어떻게 강화하나요?', recommendedLength: '500~1000자' },
        { id: 'h-wel-06', category: 'welfare', categoryLabel: '복지·보건', priority: 2, text: '정신건강 지원 정책이 있나요?', recommendedLength: '300~600자' },
        { id: 'h-wel-07', category: 'welfare', categoryLabel: '복지·보건', priority: 1, text: '출산·육아 지원은 어떻게 하나요?', recommendedLength: '500~1000자' },
        { id: 'h-wel-08', category: 'welfare', categoryLabel: '복지·보건', priority: 2, text: '1인가구 지원 정책이 있나요?', recommendedLength: '300~600자' },
        { id: 'h-wel-09', category: 'welfare', categoryLabel: '복지·보건', priority: 2, text: '병원 접근성이 낮은 지역은 어떻게 개선하나요?', recommendedLength: '300~600자' },
        { id: 'h-wel-10', category: 'welfare', categoryLabel: '복지·보건', priority: 1, text: '복지 사각지대는 어떻게 찾고 지원하나요?', recommendedLength: '400~800자' },

        // 교육·보육 (10)
        { id: 'h-edu-01', category: 'education', categoryLabel: '교육·보육', priority: 1, text: '영유아 보육 지원은 어떻게 하나요?', recommendedLength: '400~800자' },
        { id: 'h-edu-02', category: 'education', categoryLabel: '교육·보육', priority: 1, text: '어린이집 부족 문제는 어떻게 해결하나요?', recommendedLength: '400~800자' },
        { id: 'h-edu-03', category: 'education', categoryLabel: '교육·보육', priority: 1, text: '방과후 돌봄은 어떻게 확대하나요?', recommendedLength: '400~800자' },
        { id: 'h-edu-04', category: 'education', categoryLabel: '교육·보육', priority: 2, text: '청소년 진로 지원 정책이 있나요?', recommendedLength: '300~600자' },
        { id: 'h-edu-05', category: 'education', categoryLabel: '교육·보육', priority: 2, text: '평생교육 확대 계획이 있나요?', recommendedLength: '300~600자' },
        { id: 'h-edu-06', category: 'education', categoryLabel: '교육·보육', priority: 2, text: '지역 대학과 협력 계획이 있나요?', recommendedLength: '300~600자' },
        { id: 'h-edu-07', category: 'education', categoryLabel: '교육·보육', priority: 2, text: '청소년 공간을 늘릴 계획이 있나요?', recommendedLength: '300~600자' },
        { id: 'h-edu-08', category: 'education', categoryLabel: '교육·보육', priority: 1, text: '교육격차 해소 방안은 무엇인가요?', recommendedLength: '500~1000자' },
        { id: 'h-edu-09', category: 'education', categoryLabel: '교육·보육', priority: 1, text: '아이 키우기 좋은 지역을 어떻게 만들 건가요?', recommendedLength: '500~1000자' },
        { id: 'h-edu-10', category: 'education', categoryLabel: '교육·보육', priority: 1, text: '학부모 부담을 줄일 정책이 있나요?', recommendedLength: '400~800자' },

        // 주거·교통 (10)
        { id: 'h-hou-01', category: 'housing', categoryLabel: '주거·교통', priority: 1, text: '주거비 부담을 어떻게 줄일 건가요?', recommendedLength: '500~1000자' },
        { id: 'h-hou-02', category: 'housing', categoryLabel: '주거·교통', priority: 1, text: '공공주택 공급 계획이 있나요?', recommendedLength: '400~800자' },
        { id: 'h-hou-03', category: 'housing', categoryLabel: '주거·교통', priority: 2, text: '낡은 주거지역 개선 계획은 있나요?', recommendedLength: '300~600자' },
        { id: 'h-hou-04', category: 'housing', categoryLabel: '주거·교통', priority: 1, text: '재개발·재건축은 어떻게 추진하나요?', recommendedLength: '500~1000자' },
        { id: 'h-hou-05', category: 'housing', categoryLabel: '주거·교통', priority: 1, text: '교통 체증 해결 방안은 무엇인가요?', recommendedLength: '500~1000자' },
        { id: 'h-hou-06', category: 'housing', categoryLabel: '주거·교통', priority: 1, text: '대중교통 노선 개선 계획이 있나요?', recommendedLength: '400~800자' },
        { id: 'h-hou-07', category: 'housing', categoryLabel: '주거·교통', priority: 1, text: '주차 문제는 어떻게 해결하나요?', recommendedLength: '400~800자' },
        { id: 'h-hou-08', category: 'housing', categoryLabel: '주거·교통', priority: 2, text: '도로 인프라 개선 계획은 있나요?', recommendedLength: '300~600자' },
        { id: 'h-hou-09', category: 'housing', categoryLabel: '주거·교통', priority: 2, text: '교통약자 이동권은 어떻게 보장하나요?', recommendedLength: '300~600자' },
        { id: 'h-hou-10', category: 'housing', categoryLabel: '주거·교통', priority: 2, text: '우리 지역 교통비 부담을 줄일 수 있나요?', recommendedLength: '300~600자' },

        // 환경·안전 (10)
        { id: 'h-env-01', category: 'environment', categoryLabel: '환경·안전', priority: 1, text: '미세먼지 대책은 무엇인가요?', recommendedLength: '400~800자' },
        { id: 'h-env-02', category: 'environment', categoryLabel: '환경·안전', priority: 1, text: '탄소중립 정책은 어떻게 추진하나요?', recommendedLength: '500~1000자' },
        { id: 'h-env-03', category: 'environment', categoryLabel: '환경·안전', priority: 2, text: '공원과 녹지는 어떻게 늘릴 건가요?', recommendedLength: '300~600자' },
        { id: 'h-env-04', category: 'environment', categoryLabel: '환경·안전', priority: 2, text: '하천·수질 관리는 어떻게 하나요?', recommendedLength: '300~600자' },
        { id: 'h-env-05', category: 'environment', categoryLabel: '환경·안전', priority: 1, text: '재난 대응 체계는 어떻게 강화하나요?', recommendedLength: '400~800자' },
        { id: 'h-env-06', category: 'environment', categoryLabel: '환경·안전', priority: 1, text: '침수·폭우 대책은 있나요?', recommendedLength: '400~800자' },
        { id: 'h-env-07', category: 'environment', categoryLabel: '환경·안전', priority: 1, text: '범죄 예방 정책은 무엇인가요?', recommendedLength: '400~800자' },
        { id: 'h-env-08', category: 'environment', categoryLabel: '환경·안전', priority: 1, text: '어린이 안전 대책은 있나요?', recommendedLength: '400~800자' },
        { id: 'h-env-09', category: 'environment', categoryLabel: '환경·안전', priority: 2, text: '노후 시설 안전점검은 어떻게 하나요?', recommendedLength: '300~600자' },
        { id: 'h-env-10', category: 'environment', categoryLabel: '환경·안전', priority: 2, text: '야간 안전 환경은 어떻게 개선하나요?', recommendedLength: '300~600자' },

        // 문화·체육·관광 (10)
        { id: 'h-cul-01', category: 'culture', categoryLabel: '문화·체육·관광', priority: 2, text: '문화시설 확충 계획이 있나요?', recommendedLength: '300~600자' },
        { id: 'h-cul-02', category: 'culture', categoryLabel: '문화·체육·관광', priority: 2, text: '체육시설을 늘릴 계획이 있나요?', recommendedLength: '300~600자' },
        { id: 'h-cul-03', category: 'culture', categoryLabel: '문화·체육·관광', priority: 2, text: '지역 축제는 어떻게 발전시키나요?', recommendedLength: '300~600자' },
        { id: 'h-cul-04', category: 'culture', categoryLabel: '문화·체육·관광', priority: 1, text: '관광 활성화 방안은 무엇인가요?', recommendedLength: '400~800자' },
        { id: 'h-cul-05', category: 'culture', categoryLabel: '문화·체육·관광', priority: 2, text: '도서관과 생활문화공간은 어떻게 늘리나요?', recommendedLength: '300~600자' },
        { id: 'h-cul-06', category: 'culture', categoryLabel: '문화·체육·관광', priority: 2, text: '청년 문화공간 조성 계획이 있나요?', recommendedLength: '300~600자' },
        { id: 'h-cul-07', category: 'culture', categoryLabel: '문화·체육·관광', priority: 2, text: '어르신 체육·문화 프로그램은 있나요?', recommendedLength: '300~600자' },
        { id: 'h-cul-08', category: 'culture', categoryLabel: '문화·체육·관광', priority: 2, text: '지역 예술인 지원 정책은 있나요?', recommendedLength: '300~600자' },
        { id: 'h-cul-09', category: 'culture', categoryLabel: '문화·체육·관광', priority: 2, text: '가족 단위 여가공간을 늘릴 계획이 있나요?', recommendedLength: '300~600자' },
        { id: 'h-cul-10', category: 'culture', categoryLabel: '문화·체육·관광', priority: 1, text: '지역 브랜드를 어떻게 만들 건가요?', recommendedLength: '400~800자' },

        // 행정·소통 (10)
        { id: 'h-adm-01', category: 'admin', categoryLabel: '행정·소통', priority: 1, text: '시민 의견은 어떻게 반영하나요?', recommendedLength: '400~800자' },
        { id: 'h-adm-02', category: 'admin', categoryLabel: '행정·소통', priority: 1, text: '예산을 투명하게 공개하나요?', recommendedLength: '300~600자' },
        { id: 'h-adm-03', category: 'admin', categoryLabel: '행정·소통', priority: 1, text: '행정 절차를 더 쉽게 만들 계획이 있나요?', recommendedLength: '400~800자' },
        { id: 'h-adm-04', category: 'admin', categoryLabel: '행정·소통', priority: 1, text: '민원 처리 속도를 어떻게 높이나요?', recommendedLength: '400~800자' },
        { id: 'h-adm-05', category: 'admin', categoryLabel: '행정·소통', priority: 2, text: '디지털 행정 서비스는 어떻게 개선하나요?', recommendedLength: '300~600자' },
        { id: 'h-adm-06', category: 'admin', categoryLabel: '행정·소통', priority: 1, text: '부패 방지 대책은 무엇인가요?', recommendedLength: '400~800자' },
        { id: 'h-adm-07', category: 'admin', categoryLabel: '행정·소통', priority: 2, text: '주민참여예산은 확대하나요?', recommendedLength: '300~600자' },
        { id: 'h-adm-08', category: 'admin', categoryLabel: '행정·소통', priority: 2, text: '공무원 조직 운영은 어떻게 개선하나요?', recommendedLength: '300~600자' },
        { id: 'h-adm-09', category: 'admin', categoryLabel: '행정·소통', priority: 2, text: '시민과 직접 만나는 창구가 있나요?', recommendedLength: '300~600자' },
        { id: 'h-adm-10', category: 'admin', categoryLabel: '행정·소통', priority: 1, text: '공약 이행 상황을 공개하나요?', recommendedLength: '300~600자' },

        // 농림·균형발전 (10)
        { id: 'h-agr-01', category: 'agriculture', categoryLabel: '농림·균형발전', priority: 1, text: '농업 지원 정책은 무엇인가요?', recommendedLength: '400~800자' },
        { id: 'h-agr-02', category: 'agriculture', categoryLabel: '농림·균형발전', priority: 1, text: '농촌 인구 감소는 어떻게 대응하나요?', recommendedLength: '400~800자' },
        { id: 'h-agr-03', category: 'agriculture', categoryLabel: '농림·균형발전', priority: 1, text: '청년 농업인 지원 계획이 있나요?', recommendedLength: '400~800자' },
        { id: 'h-agr-04', category: 'agriculture', categoryLabel: '농림·균형발전', priority: 2, text: '어업·축산 지원 정책은 있나요?', recommendedLength: '300~600자' },
        { id: 'h-agr-05', category: 'agriculture', categoryLabel: '농림·균형발전', priority: 1, text: '지역 간 격차를 어떻게 줄일 건가요?', recommendedLength: '500~1000자' },
        { id: 'h-agr-06', category: 'agriculture', categoryLabel: '농림·균형발전', priority: 2, text: '낙후 지역 개발 계획은 있나요?', recommendedLength: '300~600자' },
        { id: 'h-agr-07', category: 'agriculture', categoryLabel: '농림·균형발전', priority: 2, text: '생활 인프라 부족 지역은 어떻게 지원하나요?', recommendedLength: '300~600자' },
        { id: 'h-agr-08', category: 'agriculture', categoryLabel: '농림·균형발전', priority: 2, text: '귀농·귀촌 지원 정책이 있나요?', recommendedLength: '300~600자' },
        { id: 'h-agr-09', category: 'agriculture', categoryLabel: '농림·균형발전', priority: 2, text: '지역 특산물 판매 지원은 어떻게 하나요?', recommendedLength: '300~600자' },
        { id: 'h-agr-10', category: 'agriculture', categoryLabel: '농림·균형발전', priority: 1, text: '균형발전 예산은 어떻게 확보하나요?', recommendedLength: '300~600자' }
      ]
    },

    // ───── 2. 지방의원 (도의원·시의원·군의원·구의원) ─────
    councilor: {
      label: '지방의원',
      subLabels: ['도의원', '시의원', '군의원', '구의원'],
      categories: ['localCivic', 'transport', 'urban', 'welfareCare', 'eduSafety', 'localEconomy', 'cultureSpace', 'councilWork'],
      questions: [
        // 생활민원 (10)
        { id: 'l-civ-01', category: 'localCivic', categoryLabel: '생활민원', priority: 1, text: '우리 동네 주차 문제 해결할 수 있나요?', recommendedLength: '300~600자' },
        { id: 'l-civ-02', category: 'localCivic', categoryLabel: '생활민원', priority: 1, text: '골목길 정비는 어떻게 하나요?', recommendedLength: '300~600자' },
        { id: 'l-civ-03', category: 'localCivic', categoryLabel: '생활민원', priority: 1, text: '쓰레기 배출 문제를 개선할 수 있나요?', recommendedLength: '300~600자' },
        { id: 'l-civ-04', category: 'localCivic', categoryLabel: '생활민원', priority: 1, text: '불법 주정차 문제는 어떻게 해결하나요?', recommendedLength: '300~600자' },
        { id: 'l-civ-05', category: 'localCivic', categoryLabel: '생활민원', priority: 2, text: '가로등이 어두운 곳은 어떻게 개선하나요?', recommendedLength: '200~400자' },
        { id: 'l-civ-06', category: 'localCivic', categoryLabel: '생활민원', priority: 2, text: '보도블록 파손 문제는 어떻게 처리하나요?', recommendedLength: '200~400자' },
        { id: 'l-civ-07', category: 'localCivic', categoryLabel: '생활민원', priority: 2, text: '동네 소음 문제는 어떻게 해결하나요?', recommendedLength: '200~400자' },
        { id: 'l-civ-08', category: 'localCivic', categoryLabel: '생활민원', priority: 1, text: '생활 민원은 어디로 전달하면 되나요?', recommendedLength: '200~400자' },
        { id: 'l-civ-09', category: 'localCivic', categoryLabel: '생활민원', priority: 1, text: '민원이 접수되면 얼마나 빨리 처리되나요?', recommendedLength: '200~400자' },
        { id: 'l-civ-10', category: 'localCivic', categoryLabel: '생활민원', priority: 1, text: '작은 민원도 실제로 챙기나요?', recommendedLength: '300~600자' },

        // 교통·도로 (10)
        { id: 'l-trn-01', category: 'transport', categoryLabel: '교통·도로', priority: 1, text: '출퇴근길 교통 불편은 어떻게 개선하나요?', recommendedLength: '400~800자' },
        { id: 'l-trn-02', category: 'transport', categoryLabel: '교통·도로', priority: 1, text: '버스 노선 개선을 추진할 수 있나요?', recommendedLength: '300~600자' },
        { id: 'l-trn-03', category: 'transport', categoryLabel: '교통·도로', priority: 2, text: '마을버스 배차 간격을 줄일 수 있나요?', recommendedLength: '200~400자' },
        { id: 'l-trn-04', category: 'transport', categoryLabel: '교통·도로', priority: 1, text: '횡단보도 안전 문제는 어떻게 해결하나요?', recommendedLength: '300~600자' },
        { id: 'l-trn-05', category: 'transport', categoryLabel: '교통·도로', priority: 1, text: '어린이보호구역 안전 대책은 있나요?', recommendedLength: '300~600자' },
        { id: 'l-trn-06', category: 'transport', categoryLabel: '교통·도로', priority: 2, text: '자전거도로 개선 계획이 있나요?', recommendedLength: '200~400자' },
        { id: 'l-trn-07', category: 'transport', categoryLabel: '교통·도로', priority: 2, text: '보행자 중심 도로를 만들 수 있나요?', recommendedLength: '200~400자' },
        { id: 'l-trn-08', category: 'transport', categoryLabel: '교통·도로', priority: 2, text: '노인 보행 안전 대책은 있나요?', recommendedLength: '200~400자' },
        { id: 'l-trn-09', category: 'transport', categoryLabel: '교통·도로', priority: 2, text: '교통 신호 체계 개선을 추진하나요?', recommendedLength: '200~400자' },
        { id: 'l-trn-10', category: 'transport', categoryLabel: '교통·도로', priority: 2, text: '도로 포장과 파손 문제는 어떻게 챙기나요?', recommendedLength: '200~400자' },

        // 주거·도시환경 (10)
        { id: 'l-urb-01', category: 'urban', categoryLabel: '주거·도시환경', priority: 1, text: '노후 아파트 문제를 어떻게 지원하나요?', recommendedLength: '400~800자' },
        { id: 'l-urb-02', category: 'urban', categoryLabel: '주거·도시환경', priority: 1, text: '재개발·재건축 주민 의견을 어떻게 반영하나요?', recommendedLength: '400~800자' },
        { id: 'l-urb-03', category: 'urban', categoryLabel: '주거·도시환경', priority: 2, text: '임대주택 관련 민원은 어떻게 대응하나요?', recommendedLength: '300~600자' },
        { id: 'l-urb-04', category: 'urban', categoryLabel: '주거·도시환경', priority: 2, text: '빈집 문제는 어떻게 해결하나요?', recommendedLength: '300~600자' },
        { id: 'l-urb-05', category: 'urban', categoryLabel: '주거·도시환경', priority: 2, text: '골목 환경 개선 사업을 추진하나요?', recommendedLength: '300~600자' },
        { id: 'l-urb-06', category: 'urban', categoryLabel: '주거·도시환경', priority: 2, text: '도시재생 사업은 어떻게 챙기나요?', recommendedLength: '300~600자' },
        { id: 'l-urb-07', category: 'urban', categoryLabel: '주거·도시환경', priority: 2, text: '공공시설 부족 문제는 어떻게 해결하나요?', recommendedLength: '300~600자' },
        { id: 'l-urb-08', category: 'urban', categoryLabel: '주거·도시환경', priority: 2, text: '동네 쉼터나 벤치를 늘릴 수 있나요?', recommendedLength: '200~400자' },
        { id: 'l-urb-09', category: 'urban', categoryLabel: '주거·도시환경', priority: 2, text: '공사 소음과 먼지 문제는 어떻게 관리하나요?', recommendedLength: '200~400자' },
        { id: 'l-urb-10', category: 'urban', categoryLabel: '주거·도시환경', priority: 1, text: '주거 취약계층 지원은 어떻게 하나요?', recommendedLength: '400~800자' },

        // 복지·돌봄 (10)
        { id: 'l-wel-01', category: 'welfareCare', categoryLabel: '복지·돌봄', priority: 1, text: '독거노인 돌봄은 어떻게 강화하나요?', recommendedLength: '400~800자' },
        { id: 'l-wel-02', category: 'welfareCare', categoryLabel: '복지·돌봄', priority: 2, text: '경로당 지원은 어떻게 하나요?', recommendedLength: '200~400자' },
        { id: 'l-wel-03', category: 'welfareCare', categoryLabel: '복지·돌봄', priority: 1, text: '장애인 이동권 문제는 어떻게 챙기나요?', recommendedLength: '400~800자' },
        { id: 'l-wel-04', category: 'welfareCare', categoryLabel: '복지·돌봄', priority: 1, text: '아이 돌봄 공간을 늘릴 수 있나요?', recommendedLength: '300~600자' },
        { id: 'l-wel-05', category: 'welfareCare', categoryLabel: '복지·돌봄', priority: 2, text: '지역아동센터 지원 계획이 있나요?', recommendedLength: '300~600자' },
        { id: 'l-wel-06', category: 'welfareCare', categoryLabel: '복지·돌봄', priority: 1, text: '저소득층 지원은 어떻게 연결하나요?', recommendedLength: '300~600자' },
        { id: 'l-wel-07', category: 'welfareCare', categoryLabel: '복지·돌봄', priority: 1, text: '복지 사각지대는 어떻게 찾나요?', recommendedLength: '300~600자' },
        { id: 'l-wel-08', category: 'welfareCare', categoryLabel: '복지·돌봄', priority: 2, text: '청년 1인가구 지원이 있나요?', recommendedLength: '200~400자' },
        { id: 'l-wel-09', category: 'welfareCare', categoryLabel: '복지·돌봄', priority: 1, text: '위기가구를 어떻게 발견하고 지원하나요?', recommendedLength: '400~800자' },
        { id: 'l-wel-10', category: 'welfareCare', categoryLabel: '복지·돌봄', priority: 2, text: '주민센터 복지 기능을 개선할 수 있나요?', recommendedLength: '300~600자' },

        // 교육·안전 (10)
        { id: 'l-edu-01', category: 'eduSafety', categoryLabel: '교육·안전', priority: 1, text: '학교 주변 안전은 어떻게 챙기나요?', recommendedLength: '300~600자' },
        { id: 'l-edu-02', category: 'eduSafety', categoryLabel: '교육·안전', priority: 1, text: '통학로 안전 대책은 있나요?', recommendedLength: '300~600자' },
        { id: 'l-edu-03', category: 'eduSafety', categoryLabel: '교육·안전', priority: 1, text: '학교폭력 예방을 위해 무엇을 할 수 있나요?', recommendedLength: '400~800자' },
        { id: 'l-edu-04', category: 'eduSafety', categoryLabel: '교육·안전', priority: 2, text: '청소년 공간을 늘릴 수 있나요?', recommendedLength: '200~400자' },
        { id: 'l-edu-05', category: 'eduSafety', categoryLabel: '교육·안전', priority: 1, text: '방과후 돌봄 확대를 지원하나요?', recommendedLength: '300~600자' },
        { id: 'l-edu-06', category: 'eduSafety', categoryLabel: '교육·안전', priority: 2, text: '학부모 민원은 어떻게 반영하나요?', recommendedLength: '300~600자' },
        { id: 'l-edu-07', category: 'eduSafety', categoryLabel: '교육·안전', priority: 1, text: '어린이 놀이터 안전점검은 어떻게 하나요?', recommendedLength: '200~400자' },
        { id: 'l-edu-08', category: 'eduSafety', categoryLabel: '교육·안전', priority: 1, text: 'CCTV 설치 확대가 가능한가요?', recommendedLength: '200~400자' },
        { id: 'l-edu-09', category: 'eduSafety', categoryLabel: '교육·안전', priority: 1, text: '여성 안심귀갓길을 만들 수 있나요?', recommendedLength: '300~600자' },
        { id: 'l-edu-10', category: 'eduSafety', categoryLabel: '교육·안전', priority: 1, text: '범죄 취약지역은 어떻게 개선하나요?', recommendedLength: '400~800자' },

        // 지역경제·상권 (10)
        { id: 'l-eco-01', category: 'localEconomy', categoryLabel: '지역경제·상권', priority: 1, text: '동네 상권을 어떻게 살릴 건가요?', recommendedLength: '400~800자' },
        { id: 'l-eco-02', category: 'localEconomy', categoryLabel: '지역경제·상권', priority: 1, text: '전통시장 지원 방안은 있나요?', recommendedLength: '300~600자' },
        { id: 'l-eco-03', category: 'localEconomy', categoryLabel: '지역경제·상권', priority: 1, text: '소상공인 민원은 어떻게 반영하나요?', recommendedLength: '300~600자' },
        { id: 'l-eco-04', category: 'localEconomy', categoryLabel: '지역경제·상권', priority: 2, text: '지역화폐나 할인 지원을 추진하나요?', recommendedLength: '300~600자' },
        { id: 'l-eco-05', category: 'localEconomy', categoryLabel: '지역경제·상권', priority: 2, text: '청년 창업 공간을 만들 수 있나요?', recommendedLength: '300~600자' },
        { id: 'l-eco-06', category: 'localEconomy', categoryLabel: '지역경제·상권', priority: 2, text: '빈 점포 활용 방안은 있나요?', recommendedLength: '200~400자' },
        { id: 'l-eco-07', category: 'localEconomy', categoryLabel: '지역경제·상권', priority: 2, text: '골목상권 홍보 지원이 가능한가요?', recommendedLength: '200~400자' },
        { id: 'l-eco-08', category: 'localEconomy', categoryLabel: '지역경제·상권', priority: 2, text: '상인회와 어떻게 협력하나요?', recommendedLength: '200~400자' },
        { id: 'l-eco-09', category: 'localEconomy', categoryLabel: '지역경제·상권', priority: 2, text: '지역 일자리 연결 사업이 있나요?', recommendedLength: '300~600자' },
        { id: 'l-eco-10', category: 'localEconomy', categoryLabel: '지역경제·상권', priority: 1, text: '자영업자 부담을 줄일 방법이 있나요?', recommendedLength: '300~600자' },

        // 문화·체육·공원 (10)
        { id: 'l-cul-01', category: 'cultureSpace', categoryLabel: '문화·체육·공원', priority: 2, text: '동네 공원을 더 잘 관리할 수 있나요?', recommendedLength: '200~400자' },
        { id: 'l-cul-02', category: 'cultureSpace', categoryLabel: '문화·체육·공원', priority: 2, text: '체육시설을 늘릴 수 있나요?', recommendedLength: '200~400자' },
        { id: 'l-cul-03', category: 'cultureSpace', categoryLabel: '문화·체육·공원', priority: 2, text: '작은 도서관 지원 계획이 있나요?', recommendedLength: '200~400자' },
        { id: 'l-cul-04', category: 'cultureSpace', categoryLabel: '문화·체육·공원', priority: 2, text: '주민 문화행사를 지원하나요?', recommendedLength: '200~400자' },
        { id: 'l-cul-05', category: 'cultureSpace', categoryLabel: '문화·체육·공원', priority: 2, text: '청소년 문화공간을 만들 수 있나요?', recommendedLength: '200~400자' },
        { id: 'l-cul-06', category: 'cultureSpace', categoryLabel: '문화·체육·공원', priority: 2, text: '어르신 여가 프로그램을 늘릴 수 있나요?', recommendedLength: '200~400자' },
        { id: 'l-cul-07', category: 'cultureSpace', categoryLabel: '문화·체육·공원', priority: 2, text: '반려동물 공간 조성이 가능한가요?', recommendedLength: '200~400자' },
        { id: 'l-cul-08', category: 'cultureSpace', categoryLabel: '문화·체육·공원', priority: 2, text: '가족이 쉴 수 있는 공간을 늘릴 수 있나요?', recommendedLength: '200~400자' },
        { id: 'l-cul-09', category: 'cultureSpace', categoryLabel: '문화·체육·공원', priority: 2, text: '생활체육 예산을 확보할 수 있나요?', recommendedLength: '200~400자' },
        { id: 'l-cul-10', category: 'cultureSpace', categoryLabel: '문화·체육·공원', priority: 2, text: '지역 축제를 주민 중심으로 바꿀 수 있나요?', recommendedLength: '200~400자' },

        // 의정활동·소통 (10)
        { id: 'l-coun-01', category: 'councilWork', categoryLabel: '의정활동·소통', priority: 1, text: '당선되면 주민과 얼마나 자주 소통하나요?', recommendedLength: '300~600자' },
        { id: 'l-coun-02', category: 'councilWork', categoryLabel: '의정활동·소통', priority: 1, text: '민원 처리 결과를 알려주나요?', recommendedLength: '200~400자' },
        { id: 'l-coun-03', category: 'councilWork', categoryLabel: '의정활동·소통', priority: 1, text: '의정활동을 투명하게 공개하나요?', recommendedLength: '300~600자' },
        { id: 'l-coun-04', category: 'councilWork', categoryLabel: '의정활동·소통', priority: 1, text: '예산 심의에서 무엇을 가장 중요하게 보나요?', recommendedLength: '400~800자' },
        { id: 'l-coun-05', category: 'councilWork', categoryLabel: '의정활동·소통', priority: 1, text: '집행부를 어떻게 견제하나요?', recommendedLength: '400~800자' },
        { id: 'l-coun-06', category: 'councilWork', categoryLabel: '의정활동·소통', priority: 1, text: '주민 의견을 조례에 반영할 수 있나요?', recommendedLength: '400~800자' },
        { id: 'l-coun-07', category: 'councilWork', categoryLabel: '의정활동·소통', priority: 1, text: '우리 동네 예산을 어떻게 확보하나요?', recommendedLength: '400~800자' },
        { id: 'l-coun-08', category: 'councilWork', categoryLabel: '의정활동·소통', priority: 1, text: '공약 이행 상황을 공개하나요?', recommendedLength: '300~600자' },
        { id: 'l-coun-09', category: 'councilWork', categoryLabel: '의정활동·소통', priority: 2, text: '주민 간 갈등은 어떻게 조정하나요?', recommendedLength: '300~600자' },
        { id: 'l-coun-10', category: 'councilWork', categoryLabel: '의정활동·소통', priority: 1, text: '작은 동네 문제도 실제로 해결할 수 있나요?', recommendedLength: '300~600자' }
      ]
    },

    // ───── 3. 교육감 ─────
    superintendent: {
      label: '교육감',
      subLabels: ['교육감'],
      categories: ['eduGap', 'studentSafety', 'teacherSupport', 'careWelfare', 'careerEdu', 'schoolFacility', 'parentComm', 'eduAdmin'],
      questions: [
        // 학력·교육격차 (10)
        { id: 's-gap-01', category: 'eduGap', categoryLabel: '학력·교육격차', priority: 1, text: '기초학력 저하 문제를 어떻게 해결하나요?', recommendedLength: '500~1000자' },
        { id: 's-gap-02', category: 'eduGap', categoryLabel: '학력·교육격차', priority: 1, text: '지역별 교육격차를 줄일 방법은 무엇인가요?', recommendedLength: '500~1000자' },
        { id: 's-gap-03', category: 'eduGap', categoryLabel: '학력·교육격차', priority: 1, text: '사교육 의존을 줄일 수 있나요?', recommendedLength: '400~800자' },
        { id: 's-gap-04', category: 'eduGap', categoryLabel: '학력·교육격차', priority: 1, text: '공교육 경쟁력을 어떻게 높이나요?', recommendedLength: '500~1000자' },
        { id: 's-gap-05', category: 'eduGap', categoryLabel: '학력·교육격차', priority: 1, text: '학습 부진 학생 지원은 어떻게 하나요?', recommendedLength: '400~800자' },
        { id: 's-gap-06', category: 'eduGap', categoryLabel: '학력·교육격차', priority: 2, text: '농어촌 학교 교육격차는 어떻게 해결하나요?', recommendedLength: '300~600자' },
        { id: 's-gap-07', category: 'eduGap', categoryLabel: '학력·교육격차', priority: 1, text: '저소득층 학생 학습 지원은 있나요?', recommendedLength: '400~800자' },
        { id: 's-gap-08', category: 'eduGap', categoryLabel: '학력·교육격차', priority: 2, text: '방과후학교를 어떻게 개선하나요?', recommendedLength: '300~600자' },
        { id: 's-gap-09', category: 'eduGap', categoryLabel: '학력·교육격차', priority: 2, text: '온라인 학습 지원은 어떻게 하나요?', recommendedLength: '300~600자' },
        { id: 's-gap-10', category: 'eduGap', categoryLabel: '학력·교육격차', priority: 1, text: '학교별 교육 수준 차이를 줄일 수 있나요?', recommendedLength: '400~800자' },

        // 학생 안전·학교폭력 (10)
        { id: 's-saf-01', category: 'studentSafety', categoryLabel: '학생 안전·학교폭력', priority: 1, text: '학교폭력 예방 대책은 무엇인가요?', recommendedLength: '500~1000자' },
        { id: 's-saf-02', category: 'studentSafety', categoryLabel: '학생 안전·학교폭력', priority: 1, text: '피해 학생 보호는 어떻게 강화하나요?', recommendedLength: '400~800자' },
        { id: 's-saf-03', category: 'studentSafety', categoryLabel: '학생 안전·학교폭력', priority: 1, text: '가해 학생 교육은 어떻게 하나요?', recommendedLength: '400~800자' },
        { id: 's-saf-04', category: 'studentSafety', categoryLabel: '학생 안전·학교폭력', priority: 1, text: '학교 내 안전사고는 어떻게 줄이나요?', recommendedLength: '300~600자' },
        { id: 's-saf-05', category: 'studentSafety', categoryLabel: '학생 안전·학교폭력', priority: 1, text: '통학로 안전 대책은 있나요?', recommendedLength: '300~600자' },
        { id: 's-saf-06', category: 'studentSafety', categoryLabel: '학생 안전·학교폭력', priority: 2, text: '학교 보안과 출입 관리는 어떻게 하나요?', recommendedLength: '300~600자' },
        { id: 's-saf-07', category: 'studentSafety', categoryLabel: '학생 안전·학교폭력', priority: 1, text: '사이버폭력 대응 방안은 있나요?', recommendedLength: '400~800자' },
        { id: 's-saf-08', category: 'studentSafety', categoryLabel: '학생 안전·학교폭력', priority: 1, text: '학생 상담 인력을 늘릴 계획이 있나요?', recommendedLength: '300~600자' },
        { id: 's-saf-09', category: 'studentSafety', categoryLabel: '학생 안전·학교폭력', priority: 1, text: '위기 학생 조기 발견은 어떻게 하나요?', recommendedLength: '400~800자' },
        { id: 's-saf-10', category: 'studentSafety', categoryLabel: '학생 안전·학교폭력', priority: 1, text: '학부모가 안심할 수 있는 학교를 어떻게 만드나요?', recommendedLength: '500~1000자' },

        // 교권·교사 지원 (10)
        { id: 's-tea-01', category: 'teacherSupport', categoryLabel: '교권·교사 지원', priority: 1, text: '교권 보호 대책은 무엇인가요?', recommendedLength: '500~1000자' },
        { id: 's-tea-02', category: 'teacherSupport', categoryLabel: '교권·교사 지원', priority: 1, text: '악성 민원으로부터 교사를 보호하나요?', recommendedLength: '400~800자' },
        { id: 's-tea-03', category: 'teacherSupport', categoryLabel: '교권·교사 지원', priority: 1, text: '교사 업무 부담을 줄일 수 있나요?', recommendedLength: '400~800자' },
        { id: 's-tea-04', category: 'teacherSupport', categoryLabel: '교권·교사 지원', priority: 1, text: '행정 업무를 줄일 계획이 있나요?', recommendedLength: '400~800자' },
        { id: 's-tea-05', category: 'teacherSupport', categoryLabel: '교권·교사 지원', priority: 2, text: '신규 교사 지원 제도는 있나요?', recommendedLength: '300~600자' },
        { id: 's-tea-06', category: 'teacherSupport', categoryLabel: '교권·교사 지원', priority: 2, text: '교사 상담·치유 지원은 있나요?', recommendedLength: '300~600자' },
        { id: 's-tea-07', category: 'teacherSupport', categoryLabel: '교권·교사 지원', priority: 2, text: '교사 연수는 어떻게 개선하나요?', recommendedLength: '300~600자' },
        { id: 's-tea-08', category: 'teacherSupport', categoryLabel: '교권·교사 지원', priority: 1, text: '학교 현장 의견을 어떻게 반영하나요?', recommendedLength: '400~800자' },
        { id: 's-tea-09', category: 'teacherSupport', categoryLabel: '교권·교사 지원', priority: 2, text: '교사 부족 문제는 어떻게 대응하나요?', recommendedLength: '300~600자' },
        { id: 's-tea-10', category: 'teacherSupport', categoryLabel: '교권·교사 지원', priority: 1, text: '교사가 교육에 집중하게 만들 수 있나요?', recommendedLength: '400~800자' },

        // 돌봄·급식·복지 (10)
        { id: 's-car-01', category: 'careWelfare', categoryLabel: '돌봄·급식·복지', priority: 1, text: '초등 돌봄을 확대할 계획이 있나요?', recommendedLength: '400~800자' },
        { id: 's-car-02', category: 'careWelfare', categoryLabel: '돌봄·급식·복지', priority: 1, text: '방학 중 돌봄 공백은 어떻게 해결하나요?', recommendedLength: '400~800자' },
        { id: 's-car-03', category: 'careWelfare', categoryLabel: '돌봄·급식·복지', priority: 1, text: '학교 급식 질을 개선할 수 있나요?', recommendedLength: '300~600자' },
        { id: 's-car-04', category: 'careWelfare', categoryLabel: '돌봄·급식·복지', priority: 2, text: '친환경 급식을 확대하나요?', recommendedLength: '200~400자' },
        { id: 's-car-05', category: 'careWelfare', categoryLabel: '돌봄·급식·복지', priority: 1, text: '무상급식은 유지되나요?', recommendedLength: '200~400자' },
        { id: 's-car-06', category: 'careWelfare', categoryLabel: '돌봄·급식·복지', priority: 1, text: '저소득층 학생 지원은 어떻게 하나요?', recommendedLength: '400~800자' },
        { id: 's-car-07', category: 'careWelfare', categoryLabel: '돌봄·급식·복지', priority: 2, text: '특수교육 지원은 확대되나요?', recommendedLength: '300~600자' },
        { id: 's-car-08', category: 'careWelfare', categoryLabel: '돌봄·급식·복지', priority: 1, text: '장애 학생 통합교육은 어떻게 개선하나요?', recommendedLength: '400~800자' },
        { id: 's-car-09', category: 'careWelfare', categoryLabel: '돌봄·급식·복지', priority: 2, text: '다문화 학생 지원 정책은 있나요?', recommendedLength: '300~600자' },
        { id: 's-car-10', category: 'careWelfare', categoryLabel: '돌봄·급식·복지', priority: 2, text: '학생 건강검진과 보건 지원은 어떻게 하나요?', recommendedLength: '300~600자' },

        // 진로·미래교육 (10)
        { id: 's-fut-01', category: 'careerEdu', categoryLabel: '진로·미래교육', priority: 1, text: '진로교육을 어떻게 강화하나요?', recommendedLength: '400~800자' },
        { id: 's-fut-02', category: 'careerEdu', categoryLabel: '진로·미래교육', priority: 2, text: '직업계고 지원 정책은 무엇인가요?', recommendedLength: '300~600자' },
        { id: 's-fut-03', category: 'careerEdu', categoryLabel: '진로·미래교육', priority: 1, text: 'AI·디지털 교육은 어떻게 하나요?', recommendedLength: '400~800자' },
        { id: 's-fut-04', category: 'careerEdu', categoryLabel: '진로·미래교육', priority: 2, text: '코딩 교육은 강화되나요?', recommendedLength: '200~400자' },
        { id: 's-fut-05', category: 'careerEdu', categoryLabel: '진로·미래교육', priority: 2, text: '미래산업 교육을 어떻게 준비하나요?', recommendedLength: '300~600자' },
        { id: 's-fut-06', category: 'careerEdu', categoryLabel: '진로·미래교육', priority: 1, text: '대학 진학 외 다양한 진로를 지원하나요?', recommendedLength: '400~800자' },
        { id: 's-fut-07', category: 'careerEdu', categoryLabel: '진로·미래교육', priority: 2, text: '지역 기업과 연계한 교육이 있나요?', recommendedLength: '300~600자' },
        { id: 's-fut-08', category: 'careerEdu', categoryLabel: '진로·미래교육', priority: 2, text: '창업 교육은 지원하나요?', recommendedLength: '200~400자' },
        { id: 's-fut-09', category: 'careerEdu', categoryLabel: '진로·미래교육', priority: 1, text: '학생 맞춤형 진로 상담이 가능한가요?', recommendedLength: '400~800자' },
        { id: 's-fut-10', category: 'careerEdu', categoryLabel: '진로·미래교육', priority: 1, text: '고교학점제 대응은 어떻게 하나요?', recommendedLength: '400~800자' },

        // 학교시설·환경 (10)
        { id: 's-fac-01', category: 'schoolFacility', categoryLabel: '학교시설·환경', priority: 1, text: '노후 학교 시설을 어떻게 개선하나요?', recommendedLength: '400~800자' },
        { id: 's-fac-02', category: 'schoolFacility', categoryLabel: '학교시설·환경', priority: 1, text: '냉난방 시설은 충분히 개선되나요?', recommendedLength: '300~600자' },
        { id: 's-fac-03', category: 'schoolFacility', categoryLabel: '학교시설·환경', priority: 1, text: '석면 제거와 안전 관리는 어떻게 하나요?', recommendedLength: '300~600자' },
        { id: 's-fac-04', category: 'schoolFacility', categoryLabel: '학교시설·환경', priority: 1, text: '화장실 개선 계획이 있나요?', recommendedLength: '300~600자' },
        { id: 's-fac-05', category: 'schoolFacility', categoryLabel: '학교시설·환경', priority: 2, text: '체육관과 운동장 개선 계획은 있나요?', recommendedLength: '200~400자' },
        { id: 's-fac-06', category: 'schoolFacility', categoryLabel: '학교시설·환경', priority: 1, text: '과밀학급 문제는 어떻게 해결하나요?', recommendedLength: '400~800자' },
        { id: 's-fac-07', category: 'schoolFacility', categoryLabel: '학교시설·환경', priority: 2, text: '작은 학교는 어떻게 지원하나요?', recommendedLength: '300~600자' },
        { id: 's-fac-08', category: 'schoolFacility', categoryLabel: '학교시설·환경', priority: 2, text: '학교 공간을 지역사회와 공유하나요?', recommendedLength: '300~600자' },
        { id: 's-fac-09', category: 'schoolFacility', categoryLabel: '학교시설·환경', priority: 2, text: '친환경 학교를 만들 계획이 있나요?', recommendedLength: '200~400자' },
        { id: 's-fac-10', category: 'schoolFacility', categoryLabel: '학교시설·환경', priority: 1, text: '학교 시설 예산은 어떻게 확보하나요?', recommendedLength: '400~800자' },

        // 학부모·학생 소통 (10)
        { id: 's-com-01', category: 'parentComm', categoryLabel: '학부모·학생 소통', priority: 1, text: '학부모 의견은 어떻게 반영하나요?', recommendedLength: '400~800자' },
        { id: 's-com-02', category: 'parentComm', categoryLabel: '학부모·학생 소통', priority: 1, text: '학생 의견을 정책에 반영하나요?', recommendedLength: '400~800자' },
        { id: 's-com-03', category: 'parentComm', categoryLabel: '학부모·학생 소통', priority: 1, text: '교육청 민원 처리를 개선하나요?', recommendedLength: '300~600자' },
        { id: 's-com-04', category: 'parentComm', categoryLabel: '학부모·학생 소통', priority: 2, text: '학교 운영 정보를 더 공개하나요?', recommendedLength: '300~600자' },
        { id: 's-com-05', category: 'parentComm', categoryLabel: '학부모·학생 소통', priority: 2, text: '교육 정책을 쉽게 설명해주나요?', recommendedLength: '200~400자' },
        { id: 's-com-06', category: 'parentComm', categoryLabel: '학부모·학생 소통', priority: 1, text: '학부모 부담을 줄일 정책이 있나요?', recommendedLength: '400~800자' },
        { id: 's-com-07', category: 'parentComm', categoryLabel: '학부모·학생 소통', priority: 1, text: '입시 정보 격차를 줄일 수 있나요?', recommendedLength: '400~800자' },
        { id: 's-com-08', category: 'parentComm', categoryLabel: '학부모·학생 소통', priority: 1, text: '학생 인권과 교권을 어떻게 균형 있게 보나요?', recommendedLength: '500~1000자' },
        { id: 's-com-09', category: 'parentComm', categoryLabel: '학부모·학생 소통', priority: 1, text: '교육정책 변경 시 현장 의견을 듣나요?', recommendedLength: '300~600자' },
        { id: 's-com-10', category: 'parentComm', categoryLabel: '학부모·학생 소통', priority: 2, text: '학부모가 참여할 수 있는 창구가 있나요?', recommendedLength: '300~600자' },

        // 교육행정·예산 (10)
        { id: 's-adm-01', category: 'eduAdmin', categoryLabel: '교육행정·예산', priority: 1, text: '교육 예산 우선순위는 무엇인가요?', recommendedLength: '500~1000자' },
        { id: 's-adm-02', category: 'eduAdmin', categoryLabel: '교육행정·예산', priority: 2, text: '불필요한 교육청 사업을 줄일 계획이 있나요?', recommendedLength: '300~600자' },
        { id: 's-adm-03', category: 'eduAdmin', categoryLabel: '교육행정·예산', priority: 1, text: '학교 현장에 예산을 더 보내나요?', recommendedLength: '400~800자' },
        { id: 's-adm-04', category: 'eduAdmin', categoryLabel: '교육행정·예산', priority: 1, text: '교육청 행정을 어떻게 투명하게 운영하나요?', recommendedLength: '400~800자' },
        { id: 's-adm-05', category: 'eduAdmin', categoryLabel: '교육행정·예산', priority: 1, text: '사립학교 관리·감독은 어떻게 하나요?', recommendedLength: '400~800자' },
        { id: 's-adm-06', category: 'eduAdmin', categoryLabel: '교육행정·예산', priority: 1, text: '교육 비리 방지 대책은 있나요?', recommendedLength: '400~800자' },
        { id: 's-adm-07', category: 'eduAdmin', categoryLabel: '교육행정·예산', priority: 2, text: '교육 정책 효과는 어떻게 평가하나요?', recommendedLength: '300~600자' },
        { id: 's-adm-08', category: 'eduAdmin', categoryLabel: '교육행정·예산', priority: 1, text: '공약 이행 상황을 공개하나요?', recommendedLength: '300~600자' },
        { id: 's-adm-09', category: 'eduAdmin', categoryLabel: '교육행정·예산', priority: 2, text: '교육청 조직 운영을 개선하나요?', recommendedLength: '300~600자' },
        { id: 's-adm-10', category: 'eduAdmin', categoryLabel: '교육행정·예산', priority: 1, text: '임기 내 가장 먼저 바꿀 교육정책은 무엇인가요?', recommendedLength: '500~1000자' }
      ]
    }
  }
};
