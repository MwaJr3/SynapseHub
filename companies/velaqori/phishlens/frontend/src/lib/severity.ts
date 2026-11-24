/** Plain-language meaning of each severity. These are heuristic warnings, not verdicts. */
export const SEVERITY_MEANING: Record<string, string> = {
  high: "Strong phishing indicators matched. Treat as suspicious until a person has reviewed it.",
  medium: "Some indicators matched that are often seen in phishing but also in legitimate mail.",
  low: "Weak indicators only. Worth a glance, usually not alarming on its own.",
  informational: "A note about the message that is not a warning by itself.",
}
