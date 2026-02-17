export const GOALS = [
  { value: "moving", label: "Moving", sub: "Pack + decide what comes" },
  { value: "prepping_to_downsize", label: "Prepping to downsize", sub: "Right-size for next chapter" },
  { value: "reset", label: "Reset", sub: "Calm + functional refresh" },
  { value: "staging", label: "Staging", sub: "Make it show-ready" },
  { value: "caregiving", label: "Caregiving", sub: "Make care easier" },
  { value: "other", label: "Other", sub: "Something else" },
] as const;

export const FEELINGS = [
  { value: "overwhelmed", label: "Overwhelmed", sub: "Too much to hold" },
  { value: "excited", label: "Excited", sub: "Ready to begin" },
  { value: "sad", label: "Sad", sub: "Tender transition" },
  { value: "motivated", label: "Motivated", sub: "Let's make progress" },
  { value: "other", label: "Other", sub: "Mixed / unsure" },
] as const;

export const ALLOWED_GOAL_VALUES = GOALS.map((g) => g.value) as readonly string[];
export const ALLOWED_FEELING_VALUES = FEELINGS.map((f) => f.value) as readonly string[];

export const WELCOME_MESSAGE =
  "Hi — I'm your Life Caddie.\n\nUpload a photo and tap the two options. I'll give you a gentle first-step plan that matches your goal and how you're feeling.";
