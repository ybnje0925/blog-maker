# BlogDraft

사진, 참고 PDF, 요청사항을 바탕으로 수정 가능한 블로그 초안과 썸네일 문구를 만드는 React/Vite 앱입니다. AI 결과물은 바로 발행하는 완성본이 아니라 사용자가 경험, 사실 확인, 말투를 더해 완성하는 초안입니다.

## 실행
```bash
npm install
npm run dev
```

기본 로컬 URL은 `http://localhost:3222`입니다.

## 검증
```bash
npm run lint
npm run build
```

## 필수 환경변수
서버:
- `GEMINI_API_KEY`

프런트:
- `VITE_SITE_URL`
- `VITE_CONTACT_EMAIL`
- `VITE_OPERATOR_NAME`

선택:
- `GEMINI_MODEL`
- `VITE_GA_MEASUREMENT_ID`
- `VITE_CLARITY_PROJECT_ID`

OpenAI 생성 기능은 현재 준비 중이며 향후 추가 예정입니다. 지금 운영은 Gemini API Key 기준입니다.

## 운영 준비
검색엔진 등록, GA4, Clarity, AdSense 신청 체크리스트는 [OPERATIONS.md](./OPERATIONS.md)를 확인하세요.

Search Console에 제출할 sitemap URL:
```text
https://YOUR_DOMAIN/sitemap.xml
```
