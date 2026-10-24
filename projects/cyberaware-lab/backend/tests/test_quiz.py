import json

from app.quiz import public_questions, score_attempt

QUIZ = json.dumps([
    {"prompt": "Is this a real email?", "choices": ["Yes", "No"], "correct": 1},
    {"prompt": "Should you enter your password?", "choices": ["Yes", "No"], "correct": 1},
])


def test_scoring_is_deterministic():
    assert score_attempt(QUIZ, [1, 1]) == (2, 2)
    assert score_attempt(QUIZ, [0, 1]) == (1, 2)
    assert score_attempt(QUIZ, []) == (0, 2)
    assert score_attempt("[]", [1]) == (0, 0)


def test_answer_keys_never_exposed():
    public = public_questions(QUIZ)
    assert all("correct" not in q for q in public)
    assert public[0]["choices"] == ["Yes", "No"]
