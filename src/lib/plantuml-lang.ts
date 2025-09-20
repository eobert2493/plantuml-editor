import { LanguageSupport, StreamLanguage } from "@codemirror/language";
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