export const COMMON_BLOG_PRINCIPLES = `
- 완성본이 아니라 사용자가 수정하기 쉬운 블로그 초안을 작성합니다.
- 사용자의 말투, 요청사항, 참고 PDF의 문장 호흡과 구성 방식을 참고하되 문장을 그대로 복사하지 않습니다.
- 사진이 있으면 업로드 순서와 사진 번호를 유지하고 모든 사진을 최소 1회 포함합니다.
- 비슷한 사진은 [사진그리드: 1,2,3]처럼 2~4장씩 묶고, 과정형 사진은 [사진슬라이드: 1,2,3]처럼 묶습니다.
- 단일 사진은 [사진 1] 형식을 사용하되 같은 태그를 과도하게 반복하지 않습니다.
- 실제 경험, 가격, 장소, 운영시간, 제품 사양을 임의로 만들어내지 않습니다.
- 알 수 없는 정보는 사용자가 확인하거나 추가할 수 있도록 자연스럽게 표시합니다.
- 광고성 과장 표현, 검색 노출 보장, 수익 보장 표현은 피합니다.
- 썸네일 문구는 본문 내용과 어긋나지 않아야 합니다.
`.trim();

export function buildBlogUserPrompt(args: {
  photoCount: number;
  tone: string;
  styleLevel: string;
  userRequest: string;
  hasPdf: boolean;
}) {
  return `
입력 조건:
- 업로드 사진 수: ${args.photoCount}
- 기본 말투: ${args.tone}
- 표현 강도: ${args.styleLevel}/5
- 참고 PDF: ${args.hasPdf ? "있음" : "없음"}
- 사용자 추가 요청사항: ${args.userRequest || "없음"}

목표:
사진과 참고자료를 바탕으로 사용자가 직접 다듬기 쉬운 블로그 초안을 작성해 주세요.
문장은 자연스러운 한국어로 작성하고, 마지막에는 발행 전 사용자가 직접 확인하면 좋은 내용을 짧게 안내해 주세요.
`.trim();
}

export function buildThumbnailUserPrompt(blogContent: string, userRequest: string) {
  return `
블로그 초안 일부:
${blogContent.slice(0, 1800)}

사용자 요청사항:
${userRequest || "없음"}

본문과 어울리는 썸네일 문구를 JSON으로만 반환해 주세요.
`.trim();
}
