import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import pytest
from services.math_parser import MathParser

@pytest.fixture
def parser():
    return MathParser()

def test_blocks_injection(parser):
    result = parser.parse_and_solve("__import__('os').system('ls')")
    assert "error" in result
    assert "invalid" in result["error"].lower()

def test_numeric_expression(parser):
    assert parser.parse_and_solve("2 + 3 * 4")["result"] == 14.0

def test_symbolic_solve(parser):
    result = parser.parse_and_solve("x**2 - 4")
    solutions = result["result"]
    assert any(str(s) in ["-2", "2"] for s in solutions)

def test_tts_description(parser):
    desc = parser.tokenize_and_describe("2+3*4")
    assert "plus" in desc and "times" in desc

def test_expression_too_long(parser):
    result = parser.parse_and_solve("x + " * 200)
    assert "error" in result

def test_empty_expression(parser):
    assert "error" in parser.parse_and_solve("")
