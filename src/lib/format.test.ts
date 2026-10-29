import { describe, expect, it } from 'vitest'
import { formatAmount, formatMoney, formatSignedMoney, resolveLocale } from './format'

describe('resolveLocale', () => {
  it('usa es-EC para el formato con coma decimal', () => {
    expect(resolveLocale('14.850,00')).toBe('es-EC')
  })

  it('usa en-US para el formato con punto decimal', () => {
    expect(resolveLocale('14,850.00')).toBe('en-US')
  })

  it('usa en-US cuando no hay valor', () => {
    expect(resolveLocale(null)).toBe('en-US')
    expect(resolveLocale(undefined)).toBe('en-US')
  })
})

describe('format', () => {
  describe('formatAmount', () => {
    it('muestra dos decimales sin símbolo de moneda', () => {
      expect(formatAmount(175)).toBe('175.00')
    })

    it('agrupa los miles', () => {
      expect(formatAmount(1234.5)).toBe('1,234.50')
    })

    it('usa cero cuando el valor no es finito', () => {
      expect(formatAmount(Number.NaN)).toBe('0.00')
      expect(formatAmount(Number.POSITIVE_INFINITY)).toBe('0.00')
    })
  })

  describe('formatMoney', () => {
    it('incluye el símbolo de dólar por defecto', () => {
      expect(formatMoney(175)).toBe('$175.00')
    })

    it('respeta la moneda y el locale indicados', () => {
      expect(formatMoney(1000, { locale: 'es-EC', currency: 'USD' })).toBe('$1.000,00')
      expect(formatMoney(1000, { locale: 'de-DE', currency: 'EUR' })).toContain('€')
    })
  })

  describe('formatSignedMoney', () => {
    it('antepone el signo positivo', () => {
      expect(formatSignedMoney(50)).toBe('+$50.00')
    })

    it('antepone el signo negativo sin duplicar el menos de la moneda', () => {
      expect(formatSignedMoney(-50)).toBe('-$50.00')
    })

    it('trata el cero como positivo', () => {
      expect(formatSignedMoney(0)).toBe('+$0.00')
    })
  })
})
