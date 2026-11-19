/**
 * Tiny arithmetic evaluator for the counting game ("12*2" counts as 24).
 * Hand-written recursive-descent parser: NO eval / Function, a strict character
 * whitelist, and hard limits on length, nesting depth and magnitude.
 *
 *   expr   := term (("+" | "-") term)*
 *   term   := factor (("*" | "x" | "/" | "%") factor)*
 *   factor := unary ("^" factor)?          (right-associative)
 *   unary  := "-" unary | primary
 *   primary:= integer | "(" expr ")" | "sqrt" "(" expr ")"
 */
const MAX_LENGTH = 64;
const MAX_DEPTH = 16;
const MAX_ABS = 1e15;

class ParseError extends Error {}

export function evaluateExpression(input: string): number | null {
  const src = input.trim().toLowerCase().replace(/\s+/g, "").replace(/×/g, "*").replace(/÷/g, "/");
  if (src.length === 0 || src.length > MAX_LENGTH) return null;
  if (!/^(?:[0-9+\-*/%^()x]|sqrt)+$/.test(src)) return null;

  let pos = 0;
  let depth = 0;

  const peek = () => src[pos];
  const eat = (ch: string) => {
    if (src.startsWith(ch, pos)) {
      pos += ch.length;
      return true;
    }
    return false;
  };
  const check = (n: number) => {
    if (!Number.isFinite(n) || Math.abs(n) > MAX_ABS) throw new ParseError("out of range");
    return n;
  };

  function expr(): number {
    if (++depth > MAX_DEPTH) throw new ParseError("too deep");
    let v = term();
    for (;;) {
      if (eat("+")) v = check(v + term());
      else if (eat("-")) v = check(v - term());
      else break;
    }
    depth--;
    return v;
  }
  function term(): number {
    let v = factor();
    for (;;) {
      if (eat("*") || eat("x")) v = check(v * factor());
      else if (eat("/")) {
        const d = factor();
        if (d === 0) throw new ParseError("division by zero");
        v = check(v / d);
      } else if (eat("%")) {
        const d = factor();
        if (d === 0) throw new ParseError("division by zero");
        v = check(v % d);
      } else break;
    }
    return v;
  }
  function factor(): number {
    const base = unary();
    if (eat("^")) {
      const exp = factor();
      if (Math.abs(exp) > 64) throw new ParseError("exponent too large");
      return check(base ** exp);
    }
    return base;
  }
  function unary(): number {
    if (eat("-")) {
      if (++depth > MAX_DEPTH) throw new ParseError("too deep");
      const v = -unary();
      depth--;
      return v;
    }
    return primary();
  }
  function primary(): number {
    if (eat("sqrt")) {
      if (!eat("(")) throw new ParseError("expected (");
      const v = expr();
      if (!eat(")")) throw new ParseError("expected )");
      if (v < 0) throw new ParseError("sqrt of negative");
      return Math.sqrt(v);
    }
    if (eat("(")) {
      const v = expr();
      if (!eat(")")) throw new ParseError("expected )");
      return v;
    }
    const start = pos;
    while (pos < src.length && /[0-9]/.test(peek() ?? "")) pos++;
    if (start === pos) throw new ParseError("expected number");
    if (pos - start > 15) throw new ParseError("number too long");
    return Number(src.slice(start, pos));
  }

  try {
    const value = expr();
    if (pos !== src.length) return null;
    return value;
  } catch (e) {
    if (e instanceof ParseError) return null;
    throw e;
  }
}

/** True if the text is a plain whole number (no maths), e.g. "42". */
export const isPlainNumber = (text: string) => /^\d{1,15}$/.test(text.trim());
