import { describe, expect, it } from 'vitest'
import { toMaterialIcon } from './icons'

describe('toMaterialIcon', () => {
  it('traduce los íconos heredados de las categorías por defecto', () => {
    expect(toMaterialIcon('Utensils')).toBe('restaurant')
    expect(toMaterialIcon('Car')).toBe('directions_car')
    expect(toMaterialIcon('HeartPulse')).toBe('monitor_heart')
    expect(toMaterialIcon('GraduationCap')).toBe('school')
    expect(toMaterialIcon('ShoppingBag')).toBe('shopping_bag')
    expect(toMaterialIcon('TrendingUp')).toBe('trending_up')
    expect(toMaterialIcon('LineChart')).toBe('show_chart')
    expect(toMaterialIcon('PlusCircle')).toBe('add_circle')
  })

  it('conserva los nombres válidos de Material Symbols', () => {
    expect(toMaterialIcon('savings')).toBe('savings')
    expect(toMaterialIcon('account_balance_wallet')).toBe('account_balance_wallet')
    expect(toMaterialIcon('receipt_long')).toBe('receipt_long')
  })

  it('ignora los espacios alrededor del nombre', () => {
    expect(toMaterialIcon('  Zap  ')).toBe('bolt')
  })

  it('usa el ícono por defecto con valores vacíos o desconocidos', () => {
    expect(toMaterialIcon(null)).toBe('category')
    expect(toMaterialIcon(undefined, 'receipt_long')).toBe('receipt_long')
    expect(toMaterialIcon('')).toBe('category')
    expect(toMaterialIcon('IconoInventado')).toBe('category')
    expect(toMaterialIcon('IconoInventado', 'payments')).toBe('payments')
  })
})
