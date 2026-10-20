/**
 * Lightweight, high-precision Decimal class supporting numbers up to 10^(1,000,000,000)
 * Modeled after BreakInfinity for exponential incremental mechanics.
 */

export class Decimal {
  mantissa: number; // In range [1, 10) for positive, 0 for zero
  exponent: number; // Integer exponent

  constructor(mantissa: number | string | Decimal = 0, exponent: number = 0) {
    if (mantissa instanceof Decimal) {
      this.mantissa = mantissa.mantissa;
      this.exponent = mantissa.exponent;
      return;
    }

    if (typeof mantissa === 'string') {
      const parsed = Decimal.fromString(mantissa);
      this.mantissa = parsed.mantissa;
      this.exponent = parsed.exponent;
      return;
    }

    if (mantissa === 0 || !isFinite(mantissa)) {
      this.mantissa = 0;
      this.exponent = 0;
      return;
    }

    let m = mantissa;
    let e = exponent;

    // Handle negative numbers if any (normalize to 0 for game currencies)
    if (m < 0) {
      this.mantissa = 0;
      this.exponent = 0;
      return;
    }

    // Normalize
    const expShift = Math.floor(Math.log10(m));
    if (isFinite(expShift) && expShift !== 0) {
      m = m / Math.pow(10, expShift);
      e += expShift;
    }

    this.mantissa = m;
    this.exponent = e;
    this.normalize();
  }

  static from(value: number | string | Decimal): Decimal {
    if (value instanceof Decimal) return value;
    return new Decimal(value);
  }

  static zero(): Decimal {
    return new Decimal(0, 0);
  }

  static one(): Decimal {
    return new Decimal(1, 0);
  }

  private normalize(): void {
    if (this.mantissa === 0) {
      this.exponent = 0;
      return;
    }

    while (this.mantissa >= 10) {
      this.mantissa /= 10;
      this.exponent++;
    }
    while (this.mantissa < 1 && this.mantissa > 0) {
      this.mantissa *= 10;
      this.exponent--;
    }

    // Round slight precision errors
    this.mantissa = Math.round(this.mantissa * 1e12) / 1e12;
    if (this.mantissa >= 10) {
      this.mantissa /= 10;
      this.exponent++;
    }
  }

  add(other: Decimal | number): Decimal {
    const b = Decimal.from(other);
    if (this.mantissa === 0) return new Decimal(b.mantissa, b.exponent);
    if (b.mantissa === 0) return new Decimal(this.mantissa, this.exponent);

    const diff = this.exponent - b.exponent;
    if (diff >= 16) return new Decimal(this.mantissa, this.exponent);
    if (diff <= -16) return new Decimal(b.mantissa, b.exponent);

    if (diff >= 0) {
      const newMantissa = this.mantissa + b.mantissa * Math.pow(10, -diff);
      return new Decimal(newMantissa, this.exponent);
    } else {
      const newMantissa = this.mantissa * Math.pow(10, diff) + b.mantissa;
      return new Decimal(newMantissa, b.exponent);
    }
  }

  sub(other: Decimal | number): Decimal {
    const b = Decimal.from(other);
    if (b.mantissa === 0) return new Decimal(this.mantissa, this.exponent);
    if (this.mantissa === 0) return Decimal.zero();

    const diff = this.exponent - b.exponent;
    if (diff >= 16) return new Decimal(this.mantissa, this.exponent);
    if (diff < 0 || (diff === 0 && this.mantissa < b.mantissa)) {
      return Decimal.zero(); // Floored at zero for incremental game currencies
    }

    const newMantissa = this.mantissa - b.mantissa * Math.pow(10, -diff);
    return new Decimal(newMantissa, this.exponent);
  }

  mul(other: Decimal | number): Decimal {
    const b = Decimal.from(other);
    if (this.mantissa === 0 || b.mantissa === 0) return Decimal.zero();
    return new Decimal(this.mantissa * b.mantissa, this.exponent + b.exponent);
  }

  div(other: Decimal | number): Decimal {
    const b = Decimal.from(other);
    if (b.mantissa === 0) return Decimal.zero();
    if (this.mantissa === 0) return Decimal.zero();
    return new Decimal(this.mantissa / b.mantissa, this.exponent - b.exponent);
  }

  pow(power: number): Decimal {
    if (power === 0) return Decimal.one();
    if (this.mantissa === 0) return Decimal.zero();

    const newLog = (this.exponent + Math.log10(this.mantissa)) * power;
    const newExponent = Math.floor(newLog);
    const newMantissa = Math.pow(10, newLog - newExponent);
    return new Decimal(newMantissa, newExponent);
  }

  log10(): number {
    if (this.mantissa <= 0) return 0;
    return this.exponent + Math.log10(this.mantissa);
  }

  floor(): Decimal {
    if (this.exponent < 0) return Decimal.zero();
    if (this.exponent >= 16) return new Decimal(this.mantissa, this.exponent);
    const num = this.toNumber();
    return new Decimal(Math.floor(num), 0);
  }

  toNumber(): number {
    if (this.exponent > 308) return Infinity;
    if (this.exponent < -308) return 0;
    return this.mantissa * Math.pow(10, this.exponent);
  }

  eq(other: Decimal | number): boolean {
    const b = Decimal.from(other);
    if (this.mantissa === 0 && b.mantissa === 0) return true;
    return this.exponent === b.exponent && Math.abs(this.mantissa - b.mantissa) < 1e-9;
  }

  lt(other: Decimal | number): boolean {
    const b = Decimal.from(other);
    if (this.mantissa === 0) return b.mantissa > 0;
    if (b.mantissa === 0) return false;
    if (this.exponent !== b.exponent) return this.exponent < b.exponent;
    return this.mantissa < b.mantissa;
  }

  lte(other: Decimal | number): boolean {
    return this.lt(other) || this.eq(other);
  }

  gt(other: Decimal | number): boolean {
    return !this.lte(other);
  }

  gte(other: Decimal | number): boolean {
    return !this.lt(other);
  }

  static fromString(str: string): Decimal {
    const trimmed = str.trim();
    if (!trimmed || trimmed === '0') return Decimal.zero();

    if (trimmed.includes('e') || trimmed.includes('E')) {
      const parts = trimmed.split(/e|E/);
      const m = parseFloat(parts[0]);
      const e = parseInt(parts[1], 10);
      if (isNaN(m) || isNaN(e)) return Decimal.zero();
      return new Decimal(m, e);
    }

    const val = parseFloat(trimmed);
    if (isNaN(val)) return Decimal.zero();
    return new Decimal(val, 0);
  }

  toString(): string {
    if (this.mantissa === 0) return '0';
    return `${this.mantissa}e${this.exponent}`;
  }

  format(notation: 'scientific' | 'engineering' | 'standard' | 'logarithm' = 'scientific'): string {
    if (this.mantissa === 0) return '0';

    if (this.exponent < 3) {
      const num = this.toNumber();
      if (num < 10) return num.toFixed(2);
      return Math.floor(num).toLocaleString('en-US');
    }

    if (this.exponent < 6) {
      return Math.floor(this.toNumber()).toLocaleString('en-US');
    }

    if (notation === 'logarithm') {
      const logVal = this.log10();
      return `e${logVal.toFixed(2)}`;
    }

    if (notation === 'engineering') {
      const remainder = ((this.exponent % 3) + 3) % 3;
      const engExp = this.exponent - remainder;
      const engMantissa = this.mantissa * Math.pow(10, remainder);
      return `${engMantissa.toFixed(2)}e${engExp}`;
    }

    if (notation === 'standard') {
      const STANDARD_SUFFIXES = [
        '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
        'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod',
        'Vg', 'Uvg', 'Dvg', 'Tvg', 'Qavg', 'Qivg', 'Sxvg', 'Spvg', 'Ocvg', 'Novg',
        'Tg'
      ];
      const tier = Math.floor(this.exponent / 3);
      if (tier < STANDARD_SUFFIXES.length) {
        const remainder = this.exponent % 3;
        const shortVal = this.mantissa * Math.pow(10, remainder);
        return `${shortVal.toFixed(2)} ${STANDARD_SUFFIXES[tier]}`;
      }
    }

    // Default: Scientific
    return `${this.mantissa.toFixed(2)}e${this.exponent}`;
  }
}
