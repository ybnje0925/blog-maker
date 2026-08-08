# BlogDraft 운영 준비 문서

## 목적
BlogDraft는 사진, 참고 PDF, 사용자의 요청사항을 바탕으로 수정 가능한 블로그 초안과 썸네일 문구를 만드는 도구입니다. AI 결과물은 발행 전 초안이며, 최종 사실 확인과 편집은 사용자가 진행합니다.

## 실행
```bash
npm install
npm run dev
npm run lint
npm run build
```

## 환경변수
서버:
- `GEMINI_API_KEY`: Gemini 생성 기능 사용 시 필요
- `GEMINI_MODEL`: 선택, 기본값은 `gemini-2.5-flash`

OpenAI 생성 기능은 현재 준비 중이며 향후 추가 예정입니다. 운영 기준은 Gemini API Key입니다.

프런트:
- `VITE_SITE_URL`: canonical, OG, sitemap 제출 기준 URL
- `VITE_GA_MEASUREMENT_ID`: GA4 측정 ID, production에서 값이 있을 때만 로드
- `VITE_CLARITY_PROJECT_ID`: Microsoft Clarity Project ID, production에서 값이 있을 때만 로드
- `VITE_CONTACT_EMAIL`: 정책/문의 페이지에 표시할 문의 이메일
- `VITE_OPERATOR_NAME`: 정책/문의 페이지에 표시할 운영자명

## Search Console 준비
- `https://YOUR_DOMAIN/sitemap.xml` 접근 확인
- `https://YOUR_DOMAIN/robots.txt` 접근 확인
- 주요 URL 접근 확인: `/`, `/guide`, `/about`, `/privacy`, `/terms`, `/contact`, `/copyright`, `/ai-policy`
- 가이드 상세 URL 접근 확인: `/guide/before-publishing-ai-draft` 등 sitemap 내 guide URL
- `noindex`는 404와 찾을 수 없는 가이드 화면에만 적용
- Search Console에서 사이트 속성 등록 후 제출할 sitemap URL: `https://YOUR_DOMAIN/sitemap.xml`

## GA4 연동 방식
- `VITE_GA_MEASUREMENT_ID`가 있고 production build일 때만 GA4 스크립트를 로드합니다.
- 개발 환경에서는 GA4가 로드되지 않아 테스트 중 불필요한 이벤트가 전송되지 않습니다.
- 전송 이벤트:
  - `page_view`
  - `generate_start`
  - `generate_success`
  - `generate_fail`
  - `provider_select`
  - `api_key_mode_select`
  - `guide_view`
  - `thumbnail_edit`
  - `copy_result`
  - `download_thumbnail`
- 이벤트에는 API Key, 파일명, 사용자 입력 전문, PDF 내용, 이미지 데이터, 생성 본문 전체를 보내지 않습니다.

## Microsoft Clarity 연동 방식
- `VITE_CLARITY_PROJECT_ID`가 있고 production build일 때만 Clarity 스크립트를 로드합니다.
- 다음 영역은 `data-clarity-mask="true"`로 마스킹합니다.
  - Gemini API Key 입력창
  - 추가 요청사항 입력창
  - 업로드 사진/파일명 표시 영역
  - 생성된 블로그 본문 편집/미리보기 영역
  - 썸네일 문구 입력창과 썸네일 미리보기 영역

## 정책 페이지 점검
- `/privacy`: 업로드 파일, API Key, 브라우저 저장, 외부 AI 제공자 처리 안내 포함
- `/terms`: AI 결과물은 초안이며 최종 발행 책임은 사용자에게 있음을 안내
- `/contact`: 문의 가능 항목과 문의처 표시
- `/copyright`: 업로드 자료 권리와 저작권/초상권 확인 안내
- `/ai-policy`: AI 결과물 편집 원칙과 보장하지 않는 사항 안내
- `/about`: 서비스 목적과 한계 안내

운영 전 반드시 `VITE_CONTACT_EMAIL`, `VITE_OPERATOR_NAME` 값을 실제 운영 정보로 설정하세요. 값이 없으면 정책 페이지에 입력 필요 문구가 표시됩니다.

## AdSense 신청 준비
현재 실제 AdSense 코드는 삽입하지 않았습니다. 개발용 광고 placeholder는 production에서 기본적으로 숨겨지며, 필요할 때만 `VITE_SHOW_AD_PLACEHOLDERS=true`로 확인합니다.

신청 전 점검:
- 빈 화면에 광고 없음
- 정책 페이지에 광고 없음
- 생성 버튼 바로 근처에 광고 없음
- API Key 입력창 근처에 광고 없음
- 복사/다운로드 버튼 바로 근처에 광고 없음
- 광고 클릭을 유도하는 문구 없음
- 가이드 본문은 충분한 길이와 독립적인 정보성을 갖춤
- 광고 영역이 본문보다 많지 않음

승인 후 추천 광고 위치:
- `/guide` 목록 하단
- `/guide/:slug` 본문 중간 1개
- `/guide/:slug` 본문 하단 1개
- 생성 결과가 충분히 있을 때 결과 하단 1개

피해야 할 위치:
- 생성 버튼 바로 근처
- API Key 입력창 근처
- 복사/다운로드 버튼 바로 근처
- 개인정보처리방침, 이용약관, 문의하기
- 빈 결과 화면

## 운영 로그
서버 로그는 다음 정도만 남깁니다.
- 요청 성공/실패
- provider
- model
- 처리 시간
- 사진 개수
- PDF 첨부 여부
- 참고 썸네일 첨부 여부
- 오류 status

로그에 남기지 않는 항목:
- API Key
- 사용자 입력 전문
- PDF 내용
- 이미지 데이터
- 생성된 본문 전체
- 개인정보

## OG 및 브랜드 자산
- favicon: `/favicon.svg`
- apple-touch-icon: `/apple-touch-icon.svg`
- manifest: `/site.webmanifest`
- 기본 OG 이미지: `/og-default.svg`
- 기본 OG 문구는 `BlogDraft`, “사진과 참고자료를 바탕으로 블로그 초안과 썸네일을 다듬는 도구” 톤으로 유지합니다.

## Known Issues
- `VITE_CONTACT_EMAIL`, `VITE_OPERATOR_NAME`, `VITE_SITE_URL`은 실제 배포 도메인과 운영 정보로 설정해야 합니다.
- Search Console 등록, GA4 속성 생성, Clarity 프로젝트 생성, AdSense 신청은 운영자가 각 서비스 콘솔에서 직접 완료해야 합니다.
- 실제 AdSense 코드는 승인 전 삽입하지 않았습니다.
