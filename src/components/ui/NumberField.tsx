import { useState, type ComponentProps } from 'react'
import { formatAmountInput, parseAmount, toAmountText } from '@/lib/amount'
import { TextField } from './TextField'

interface NumberFieldProps extends Omit<ComponentProps<typeof TextField>, 'value' | 'onChange' | 'type'> {
  value: number | null
  onChange: (value: number | null) => void
  /** 허용 소수 자릿수 (원화 0, 달러·유로 2) */
  decimals?: number
}

/** 금액 입력 — 입력하는 동안 천 단위 구분자가 자동으로 붙는다 */
export function NumberField({ value, onChange, decimals = 0, ...props }: NumberFieldProps) {
  const [text, setText] = useState(() => toAmountText(value, decimals))

  // 외부에서 값이 바뀐 경우(초기화 등)에만 표시 문자열을 다시 맞춘다
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    if (parseAmount(text) !== value) setText(toAmountText(value, decimals))
  }

  return (
    <TextField
      {...props}
      inputMode={decimals ? 'decimal' : 'numeric'}
      value={text}
      onChange={(e) => {
        const next = formatAmountInput(e.target.value, decimals)
        setText(next)
        onChange(parseAmount(next))
      }}
      className={props.className}
    />
  )
}
