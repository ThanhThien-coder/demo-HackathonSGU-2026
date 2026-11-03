export interface CodeLine {
  lineNumber: number;
  tokens: Array<{
    text: string;
    type?: "keyword" | "function" | "type" | "variable" | "string" | "punctuation" | "text";
  }>;
  isHighlighted?: boolean;
}

export interface LessonContext {
  repoName: string;
  repoBranch: string;
  filePath: string;
  scope: string;
  categoryTag: string;
  question: {
    tag: string;
    text: string;
    targetLine: number;
  };
  mockInitialAnswer: string;
  maxWords: number;
}
