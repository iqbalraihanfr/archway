/**
 * Detect potential duplicate tasks by title similarity.
 * Returns pairs of [taskA_index, taskB_index, similarity_score].
 */
export function detectDuplicateTasks(
  tasks: { title: string; source_item_id?: string }[],
): [number, number, number][] {
  const duplicates: [number, number, number][] = [];

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(
        /^(implement|create|setup|test|validate|handle|integrate with):?\s*/i,
        "",
      )
      .replace(/[^a-z0-9\s]/g, "")
      .trim();

  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      // Skip if same source
      if (
        tasks[i].source_item_id &&
        tasks[i].source_item_id === tasks[j].source_item_id
      )
        continue;

      const a = normalize(tasks[i].title);
      const b = normalize(tasks[j].title);
      if (!a || !b) continue;

      const similarity = computeSimilarity(a, b);
      if (similarity >= 0.6) {
        duplicates.push([i, j, Math.round(similarity * 100)]);
      }
    }
  }

  return duplicates;
}

/** Dice coefficient on bigrams for string similarity */
function computeSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigrams = (s: string) => {
    const set = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      set.set(bg, (set.get(bg) || 0) + 1);
    }
    return set;
  };

  const aBigrams = bigrams(a);
  const bBigrams = bigrams(b);
  let intersection = 0;

  for (const [bg, count] of aBigrams) {
    intersection += Math.min(count, bBigrams.get(bg) || 0);
  }

  const totalA = Array.from(aBigrams.values()).reduce((s, c) => s + c, 0);
  const totalB = Array.from(bBigrams.values()).reduce((s, c) => s + c, 0);

  return (2 * intersection) / (totalA + totalB);
}

/**
 * Maps MoSCoW priority string to a P0-P3 tier.
 */
export function mapPriorityToTier(priority: string): "P0" | "P1" | "P2" | "P3" {
  switch (priority?.toLowerCase()) {
    case "must":
      return "P0";
    case "should":
      return "P1";
    case "could":
      return "P2";
    case "wont":
      return "P3";
    default:
      return "P1";
  }
}

