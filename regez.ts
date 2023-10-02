// NOTE: I will probaly not continue with this idea, but it was fun to create a few of the simpler RegExp methods and learn how to create a functional chaining utility. Also, I learnt a ton about RegExp's!

// TS Helpers
function arrayIncludes<T>(array: readonly T[], x: any): x is T {
  return array.includes(x);
}

// General
type UnknownString = string;
type RegExString = string;

// Metadata
type Metadata = {
  inSet: boolean;
};

// REGEX COMMON PATTERN
const REGEX_COMMON_PATTERNS = {
  EMAIL: () => new RegExp(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g),
} as const;

type RegexCommonPatternName = keyof typeof REGEX_COMMON_PATTERNS;

const regexCommonPattern = {
  getCommonPatternRegex: (patternName: RegexCommonPatternName) => {
    return REGEX_COMMON_PATTERNS[patternName]();
  },
} as const;

// REGEX NEGATED
const regexNegated = {
  isNegated: (negated: boolean | undefined) => {
    return !!negated;
  },
  getNegatedRegex: (shouldNegate: boolean) => {
    return shouldNegate ? "^" : "";
  },
} as const;

// REGEX QUANTIFIER
const REGEX_QUANTIFIERS = {
  ZERO_OR_MORE: ({ isLazy }: { isLazy?: boolean }) =>
    `*${regexQuantifier.getLazyQuantifierRegex(isLazy)}`,
  ONE_OR_MORE: ({ isLazy }: { isLazy?: boolean }) =>
    `+${regexQuantifier.getLazyQuantifierRegex(isLazy)}`,
  ZERO_OR_ONE: ({ isLazy }: { isLazy?: boolean }) =>
    `?${regexQuantifier.getLazyQuantifierRegex(isLazy)}`,
  SPECIFIED: (
    {
      startQuantity,
      endQuantity,
    }: {
      startQuantity: number;
      endQuantity?: number | "Infinity";
    },
    { isLazy }: { isLazy?: boolean }
  ) => {
    const isEndQuantity = endQuantity != null;
    const isEndQuantityInfinity = endQuantity === "Infinity";

    return `{${startQuantity}${
      isEndQuantity ? (isEndQuantityInfinity ? "," : `,${endQuantity}`) : ""
    }}${regexQuantifier.getLazyQuantifierRegex(isLazy)}`;
  },
} as const;

type QuantifierType = keyof typeof REGEX_QUANTIFIERS;
type DefaultQuanitiferOptions = {
  isLazy?: boolean;
};
type StandardQuanitiferOptions = {
  type: Exclude<QuantifierType, "SPECIFIED">;
};
type SpecifiedQuanitiferOption = {
  type: Extract<QuantifierType, "SPECIFIED">;
  startQuantity: number;
  endQuantity?: number | "Infinity";
};
type QuanitiferOptions = DefaultQuanitiferOptions &
  (StandardQuanitiferOptions | SpecifiedQuanitiferOption);

const regexQuantifier = {
  getLazyQuantifierRegex: (isLazy: boolean = false) => {
    return isLazy ? "?" : "";
  },
  getQuantifierRegex: (quantifier?: QuanitiferOptions) => {
    if (quantifier == null) return "";

    if (quantifier.type === "SPECIFIED") {
      return REGEX_QUANTIFIERS[quantifier.type](
        {
          startQuantity: quantifier.startQuantity,
          endQuantity: quantifier.endQuantity,
        },
        { isLazy: quantifier.isLazy }
      );
    }

    return REGEX_QUANTIFIERS[quantifier.type]({
      isLazy: quantifier.isLazy,
    });
  },
} as const;

// REGEX PRESET
const REGEX_PRESETS = {
  ANY: ({ inSet = false }: { inSet?: Metadata["inSet"] } = {}) => {
    const anyRegex = "\\s\\S";
    return inSet ? anyRegex : `[${anyRegex}]`;
  },
  ANY_EXCEPT_LINEBREAKS: () => ".",
  ALPHANUMERIC_AND_UNDERSCORE: () => "\\w",
  NOT_ALPHANUMERIC_AND_UNDERSCORE: () => "\\W",
  NUMERIC: () => "\\d",
  NOT_NUMERIC: () => "\\D",
  WHITESPACE: () => "\\s",
  NOT_WHITESPACE: () => "\\S",
} as const;

type RegexPreset = keyof typeof REGEX_PRESETS;
type GetPresetRegexOptions = {
  inSet?: Metadata["inSet"];
};

const regexPreset = {
  isPresetName: (string: UnknownString): string is RegexPreset => {
    return string in REGEX_PRESETS;
  },
  getPresetRegex: (
    presetName: RegexPreset,
    { inSet = false }: GetPresetRegexOptions = {}
  ) => {
    return REGEX_PRESETS[presetName]({ inSet });
  },
};

// REGEX ESCAPE
// prettier-ignore
const REGEX_ESCAPE_CHARS = ['\\', '.', '^', '$', '*', '+', '?', '(', ')', '[', ']', '{', '|', '-'] as const

type RegexEscapeChar = (typeof REGEX_ESCAPE_CHARS)[number];

const regexEscape = {
  shouldEscape: (
    string: RegexEscapeChar | UnknownString
  ): string is RegexEscapeChar => {
    return arrayIncludes(REGEX_ESCAPE_CHARS, string);
  },
  getEscapedRegex: (string: UnknownString) => {
    return `\\${string}`;
  },
} as const;

// REGEZ
class Regez {
  private regex: string = "";

  private appendToRegex(regexToAppend: RegExString) {
    this.regex = `${this.regex}${regexToAppend}`;
  }

  public set(
    chars: (RegexPreset | (string & {}))[],
    {
      negated,
      quantifier,
    }: { negated?: boolean; quantifier?: QuanitiferOptions } = {}
  ) {
    const parsedChars = chars.map((char) => {
      const isPresetName = regexPreset.isPresetName(char);
      if (isPresetName) {
        return regexPreset.getPresetRegex(char, { inSet: true });
      }

      const shouldEscape = regexEscape.shouldEscape(char);
      if (shouldEscape) {
        return regexEscape.getEscapedRegex(char);
      }

      return char;
    });

    const isNegated = regexNegated.isNegated(negated);

    this.appendToRegex(
      `[${regexNegated.getNegatedRegex(isNegated)}${parsedChars.join(
        ""
      )}]${regexQuantifier.getQuantifierRegex(quantifier)}`
    );

    return this;
  }

  public range(
    startChar: string,
    endChar: string,
    {
      negated,
      quantifier,
    }: { negated?: boolean; quantifier?: QuanitiferOptions } = {}
  ) {
    const isNegated = regexNegated.isNegated(negated);

    this.appendToRegex(
      `[${regexNegated.getNegatedRegex(
        isNegated
      )}${startChar}-${endChar}]${regexQuantifier.getQuantifierRegex(
        quantifier
      )}`
    );

    return this;
  }

  public preset(
    presetName: RegexPreset,
    { quantifier }: { quantifier?: QuanitiferOptions } = {}
  ) {
    const presetRegex = regexPreset.getPresetRegex(presetName);

    this.appendToRegex(
      `${presetRegex}${regexQuantifier.getQuantifierRegex(quantifier)}`
    );

    return this;
  }

  public toString() {
    return this.regex;
  }

  public toRegex() {
    return new RegExp(this.regex);
  }

  public common(patternName: RegexCommonPatternName) {
    return regexCommonPattern.getCommonPatternRegex(patternName);
  }
}

function r() {
  return new Regez();
}

// TESTING
const regex = r()
  .set(["ANY", "B", "C"], {
    negated: true,
    quantifier: {
      type: "ONE_OR_MORE",
    },
  })
  .range("0", "9", {
    quantifier: {
      type: "SPECIFIED",
      startQuantity: 1,
      endQuantity: "Infinity",
      isLazy: true,
    },
  })
  .toRegex();

const regex2 = r().common("EMAIL");

console.log(regex);
console.log(regex2);
//
