"""
Math expression parser and solver for voice-accessible math exams.

Uses SymPy for both numeric evaluation and symbolic solving.
Provides human-readable descriptions of expressions for TTS readback.
"""

import re
from sympy import sympify, solve, Symbol, SympifyError


class MathParser:
    def __init__(self):
        # ✅ Multi-char operators listed first so they match before
        # their single-char substrings (e.g. "**" before "*")
        self.symbol_map = {
            "**": "raised to the power of",
            "^": "raised to the power of",
            "sqrt": "square root of",
            "sin": "sine of",
            "cos": "cosine of",
            "tan": "tangent of",
            "pi": "pi",
            "+": "plus",
            "-": "minus",           # ✅ Fixed: was "portions"
            "*": "times",
            "/": "divided by",
            "=": "equals",
            "(": "open parenthesis",
            ")": "close parenthesis",
        }

    def parse_and_solve(self, expression):
        """Parse a math expression and return the result.

        - Pure numeric expressions (e.g. "2+3") → evaluated to a float.
        - Symbolic expressions with variables (e.g. "x**2 - 4") → solved
          algebraically and solutions returned as strings.
        """
        try:
            expr = sympify(expression)

            # Check if expression contains free variables (symbolic)
            if expr.free_symbols:
                # Algebraic solve — find roots / solutions
                solutions = solve(expr)
                return {
                    "original": expression,
                    "parsed": str(expr),
                    "result": [str(s) for s in solutions],
                    "description": self.tokenize_and_describe(expression),
                }

            # Numeric evaluation
            result = expr.evalf()
            # ✅ Only cast to float for actual numeric results
            try:
                numeric = float(result)
            except (TypeError, ValueError):
                numeric = str(result)

            return {
                "original": expression,
                "parsed": str(expr),
                "result": numeric,
                "description": self.tokenize_and_describe(expression),
            }
        except SympifyError:
            return {"error": "Invalid math expression"}
        except Exception:
            return {"error": "Could not evaluate expression"}

    def tokenize_and_describe(self, expression):
        """Convert a math expression into a human-readable spoken string.

        E.g. "2+3*4" → "2 plus 3 times 4"
        """
        # ✅ Build a regex that matches multi-char operators, numbers,
        # words, and single-char operators.  Sorted longest-first so
        # "**" is tried before "*".
        operator_patterns = sorted(
            (re.escape(op) for op in self.symbol_map if not op.isalnum()),
            key=len,
            reverse=True,
        )
        # Build via explicit concatenation because one segment is computed.
        pattern = (
            r"(\d+\.?\d*"  # numbers (int or float)
            + r"|[a-zA-Z_]\w*"  # words / variables / functions
            + r"|"
            + "|".join(operator_patterns)  # operators (longest first)
            + r")"
        )

        tokens = re.findall(pattern, expression)

        described = []
        for token in tokens:
            if token in self.symbol_map:
                described.append(self.symbol_map[token])
            else:
                described.append(token)

        return " ".join(described)
