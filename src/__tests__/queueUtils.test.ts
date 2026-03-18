import { describe, it, expect } from 'vitest';
import { escapePS, escapeCmd, shortTitle } from '../utils/queueUtils.ts';

describe('escapePS', () => {
  it('returns empty string for empty input', () => {
    expect(escapePS('')).toBe('');
  });

  it('returns unchanged string when no single quotes', () => {
    expect(escapePS('hello world')).toBe('hello world');
  });

  it('escapes single quotes by doubling them', () => {
    expect(escapePS("it's")).toBe("it''s");
  });

  it('escapes multiple single quotes', () => {
    expect(escapePS("'a' 'b'")).toBe("''a'' ''b''");
  });

  it('does not affect double quotes', () => {
    expect(escapePS('say "hello"')).toBe('say "hello"');
  });

  it('replaces newlines with spaces', () => {
    expect(escapePS("line1\nline2")).toBe("line1 line2");
  });

  it('handles carriage return + newline', () => {
    expect(escapePS("line1\r\nline2")).toBe("line1 line2");
  });

  // Injection attack payloads — these document the CURRENT behavior of escapePS.
  // escapePS only escapes single quotes and newlines. All other dangerous
  // characters/operators pass through unescaped. Task 38 will address these gaps.
  describe('injection payloads (current behavior)', () => {
    it('backtick command execution passes through unescaped', () => {
      // In PowerShell, backticks are the escape character and `whoami` would execute
      const input = '`whoami`';
      expect(escapePS(input)).toBe('`whoami`');
    });

    it('PowerShell variable expansion passes through unescaped', () => {
      // $env:USERNAME would expand to the current user in PS
      const input = '$env:USERNAME';
      expect(escapePS(input)).toBe('$env:USERNAME');
    });

    it('subexpression operator passes through unescaped', () => {
      // $(Get-Process) would execute Get-Process in PS
      const input = '$(Get-Process)';
      expect(escapePS(input)).toBe('$(Get-Process)');
    });

    it('semicolon command chaining passes through unescaped', () => {
      // ; would allow chaining a second command
      const input = '; rm -rf /';
      expect(escapePS(input)).toBe('; rm -rf /');
    });

    it('pipeline passes through unescaped', () => {
      // | would pipe output to another command
      const input = '| Out-File hack.txt';
      expect(escapePS(input)).toBe('| Out-File hack.txt');
    });

    it('call operator passes through unescaped', () => {
      // & is the call operator in PS
      const input = '& calc.exe';
      expect(escapePS(input)).toBe('& calc.exe');
    });
  });
});

describe('escapeCmd', () => {
  it('returns empty string for empty input', () => {
    expect(escapeCmd('')).toBe('');
  });

  it('returns unchanged string when no double quotes', () => {
    expect(escapeCmd('hello world')).toBe('hello world');
  });

  it('escapes double quotes by doubling them', () => {
    expect(escapeCmd('say "hello"')).toBe('say ""hello""');
  });

  it('does not affect single quotes', () => {
    expect(escapeCmd("it's fine")).toBe("it's fine");
  });

  it('escapes percent signs', () => {
    expect(escapeCmd("100%")).toBe("100%%");
  });

  it('escapes percent signs in variable-like patterns', () => {
    expect(escapeCmd("%PATH%")).toBe("%%PATH%%");
  });

  it('replaces newlines with spaces', () => {
    expect(escapeCmd("line1\nline2")).toBe("line1 line2");
  });

  // Injection attack payloads — these document the CURRENT behavior of escapeCmd.
  // escapeCmd escapes double quotes, percent signs, and newlines. Other dangerous
  // characters/operators pass through unescaped. Task 38 will address these gaps.
  describe('injection payloads (current behavior)', () => {
    it('ampersand command chaining passes through unescaped', () => {
      // & chains commands in cmd.exe: foo & del *
      const input = 'foo & del *';
      expect(escapeCmd(input)).toBe('foo & del *');
    });

    it('pipe redirection passes through unescaped', () => {
      // | pipes output to another command
      const input = 'foo | net user';
      expect(escapeCmd(input)).toBe('foo | net user');
    });

    it('output redirect passes through unescaped', () => {
      // > redirects output to a file
      const input = 'foo > hack.txt';
      expect(escapeCmd(input)).toBe('foo > hack.txt');
    });

    it('caret escape passes through unescaped', () => {
      // ^ is the escape char in cmd; ^| would resolve to a literal pipe
      const input = 'foo ^| net user';
      expect(escapeCmd(input)).toBe('foo ^| net user');
    });

    it('percent variable is now escaped by escapeCmd', () => {
      // %USERPROFILE% would expand to an env variable in cmd — escapeCmd now handles this
      const input = '%USERPROFILE%';
      expect(escapeCmd(input)).toBe('%%USERPROFILE%%');
    });

    it('backtick in cmd context passes through unescaped', () => {
      // backticks have no special meaning in cmd, but test for completeness
      const input = 'foo `bar';
      expect(escapeCmd(input)).toBe('foo `bar');
    });
  });
});

describe('shortTitle', () => {
  it('returns first 2 significant words from basic name', () => {
    expect(shortTitle('Fix login button')).toBe('Fix login');
  });

  it('filters filler words', () => {
    expect(shortTitle('Add the login for my app')).toBe('Add login');
  });

  it('falls back to first 2 original words when all are filler', () => {
    expect(shortTitle('the a an')).toBe('the a');
  });

  it('returns the single word when only one significant word', () => {
    expect(shortTitle('Refactor')).toBe('Refactor');
  });

  it('returns empty string for empty input', () => {
    expect(shortTitle('')).toBe('');
  });

  it('takes first 2 significant words from a long name', () => {
    expect(shortTitle('Implement the new user authentication flow with OAuth')).toBe('Implement new');
  });
});
