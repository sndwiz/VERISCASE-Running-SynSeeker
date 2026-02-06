export interface ParsedEntity {
  type: "mention" | "tag" | "task_ref" | "date_ref";
  value: string;
  startIndex: number;
  endIndex: number;
  display?: string;
}

export function parseMessageEntities(text: string): ParsedEntity[] {
  const entities: ParsedEntity[] = [];

  const mentionRegex = /@(\w+(?:\s+\w+)?)/g;
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    entities.push({
      type: "mention",
      value: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      display: `@${match[1]}`,
    });
  }

  const tagRegex = /#(\w+(?:-\w+)*)/g;
  while ((match = tagRegex.exec(text)) !== null) {
    entities.push({
      type: "tag",
      value: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      display: `#${match[1]}`,
    });
  }

  const taskRefRegex = /\bTASK-(\d+)\b/gi;
  while ((match = taskRefRegex.exec(text)) !== null) {
    entities.push({
      type: "task_ref",
      value: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      display: match[0],
    });
  }

  const datePatterns = [
    /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g,
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:,?\s*(\d{4}))?\b/gi,
    /\b(next|this)\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi,
    /\b(tomorrow|today)\b/gi,
    /\bby\s+(Friday|Monday|Tuesday|Wednesday|Thursday|Saturday|Sunday)\b/gi,
  ];

  for (const pattern of datePatterns) {
    while ((match = pattern.exec(text)) !== null) {
      const alreadyCovered = entities.some(e =>
        e.startIndex <= match!.index && e.endIndex >= match!.index + match![0].length
      );
      if (!alreadyCovered) {
        entities.push({
          type: "date_ref",
          value: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          display: match[0],
        });
      }
    }
  }

  entities.sort((a, b) => a.startIndex - b.startIndex);
  return entities;
}
