/** 입력 테두리 색: 오류 > 성공 > 기본(호버·포커스) */
export const fieldBorder = (error?: string, success?: string) =>
  error
    ? 'border-red-40'
    : success
      ? 'border-green-40'
      : 'border-gray-40 hover:border-brand-30 focus-within:border-brand-60'
