# Supported Math Notations in Saarthi Math Exam System

## ⚠️ Important: What Actually Works

Based on real system testing, here are the notations that are **fully working and reliable**. Some notations in prior documentation required fixes.

---

## Complete Example Answer: Solve x² + 3x - 5 = 0

### **Step 1: Identify the equation**
**Dictate:** "x squared plus 3x minus 5 equals 0"  
**Renders as:** $x^2 + 3x - 5 = 0$ ✅

---

### **Step 2: Quadratic formula with fix**
**Dictate:** "x equals negative 3 plus or minus square root of 29 over 2"  
**Renders as:** $x = \frac{-3 \pm \sqrt{29}}{2}$ ✅

*(Note: "negative" keyword now properly converts to unary minus)*
*(Note: "plus or minus" now renders as ± symbol)*

---

### **Step 3: Calculate the discriminant**
**Dictate:** "3 squared minus 4 times 1 times negative 5"  
**Renders as:** $3^2 - 4 \times 1 \times (-5)$ ✅

---

### **Step 4: Simplify the discriminant**
**Dictate:** "equals 9 plus 20 equals 29"  
**Renders as:** $= 9 + 20 = 29$ ✅

---

### **Step 5: Find both solutions**
**First solution:**
- **Dictate:** "x equals negative 3 plus square root of 29 over 2"
- **Renders as:** $x = \frac{-3 + \sqrt{29}}{2}$ ✅

**Second solution:**
- **Dictate:** "x equals negative 3 minus square root of 29 over 2"  
- **Renders as:** $x = \frac{-3 - \sqrt{29}}{2}$ ✅

---

## All Supported Notations Reference

### **1. BASIC ARITHMETIC** ✅ FULLY WORKING
| Notation | Dictate | Renders |
|----------|---------|---------|
| Addition | "2 plus 3" | $2 + 3$ |
| Subtraction | "5 minus 2" | $5 - 2$ |
| Multiplication | "4 times 5" | $4 \times 5$ |
| Division | "10 divided by 2" | $10 \div 2$ |
| Negative number | "negative 5" | $-5$ |
| Multiple operations | "2 plus 3 minus 4 times 5" | $2 + 3 - 4 \times 5$ |

---

### **2. EXPONENTS & POWERS** ✅ FULLY WORKING
| Notation | Dictate | Renders |
|----------|---------|---------|
| Squared | "x squared" | $x^2$ |
| Cubed | "x cubed" | $x^3$ |
| To the power N | "x to the power 4" | $x^4$ |
| Negative power | "2 to the power negative 3" | $2^{-3}$ |
| Fractional power | "x to the power 1 over 2" | $x^{1/2}$ |

---

### **3. ROOTS** ✅ FULLY WORKING
| Notation | Dictate | Renders |
|----------|---------|---------|
| Square root | "square root of 9" | $\sqrt{9}$ |
| Cube root | "cube root of 8" | $\sqrt[3]{8}$ |
| nth root | "4 root of 81" | $\sqrt[4]{81}$ |
| **Root with fraction** | "square root of 29 over 2" | $\frac{\sqrt{29}}{2}$ ✅ FIXED |

---

### **4. FRACTIONS** ✅ FULLY WORKING (With Fix)
| Notation | Dictate | Renders |
|----------|---------|---------|
| Simple fraction | "3 over 4" | $\frac{3}{4}$ |
| Fraction with expression | "x plus 1 over x minus 1" | $\frac{x+1}{x-1}$ |
| Complex numerator | "square root of 5 over 3" | $\frac{\sqrt{5}}{3}$ |
| Compound fractions | "2 over 3 plus 1 over 4" | $\frac{2}{3} + \frac{1}{4}$ |

---

### **5. EQUATIONS** ✅ FULLY WORKING
| Notation | Dictate | Renders |
|----------|---------|---------|
| Simple equation | "x equals 5" | $x = 5$ |
| Multi-term equation | "2x plus 3 equals 11" | $2x + 3 = 11$ |
| Quadratic | "x squared plus 3x minus 5 equals 0" | $x^2 + 3x - 5 = 0$ |
| With fractions | "x over 2 equals 4" | $\frac{x}{2} = 4$ |

---

### **6. INTEGRATION** ✅ WORKING (With Flexible Syntax)
| Notation | Dictate | Renders |
|----------|---------|---------|
| Indefinite integral | "integral 2x plus 3 dx" | $\int (2x + 3) dx$ |
| Definite integral | "integral from 0 to 1 of x squared dx" | $\int_0^1 x^2 dx$ |
| Complex integrand | "integral x times e to the power x dx" | $\int x \cdot e^x dx$ |

---

### **7. SUMMATION** ✅ FULLY WORKING
| Notation | Dictate | Renders |
|----------|---------|---------|
| Basic sum | "sum from n equals 1 to 10 of n" | $\sum_{n=1}^{10} n$ |
| Sum of squares | "sum from n equals 1 to 5 of n squared" | $\sum_{n=1}^{5} n^2$ |
| General summation | "sum from i equals a to b of i squared" | $\sum_{i=a}^{b} i^2$ |

---

### **8. DERIVATIVES** ✅ FULLY WORKING
| Notation | Dictate | Renders |
|----------|---------|---------|
| Basic derivative | "d by dx of x squared" | $\frac{d}{dx}(x^2)$ |
| Composite | "d by dx of x cubed plus 2x" | $\frac{d}{dx}(x^3 + 2x)$ |

---

### **9. TRIGONOMETRIC FUNCTIONS** ✅ FULLY WORKING
| Notation | Dictate | Renders |
|----------|---------|---------|
| Sine | "sin of x" | $\sin(x)$ |
| Cosine | "cos of pi over 2" | $\cos(\frac{\pi}{2})$ |
| Tangent | "tan of x squared" | $\tan(x^2)$ |
| Arcsine | "arcsin of 1 over 2" | $\arcsin(1/2)$ |

---

### **10. LOGARITHMS** ✅ FULLY WORKING
| Notation | Dictate | Renders |
|----------|---------|---------|
| Natural log | "log of x" | $\ln(x)$ |
| Log base 10 | "log base 10 of 100" | $\log_{10}(100)$ |
| Log base 2 | "log base 2 of 8" | $\log_2(8)$ |

---

### **11. SPECIAL SYMBOLS** ✅ FULLY WORKING
| Notation | Dictate | Renders |
|----------|---------|---------|
| Infinity | "infinity" | $\infty$ |
| Plus or minus | "plus or minus 3" | $\pm 3$ |
| Subscript | "a sub 1" | $a_1$ |

---

### **12. COMBINATIONS (Complex Expressions)** ✅ FULLY WORKING
| Notation | Dictate | Renders |
|----------|---------|---------|
| Fraction of squares | "x squared over y squared" | $\frac{x^2}{y^2}$ |
| Root in fraction | "square root of 5 over 2" | $\frac{\sqrt{5}}{2}$ |
| Power in fraction | "2 to the power 3 over 5" | $\frac{2^3}{5}$ |
| Full equation | "x equals negative 3 plus square root of 29 over 2" | $x = \frac{-3+\sqrt{29}}{2}$ |
| With ± | "x equals negative 3 plus or minus square root of 29 over 2" | $x = \frac{-3 \pm \sqrt{29}}{2}$ |

---

## VOICE COMMANDS (For Control)

| Command | Purpose | Status |
|---------|---------|--------|
| "new step" | Create a new step | ✅ WORKS |
| "undo" | Undo last action | ✅ WORKS |
| "redo" | Redo last action | ✅ WORKS |

---

## QUICK REFERENCE: Common Exam Problems

### **Solving Linear Equations**
```
Step 1: "2x plus 3 equals 11"
Step 2: "new step"
Step 2: "2x equals 11 minus 3"
Step 3: "new step"
Step 3: "2x equals 8"
Step 4: "new step"
Step 4: "x equals 8 over 2 equals 4"
```

### **Solving Quadratic Equations** (UPDATED)
```
Step 1: "x squared minus 5x plus 6 equals 0"
Step 2: "new step"
Step 2: "x minus 2 times x minus 3 equals 0"
Step 3: "new step"
Step 3: "x equals 2 or x equals 3"
```

### **Using Quadratic Formula** (NEW - With new syntax)
```
Step 1: "x squared plus 3x minus 5 equals 0"
Step 2: "new step"
Step 2: "x equals negative 3 plus or minus square root of 29 over 2"
Step 3: "new step"
Step 3: "discriminant equals 9 plus 20 equals 29"
```

### **Calculus Problems**
```
Step 1: "integral 3x squared plus 2x plus 1 dx"
Step 2: "new step"
Step 2: "equals x cubed plus x squared plus x plus c"
```

---

## TIPS FOR BEST RESULTS

1. **Speak clearly** - Natural speech recognition works best
2. **Use correct keywords:**
   - **"plus"** for addition (not "add")
   - **"minus"** for subtraction (not "subtract")
   - **"times"** for multiplication (not "multiply")
   - **"over"** for fractions (not "divided by")
3. **For powers:** Say **"to the power"** (not "to the")
4. **For negatives:** Say **"negative [number]"** when starting a term
5. **For ±:** Say **"plus or minus"** as one phrase
6. **For roots:** Always say "square root of", "cube root of", etc.
7. **End of steps:** Clearly say **"new step"** to move to next step
8. **One expression per step** - Break complex problems into smaller steps

---

## RECENT FIXES & IMPROVEMENTS

✅ **Fixed in Latest Update:**
- Integral syntax now supports both "integral 2x dx" and "integral from 0 to 1 of x squared dx"
- "negative" keyword now properly creates unary minus
- "plus or minus" now renders as ± symbol
- "squad" automatically normalized to "squared" (STT variation)
- Fraction parsing ordered before root parsing to handle "√29 over 2" correctly

---

## KNOWN LIMITATIONS

⚠️ **Current Limitations:**
1. **Voice commands for reading** - "read steps", "read brief", "read detailed" don't work yet (use visual "Read" buttons instead)
2. **Complex nested operations** - May require breaking into multiple steps
3. **Some Greek letters** - Use spelled-out names (e.g., "pi", "alpha", "beta")
4. **STT accuracy** - Depends on clear speech; some words may be misrecognized

---

## SYSTEM CAPABILITIES

### ✅ **Fully Supported:**
- All basic arithmetic operations (+, −, ×, ÷)
- Powers and roots (including nested)
- Fractions with complex numerators/denominators
- Equations with multiple terms
- Integrals (with and without limits)
- Summations and products
- Derivatives
- Trigonometric functions
- Logarithms with custom bases
- Negative numbers and ± symbol

### ✅ **Voice Commands:**
- New step creation
- Undo/Redo operations
- Visual access to solutions

### ✅ **Output Formats:**
- LaTeX rendering
- Clear mathematical notation
- Step-by-step solutions
- Accessible display

---

## WORKING EXAMPLE

**Question:** Solve x² - 5x + 6 = 0

**Step 1:** Factor
- "x squared minus 5x plus 6 equals 0"

**Step 2:** Find factors
- "x minus 2 times x minus 3 equals 0"  
- "new step"

**Step 3:** Solve
- "x equals 2 or x equals 3"

---

## ALTERNATIVE EXAMPLE: Quadratic Formula

**Question:** Solve 2x² + 3x − 5 = 0

**Step 1:** Set up
- "2x squared plus 3x minus 5 equals 0"

**Step 2:** Apply formula
- "x equals negative 3 plus or minus square root of 29 over 2"
- "new step"

**Step 3:** Calculate discriminant
- "discriminant equals 9 plus 40 equals 49"
- "new step"

**Step 4:** Simplify
- "x equals negative 3 plus or minus 7 over 4"
- "new step"

**Step 5:** First solution
- "x equals negative 3 plus 7 over 4 equals 1"
- "new step"

**Step 6:** Second solution
- "x equals negative 3 minus 7 over 4 equals negative 2 point 5"

---

*This system supports comprehensive mathematics notation for blind and low-vision students using voice-based interaction. Recent updates have improved handling of negative numbers, ± symbols, and fraction-with-root combinations.*

### **Step 1: Identify the equation**
**Dictate:** "x squared plus 3x minus 5 equals 0"  
**Renders as:** x² + 3x - 5 = 0

---

### **Step 2: Apply Quadratic Formula**
**Dictate:** "x equals negative 3 plus or minus square root of 29 over 2"  
**Renders as:** x = (-3 ± √29)/2

---

### **Step 3: Calculate the discriminant**
**Dictate:** "b squared minus 4ac equals 3 squared minus 4 times 1 times negative 5"  
**Renders as:** b² - 4ac = 3² - 4(1)(-5)

---

### **Step 4: Simplify**
**Dictate:** "equals 9 plus 20 equals 29"  
**Renders as:** = 9 + 20 = 29

---

### **Step 5: Find solutions**
**Dictate:** "x equals negative 3 plus square root of 29 over 2 or x equals negative 3 minus square root of 29 over 2"  
**Renders as:** x = (-3 + √29)/2  or  x = (-3 - √29)/2

---

## All Supported Notations Reference

### **1. BASIC ARITHMETIC**
| Notation | Dictate | Renders |
|----------|---------|---------|
| Addition | "2 plus 3" | 2 + 3 |
| Subtraction | "5 minus 2" | 5 - 2 |
| Multiplication | "4 times 5" | 4 × 5 |
| Division | "10 divided by 2" | 10 ÷ 2 |

---

### **2. EXPONENTS & POWERS**
| Notation | Dictate | Renders |
|----------|---------|---------|
| Squared | "x squared" | x² |
| Cubed | "x cubed" | x³ |
| To the power N | "x to the power 4" | x⁴ |
| Negative power | "2 to the power negative 3" | 2⁻³ |
| Fractional power | "x to the power 1 over 2" | x^(1/2) |

---

### **3. ROOTS**
| Notation | Dictate | Renders |
|----------|---------|---------|
| Square root | "square root of 9" | √9 |
| Square root (shorthand) | "root of 16" | √16 |
| Cube root | "cube root of 8" | ∛8 |
| nth root | "4 root of 81" | ⁴√81 |
| Root with fraction | "square root of 29 over 2" | (√29)/2 |

---

### **4. FRACTIONS**
| Notation | Dictate | Renders |
|----------|---------|---------|
| Simple fraction | "3 over 4" | 3/4 |
| Fraction with expression | "x plus 1 over x minus 1" | (x+1)/(x-1) |
| Complex numerator | "square root of 5 over 3" | (√5)/3 |
| Compound | "2 over 3 plus 1 over 4" | 2/3 + 1/4 |

---

### **5. EQUATIONS**
| Notation | Dictate | Renders |
|----------|---------|---------|
| Simple equation | "x equals 5" | x = 5 |
| Multi-term equation | "2x plus 3 equals 11" | 2x + 3 = 11 |
| Quadratic | "x squared plus 3x minus 5 equals 0" | x² + 3x - 5 = 0 |
| With fractions | "x over 2 equals 4" | x/2 = 4 |

---

### **6. INTEGRATION**
| Notation | Dictate | Renders |
|----------|---------|---------|
| Indefinite integral | "integral 2x plus 3 dx" | ∫(2x + 3)dx |
| Definite integral | "integral from 0 to 1 of x squared dx" | ∫₀¹ x² dx |
| Complex integrand | "integral x times e to the power x dx" | ∫x·e^x dx |

---

### **7. SUMMATION**
| Notation | Dictate | Renders |
|----------|---------|---------|
| Basic sum | "sum from n equals 1 to 10 of n" | Σ(n=1 to 10) n |
| Sum of squares | "sum from n equals 1 to 5 of n squared" | Σ(n=1 to 5) n² |
| General summation | "sum from i equals a to b of i squared" | Σ(i=a to b) i² |

---

### **8. DERIVATIVES**
| Notation | Dictate | Renders |
|----------|---------|---------|
| Basic derivative | "d by dx of x squared" | d/dx(x²) |
| Composite | "d by dx of x cubed plus 2x" | d/dx(x³ + 2x) |

---

### **9. TRIGONOMETRIC FUNCTIONS**
| Notation | Dictate | Renders |
|----------|---------|---------|
| Sine | "sin of x" | sin(x) |
| Cosine | "cos of 30 degrees" | cos(30°) |
| Tangent | "tan of x squared" | tan(x²) |
| Arcsine | "arcsin of 1 over 2" | arcsin(1/2) |

---

### **10. LOGARITHMS**
| Notation | Dictate | Renders |
|----------|---------|---------|
| Natural log | "log of x" | ln(x) |
| Log base 10 | "log base 10 of 100" | log₁₀(100) |
| Log base 2 | "log base 2 of 8" | log₂(8) |

---

### **11. SPECIAL SYMBOLS**
| Notation | Dictate | Renders |
|----------|---------|---------|
| Infinity | "infinity" | ∞ |
| Subscript | "a sub 1" | a₁ |
| Greek letters | (Use the letter name) | α, β, γ, etc. |

---

### **12. COMBINATIONS (Complex Expressions)**
| Notation | Dictate | Renders |
|----------|---------|---------|
| Fraction of squares | "x squared over y squared" | x²/y² |
| Root in fraction | "square root of 5 over 2" | (√5)/2 |
| Power in fraction | "2 to the power 3 over 5" | 2³/5 |
| Full equation | "x equals negative 3 plus square root of 29 over 2" | x = (-3+√29)/2 |

---

## VOICE COMMANDS (For Control)

| Command | Purpose |
|---------|---------|
| "new step" | Create a new step |
| "undo" | Undo last action |
| "redo" | Redo last action |

---

## QUICK REFERENCE: Common Exam Problems

### **Solving Linear Equations**
```
Step 1: "2x plus 3 equals 11"
Step 2: "new step"
Step 2: "2x equals 11 minus 3"
Step 3: "new step"
Step 3: "2x equals 8"
Step 4: "new step"
Step 4: "x equals 8 over 2 equals 4"
```

### **Solving Quadratic Equations**
```
Step 1: "x squared minus 5x plus 6 equals 0"
Step 2: "new step"
Step 2: "x minus 2 times x minus 3 equals 0"
Step 3: "new step"
Step 3: "x equals 2 or x equals 3"
```

### **Calculus Problems**
```
Step 1: "integral 3x squared plus 2x plus 1 dx"
Step 2: "new step"
Step 2: "equals x cubed plus x squared plus x plus c"
```

---

## TIPS FOR BEST RESULTS

1. **Speak clearly** - STT works better with natural speech
2. **Use "plus" and "minus"** - Not just "add" or "subtract"
3. **Say "over"** - Not "divided by" for fractions
4. **For powers: say "to the power"** - Not "to the"
5. **Start new steps clearly** - Say "new step" to move to next step
6. **Use "times"** - Not "multiply" for multiplication

---

## KNOWN LIMITATIONS

- **"squad" is normalized to "squared"** - System auto-corrects this STT variation
- **Complex nested operations** - May require breaking into multiple steps
- **Some Greek letters** - Use the spelled-out names (e.g., "alpha", "beta")

---

## SYSTEM CAPABILITIES

✅ **Fully Supported:**
- All basic arithmetic operations
- Powers and roots (including nested)
- Fractions with complex numerators/denominators
- Equations with multiple terms
- Integrals (with and without limits)
- Summations and products
- Derivatives
- Trigonometric functions
- Logarithms with custom bases

✅ **Voice Commands:**
- New step creation
- Undo/Redo operations
- Visual readback of solutions

✅ **Output Formats:**
- LaTeX rendering
- Accessible MathML
- Clear mathematical notation
- Step-by-step solutions

---

## EXAMPLE COMPLETE ANSWER

**Question:** Solve the equation 2x² - 8x + 6 = 0

**Step 1:** Divide by 2
- "2x squared minus 8x plus 6 equals 0"
- "new step"

**Step 2:** Use quadratic formula
- "x equals 8 plus or minus square root of 64 minus 48 over 4"
- "new step"

**Step 3:** Simplify discriminant
- "x equals 8 plus or minus square root of 16 over 4"
- "new step"

**Step 4:** Evaluate square root
- "x equals 8 plus or minus 4 over 4"
- "new step"

**Step 5:** Find both solutions
- "x equals 8 plus 4 over 4 equals 12 over 4 equals 3"
- "new step"

**Step 6:** Second solution
- "x equals 8 minus 4 over 4 equals 4 over 4 equals 1"

---

*This system supports comprehensive mathematics notation for blind and low-vision students using voice-based interaction.*
