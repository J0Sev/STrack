// v1 suggestion engine: plain rules, no ML. Each rule is a (condition, suggestion) pair.

const RULES = [
  {
    id: "caffeine",
    when: (c) => c.caffeineAfter2pm,
    suggestion: {
      title: "Cut caffeine off earlier",
      detail:
        "Caffeine has a 5-6 hour half-life, so an afternoon coffee can still be in your system at bedtime. Try stopping by 2pm and see if it helps.",
      category: "diet",
    },
  },
  {
    id: "screen-time",
    when: (c) => (c.screenTimeBeforeBedMinutes ?? 0) >= 20,
    suggestion: {
      title: "Wind down screen-free",
      detail:
        "Screens before bed suppress melatonin via blue light and keep your mind active. Try a 20-30 minute screen-free buffer before lights out.",
      category: "routine",
    },
  },
  {
    id: "alcohol",
    when: (c) => c.alcohol,
    suggestion: {
      title: "Watch late alcohol",
      detail:
        "Alcohol can help you fall asleep but fragments sleep later in the night, especially REM. Try moving your last drink earlier in the evening.",
      category: "diet",
    },
  },
  {
    id: "no-exercise",
    when: (c) => !c.exercisedToday,
    suggestion: {
      title: "Get some movement in",
      detail:
        "Regular activity — even a walk — is linked to falling asleep faster and sleeping more deeply. Try fitting in movement earlier in the day.",
      category: "routine",
    },
  },
  {
    id: "high-stress",
    when: (c) => (c.stressLevel ?? 0) >= 4,
    suggestion: {
      title: "Try a wind-down practice",
      detail:
        "High stress before bed keeps cortisol elevated. A short breathing exercise, journaling, or light stretching can help signal to your body it's time to rest.",
      category: "environment",
    },
  },
  {
    id: "magnesium-fallback",
    when: () => true, // always included as a general baseline suggestion
    suggestion: {
      title: "Consider a magnesium-rich evening snack",
      detail:
        "Magnesium supports muscle relaxation and melatonin regulation. A small evening snack (almonds, banana) or a supplement (check with a doctor first) is worth trying if nothing else stands out.",
      category: "diet",
    },
  },
];

/**
 * @param {object} checkIn - CheckIn payload from the client
 * @returns {Array<{id: string, title: string, detail: string, category: string}>}
 */
export function generateSuggestions(checkIn) {
  return RULES.filter((rule) => rule.when(checkIn)).map((rule) => ({
    id: rule.id,
    ...rule.suggestion,
  }));
}
