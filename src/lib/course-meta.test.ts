import { describe, expect, it } from 'vitest'
import { completionRate } from './course-meta'
import { coursePriceText, formatDuration, levelLabel, parsePrice } from './lms'

describe('completionRate', () => {
  it('es null cuando nadie se inscribió (no se inventa un 0 %)', () => {
    expect(completionRate([])).toBeNull()
    expect(completionRate([{ status: 'DROPPED' }])).toBeNull()
  })

  it('cuenta completados sobre quienes siguen o terminaron; los que abandonaron no cuentan', () => {
    expect(completionRate([{ status: 'COMPLETED' }, { status: 'ENROLLED' }])).toBe(50)
    expect(completionRate([{ status: 'COMPLETED' }, { status: 'ENROLLED' }, { status: 'DROPPED' }, { status: 'DROPPED' }])).toBe(50)
    expect(completionRate([{ status: 'COMPLETED' }, { status: 'COMPLETED' }, { status: 'ENROLLED' }])).toBe(67)
    expect(completionRate([{ status: 'COMPLETED' }])).toBe(100)
  })
})

describe('formato de cursos', () => {
  it('duración legible', () => {
    expect(formatDuration(95)).toBe('1 h 35 min')
    expect(formatDuration(40)).toBe('40 min')
    expect(formatDuration(120)).toBe('2 h')
    expect(formatDuration(0)).toBe('—')
  })
  it('nivel', () => {
    expect(levelLabel('BASIC')).toBe('Básico')
    expect(levelLabel('ADVANCED')).toBe('Avanzado')
  })
})

describe('precio del curso', () => {
  it('sin precio es "Gratis"; con precio, la cantidad con su moneda', () => {
    expect(coursePriceText(0, 'USD')).toBe('Gratis')
    expect(coursePriceText(120.5, 'USD')).toBe('USD 120.50')
    expect(coursePriceText(85, 'PEN')).toBe('PEN 85.00')
  })

  it('parsePrice: vacío es gratuito; acepta hasta 2 decimales; rechaza negativos y texto', () => {
    expect(parsePrice('')).toEqual({ ok: true, value: 0 })
    expect(parsePrice('  ')).toEqual({ ok: true, value: 0 })
    expect(parsePrice('0')).toEqual({ ok: true, value: 0 })
    expect(parsePrice('120.5')).toEqual({ ok: true, value: 120.5 })
    expect(parsePrice('99.99')).toEqual({ ok: true, value: 99.99 })
    expect(parsePrice('-1')).toMatchObject({ ok: false, error: 'El precio no puede ser negativo.' })
    expect(parsePrice('10.999')).toMatchObject({ ok: false, error: 'Máximo 2 decimales.' })
    expect(parsePrice('abc')).toMatchObject({ ok: false, error: 'Indica un número.' })
  })
})
