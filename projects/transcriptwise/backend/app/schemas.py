from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

SectionKey = Literal[
    "overview",
    "takeaways",
    "notes",
    "concepts",
    "procedures",
    "evidence",
    "actions",
    "applications",
    "quotes",
    "limitations",
    "plan",
    "prerequisites",
    "research",
]
Provenance = Literal[
    "source_paraphrase",
    "source_claim",
    "direct_quote",
    "ai_explanation",
    "illustrative_example",
    "recommendation",
    "inferred_prerequisite",
    "user_note",
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    @field_validator("title", "display_name", "output_language", check_fields=False)
    @classmethod
    def nonempty_label(cls, value):
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("This field cannot contain only whitespace")
        return value


class Segment(StrictModel):
    id: str = Field(max_length=80)
    text: str = Field(min_length=1, max_length=12000)
    start: float | None = Field(None, ge=0)
    end: float | None = Field(None, ge=0)

    @model_validator(mode="after")
    def ordered_time(self):
        if self.start is not None and self.end is not None and self.end < self.start:
            raise ValueError("Segment end precedes its start")
        return self


class Detail(StrictModel):
    label: str = Field(min_length=1, max_length=100)
    text: str = Field(min_length=1, max_length=12000)


class LearningItem(StrictModel):
    id: str = Field(min_length=1, max_length=80)
    heading: str = Field(default="", max_length=240)
    body: str = Field(min_length=1, max_length=24000)
    provenance: Provenance = "source_paraphrase"
    refs: list[str] = Field(default_factory=list, max_length=100)
    details: list[Detail] = Field(default_factory=list, max_length=20)


class GuideSection(StrictModel):
    key: SectionKey
    title: str = Field(min_length=1, max_length=120)
    items: list[LearningItem] = Field(default_factory=list, max_length=300)


class QuizQuestion(StrictModel):
    id: str = Field(min_length=1, max_length=80)
    kind: Literal["multiple_choice", "true_false", "short_answer", "application"]
    question: str = Field(min_length=1, max_length=3000)
    options: list[str] = Field(default_factory=list, max_length=6)
    answer: str = Field(min_length=1, max_length=8000)
    explanation: str = Field(default="", max_length=8000)
    refs: list[str] = Field(default_factory=list, max_length=30)

    @model_validator(mode="after")
    def valid_choice(self):
        if self.kind == "multiple_choice" and (
            len(self.options) < 2 or self.answer not in self.options or len(set(self.options)) != len(self.options)
        ):
            raise ValueError("Multiple-choice answers must match one of the distinct options")
        if self.kind == "true_false" and self.answer not in ("True", "False"):
            raise ValueError("True/false answer must be True or False")
        return self


class Flashcard(StrictModel):
    id: str = Field(min_length=1, max_length=80)
    front: str = Field(min_length=1, max_length=2000)
    back: str = Field(min_length=1, max_length=8000)
    refs: list[str] = Field(default_factory=list, max_length=30)
    difficulty: Literal["easy", "medium", "hard"] = "medium"


class Guide(StrictModel):
    title: str = Field(min_length=1, max_length=240)
    sections: list[GuideSection] = Field(max_length=13)
    quiz: list[QuizQuestion] = Field(default_factory=list, max_length=150)
    flashcards: list[Flashcard] = Field(default_factory=list, max_length=150)
    notices: list[str] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def unique_keys(self):
        if len({s.key for s in self.sections}) != len(self.sections):
            raise ValueError("Duplicate section keys")
        for collection in ([i for s in self.sections for i in s.items], self.quiz, self.flashcards):
            ids = [i.id for i in collection]
            if len(ids) != len(set(ids)):
                raise ValueError("Duplicate item identifiers")
        return self


class AnalysisConfig(StrictModel):
    objective: Literal["general", "academic", "programming", "science", "research", "implementation", "professional", "exam", "content"] = (
        "general"
    )
    level: Literal["beginner", "intermediate", "advanced"] = "beginner"
    depth: Literal["quick", "standard", "comprehensive"] = "standard"
    output_language: str = Field(default="English", min_length=2, max_length=60)
    include_quiz: bool = True
    include_flashcards: bool = True
    include_exercises: bool = True
    include_limitations: bool = True
    instructions: str = Field(default="", max_length=2000)


class TextInput(StrictModel):
    text: str = Field(min_length=1, max_length=2_000_000)
    title: str = Field(default="Untitled transcript", min_length=1, max_length=240)
    language: str | None = Field(None, max_length=40)


class TranscriptEdit(StrictModel):
    version: int = Field(ge=1)
    segments: list[Segment] = Field(min_length=1, max_length=20000)
    title: str = Field(min_length=1, max_length=240)
    language: str | None = Field(None, max_length=40)


class AnalysisCreate(StrictModel):
    transcript_id: str
    config: AnalysisConfig = Field(default_factory=AnalysisConfig)


class AnalysisEdit(StrictModel):
    revision: int = Field(ge=1)
    title: str | None = Field(None, min_length=1, max_length=240)
    notes: str | None = Field(None, max_length=100000)
    is_saved: bool | None = None
    folder: str | None = Field(None, max_length=80)
    tags: list[str] | None = Field(None, max_length=20)
    section: GuideSection | None = None

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, values):
        if values is not None:
            return list(dict.fromkeys(v.strip()[:40] for v in values if v.strip()))
        return values


class RegenerateInput(StrictModel):
    revision: int = Field(ge=1)
    section: SectionKey | Literal["quiz", "flashcards"]
    level: Literal["beginner", "intermediate", "advanced"] | None = None


class URLInput(StrictModel):
    url: str = Field(min_length=8, max_length=500)
    language: str | None = Field(None, max_length=40)


class RegisterInput(StrictModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=10, max_length=128)
    display_name: str = Field(min_length=1, max_length=80)

    @field_validator("email")
    @classmethod
    def email_valid(cls, value):
        import re

        value = value.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Enter a valid email address")
        return value


class LoginInput(StrictModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)


class PreferencesInput(StrictModel):
    theme: Literal["light", "dark", "system"] | None = None
    level: Literal["beginner", "intermediate", "advanced"] | None = None
    depth: Literal["quick", "standard", "comprehensive"] | None = None
    output_language: str | None = Field(default=None, min_length=2, max_length=60)


class QuizSubmit(StrictModel):
    answers: dict[str, str] = Field(max_length=150)

    @field_validator("answers")
    @classmethod
    def sizes(cls, value):
        if any(len(k) > 80 or len(v) > 5000 for k, v in value.items()):
            raise ValueError("Answer is too long")
        return value


class ReviewInput(StrictModel):
    card_id: str = Field(max_length=80)
    rating: Literal["again", "hard", "easy"]


class DeleteAccountInput(StrictModel):
    password: str = Field(default="", max_length=128)
