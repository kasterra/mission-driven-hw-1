/** 파일 기본 검증: 타입/용량 */
/** @param {File} file @returns {boolean} */
export function isValidImage(file) {
  const okType =
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    /\.(jpe?g|png)$/i.test(file.name);
  if (!okType) return false;
  // 이미지 크기 제한 500KB. localstorage에 base64로 저장하기 위한 제약
  const okSize = file.size <= 500 * 1024;
  return okSize;
}
