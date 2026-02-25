'use client'

import React, { useState, useCallback } from 'react'
import { TextInput, useField } from '@payloadcms/ui'

interface ColorPickerFieldProps {
  path: string
}

/** Convert HSL string "H S% L%" to hex "#RRGGBB" */
function hslToHex(hslStr: string): string {
  const parts = hslStr.trim().split(/[\s,/]+/)
  const h = parseFloat(parts[0] ?? '0')
  const s = parseFloat(parts[1] ?? '0') / 100
  const l = parseFloat(parts[2] ?? '0') / 100

  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/** Convert hex "#RRGGBB" to HSL string "H S% L%" */
function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '0 0% 0%'

  const r = parseInt(result[1]!, 16) / 255
  const g = parseInt(result[2]!, 16) / 255
  const b = parseInt(result[3]!, 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) {
    return `0 0% ${Math.round(l * 100)}%`
  }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h = 0
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  } else if (max === g) {
    h = ((b - r) / d + 2) / 6
  } else {
    h = ((r - g) / d + 4) / 6
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

export const ColorPickerField: React.FC<ColorPickerFieldProps> = ({ path }) => {
  const { value, setValue } = useField<string>({ path })
  const [pickerValue, setPickerValue] = useState(() => {
    if (value && value.trim()) {
      try {
        return hslToHex(value)
      } catch {
        return '#000000'
      }
    }
    return '#000000'
  })

  const handlePickerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hex = e.target.value
      setPickerValue(hex)
      const hsl = hexToHsl(hex)
      setValue(hsl)
    },
    [setValue],
  )

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hsl = e.target.value
      setValue(hsl)
      if (hsl && hsl.trim()) {
        try {
          setPickerValue(hslToHex(hsl))
        } catch {
          // Invalid HSL input — don't update picker
        }
      }
    },
    [setValue],
  )

  const handleClear = useCallback(() => {
    setValue('')
    setPickerValue('#000000')
  }, [setValue])

  const hasValue = typeof value === 'string' && value.trim().length > 0

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '4px',
              border: '2px solid var(--theme-elevation-400)',
              backgroundColor: hasValue ? `hsl(${value})` : 'transparent',
              backgroundImage: hasValue
                ? 'none'
                : 'repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%)',
              backgroundSize: hasValue ? 'auto' : '8px 8px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <input
              type="color"
              value={pickerValue}
              onChange={handlePickerChange}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
                border: 'none',
                padding: 0,
              }}
            />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <TextInput
            path={path}
            value={value ?? ''}
            onChange={handleTextChange}
            placeholder={hasValue ? undefined : 'Using theme default'}
          />
        </div>
        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--theme-elevation-400)',
              borderRadius: '4px',
              background: 'none',
              cursor: 'pointer',
              color: 'var(--theme-elevation-800)',
              fontSize: '0.8rem',
              whiteSpace: 'nowrap',
              marginBottom: '0.25rem',
            }}
          >
            Clear
          </button>
        )}
      </div>
      {!hasValue && (
        <p
          style={{
            fontSize: '0.75rem',
            color: 'var(--theme-elevation-600)',
            marginTop: '0.25rem',
          }}
        >
          Click the swatch to pick a colour, or type HSL values (e.g. &quot;150 27% 22%&quot;)
        </p>
      )}
    </div>
  )
}
