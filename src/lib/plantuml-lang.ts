import { LanguageSupport, StreamLanguage } from "@codemirror/language";
import { Completion, CompletionContext } from "@codemirror/autocomplete";
import { tags } from "@lezer/highlight";

interface PlantUMLState {
  inBlockComment?: boolean;
}

// PlantUML syntax highlighting for CodeMirror
const plantumlLanguage = StreamLanguage.define({
  token(stream, state: PlantUMLState) {
    // Comments
    if (stream.match(/^'/)) {
      stream.skipToEnd();
      return "comment";
    }

    // Block comments
    if (stream.match(/^\/'/)) {
      state.inBlockComment = true;
      return "comment";
    }
    if (state.inBlockComment) {
      if (stream.match(/^'\/$/)) {
        state.inBlockComment = false;
      } else {
        stream.next();
      }
      return "comment";
    }

    // Start/End tags
    if (stream.match(/^@(start|end)\w+/)) {
      return "keyword";
    }

    // Keywords
    if (stream.match(/^(title|participant|actor|boundary|control|entity|database|collections|queue|note|box|group|alt|else|opt|loop|par|break|critical|activate|deactivate|destroy|create|hide|show|skin|skinparam|scale|rotate|left|right|top|bottom|over|of|on|as|class|interface|abstract|enum|annotation|package|namespace|stereotype|extends|implements|composition|aggregation|association|dependency|use|include|exclude|autonumber|newpage|page|header|footer|legend|center|end|title|caption|state|choice|fork|join|history|concurrent|split|partition|swimlane|if|then|else|elseif|endif|while|endwhile|repeat|until|for|endfor|return)/)) {
      return "keyword";
    }

    // Arrows and connectors
    if (stream.match(/^(-+>|<-+|\.+>|<\.+|\|+>|<\|+|o+>|<o+|\*+>|<\*+|\\+>|<\\+|\/+>|<\/+)/)) {
      return "operator";
    }

    // Special symbols
    if (stream.match(/^[:|;,{}()\[\]]/)) {
      return "punctuation";
    }

    // String literals
    if (stream.match(/^"([^"\\]|\\.)*"/)) {
      return "string";
    }

    // Numbers
    if (stream.match(/^[0-9]+/)) {
      return "number";
    }

    // Stereotypes
    if (stream.match(/^<<[^>]*>>/)) {
      return "meta";
    }

    // Colors
    if (stream.match(/^#[0-9a-fA-F]{6}/)) {
      return "string";
    }

    // Skip whitespace
    if (stream.eatSpace()) {
      return null;
    }

    // Default - consume one character
    stream.next();
    return null;
  }
});

// Create the language support with syntax highlighting
export const plantuml = () => new LanguageSupport(plantumlLanguage);

// Theme mapping for highlighting
export const plantumlHighlightStyle = [
  { tag: tags.comment, color: "var(--editor-comment)" },
  { tag: tags.keyword, color: "var(--editor-keyword)" },
  { tag: tags.string, color: "var(--editor-string)" },
  { tag: tags.number, color: "var(--editor-number)" },
  { tag: tags.operator, color: "var(--editor-keyword)" },
  { tag: tags.punctuation, color: "var(--editor-text)" },
  { tag: tags.meta, color: "var(--editor-string)" },
];

// IntelliSense / auto-completions for PlantUML
const KEYWORDS = [
  "@startuml", "@enduml", "title", "participant", "actor", "boundary", "control", "entity", "database",
  "collections", "queue", "skinparam", "autonumber", "box", "end box", "note", "legend",
  "activate", "deactivate", "create", "destroy", "alt", "else", "opt", "loop", "par", "break",
  "critical", "group", "end", "return", "hide", "show", "newpage"
];

const SNIPPETS: Array<Completion> = [
  { label: "@startuml…@enduml", type: "keyword", detail: "Diagram block", apply: "@startuml\n$1\n@enduml" },
  { label: "participant", type: "keyword", apply: "participant \"${1:Name}\" as ${2:Alias}" },
  { label: "actor", type: "keyword", apply: "actor \"${1:User}\" as ${2:U}" },
  { label: "box", type: "keyword", apply: "box ${1:Name}\n$2\nend box" },
  { label: "note over", type: "keyword", apply: "note over ${1:A},${2:B}: ${3:Text}" },
  { label: "autonumber", type: "keyword", apply: "autonumber ${1:000}" },
  { label: "alt / else / end", type: "keyword", apply: "alt ${1:Condition}\n  $2\nelse ${3:Otherwise}\n  $4\nend" },
  { label: "loop", type: "keyword", apply: "loop ${1:Label}\n  $2\nend" },
  { label: "par", type: "keyword", apply: "par ${1:Label}\n  $2\nend" },
  { label: "title", type: "keyword", apply: "title ${1:Title}" },
];

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function plantumlCompletionSource() {
  return (context: CompletionContext) => {
    const word = context.matchBefore(/[#\w.<>\-]+$/);
    if (!word && !context.explicit) return null;

    const doc = context.state.doc.toString();
    // Extract defined aliases and names for participants/actors
    const participantRegex = /^(participant|actor|boundary|control|entity|database|collections|queue)\s+\"?([^\"\n]+?)\"?\s+(?:as\s+)?([A-Za-z0-9_]+)?/gmi;
    const aliases: string[] = [];
    const names: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = participantRegex.exec(doc)) !== null) {
      const name = (m[2] || '').trim();
      const alias = (m[3] || '').trim();
      if (name) names.push(name);
      if (alias) aliases.push(alias);
    }

    // Section markers for quick insert
    const sections = Array.from(doc.matchAll(/^==\s*([^=].*?)\s*==/gmi)).map(s => s[1]);

    const dynamicCompletions: Array<Completion> = [
      ...unique(aliases).map(a => ({ label: a, type: "variable", detail: "alias" })),
      ...unique(names).map(n => ({ label: n, type: "text", detail: "name" })),
      ...unique(sections).map(s => ({ label: `== ${s} ==`, type: "keyword", detail: "section" })),
    ];

    const keywordCompletions: Array<Completion> = KEYWORDS.map(k => ({ label: k, type: "keyword" }));

    const options: Array<Completion> = [
      ...SNIPPETS,
      ...keywordCompletions,
      { label: "->", type: "operator", detail: "message" },
      { label: "-->", type: "operator", detail: "async message" },
      { label: "<-", type: "operator", detail: "reply" },
      { label: "..>", type: "operator", detail: "dotted" },
      { label: "<..", type: "operator", detail: "dotted" },
      ...dynamicCompletions,
    ];

    return {
      from: word ? word.from : context.pos,
      options,
      filter: true,
    };
  };
}