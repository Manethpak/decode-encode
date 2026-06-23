import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  caseConvert,
  countText,
  escapeHtml,
  evaluateJsonPath,
  formatDateSummary,
  generateSlug,
  minifyJson,
  parseColorInput,
  prettyJson,
  rgbToHex,
  rgbToHsl,
  testContrast,
  unescapeHtml,
  unicodeEscape,
  unicodeUnescape,
} from './tools/utilities';

type ToolId = 'base64' | 'jwt' | 'text' | 'encoding' | 'json' | 'crypto' | 'time' | 'color' | 'regex';

type Tool = {
  id: ToolId;
  name: string;
  description: string;
};

const tools: Tool[] = [
  { id: 'base64', name: 'Base64', description: 'Encode and decode UTF-8 text with Base64.' },
  { id: 'jwt', name: 'JWT inspect', description: 'Decode JWT header and payload without verification.' },
  { id: 'text', name: 'Text utilities', description: 'Convert case, generate slugs, and count text.' },
  { id: 'encoding', name: 'Encoding utilities', description: 'URL, HTML entity, and Unicode escaping.' },
  { id: 'json', name: 'JSON utilities', description: 'Format, minify, and query JSON paths.' },
  { id: 'crypto', name: 'Crypto utilities', description: 'Hash text and generate UUIDs locally.' },
  { id: 'time', name: 'Time utilities', description: 'Convert Unix timestamps and format dates.' },
  { id: 'color', name: 'Color utilities', description: 'Convert HEX/RGB/HSL and check contrast.' },
  { id: 'regex', name: 'Regex tester', description: 'Test JavaScript regular expressions.' },
];

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToText(value: string) {
  const binary = atob(value.trim());
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return textDecoder.decode(bytes);
}

function base64UrlToJson(part: string) {
  const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return JSON.stringify(JSON.parse(base64ToText(padded)), null, 2);
}

function copyText(value: string) {
  if (!value) return;
  void navigator.clipboard?.writeText(value);
}

function ToolPanel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">Browser-only tool</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">{title}</h2>
        <p className="mt-2 text-slate-600">{description}</p>
        <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">Privacy note: your input never leaves the browser.</p>
      </div>
      {children}
    </section>
  );
}

function TextArea({ value, onChange, placeholder, minHeight = 'min-h-48' }: { value: string; onChange?: (value: string) => void; placeholder?: string; minHeight?: string }) {
  return (
    <textarea
      className={`${minHeight} w-full rounded-2xl border border-slate-300 bg-slate-50 p-4 font-mono text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100`}
      placeholder={placeholder}
      readOnly={!onChange}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <input className="w-full rounded-2xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />;
}

function OutputBlock({ value }: { value: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-slate-700">Output</label>
        <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700" onClick={() => copyText(value)} type="button">
          Copy
        </button>
      </div>
      <TextArea value={value} />
    </div>
  );
}

function Base64Tool() {
  const [input, setInput] = useState('Hello, local-first tools!');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const output = useMemo(() => {
    try {
      return mode === 'encode' ? bytesToBase64(textEncoder.encode(input)) : base64ToText(input);
    } catch (error) {
      return `Unable to ${mode}: ${(error as Error).message}`;
    }
  }, [input, mode]);

  return (
    <ToolPanel title="Base64 encode/decode" description="Convert text to Base64 and back using browser-native encoding APIs.">
      <ModeButtons modes={[[ 'encode', 'Encode' ], [ 'decode', 'Decode' ]]} selected={mode} onSelect={(value) => setMode(value as 'encode' | 'decode')} />
      <ToolGrid input={input} output={output} onInput={setInput} placeholder="Enter text or Base64..." />
    </ToolPanel>
  );
}

function JwtTool() {
  const [input, setInput] = useState('');
  const output = useMemo(() => {
    if (!input.trim()) return 'Paste a JWT to inspect its header and payload.';
    const parts = input.trim().split('.');
    if (parts.length < 2) return 'JWTs should contain at least a header and payload separated by dots.';
    try {
      return `Header\n${base64UrlToJson(parts[0])}\n\nPayload\n${base64UrlToJson(parts[1])}\n\nSignature\n${parts[2] ? 'Present (not verified)' : 'Missing'}`;
    } catch (error) {
      return `Unable to decode JWT: ${(error as Error).message}`;
    }
  }, [input]);

  return (
    <ToolPanel title="JWT decode/inspect" description="Inspect JWT headers and payloads locally. This does not verify signatures or contact an API.">
      <ToolGrid input={input} output={output} onInput={setInput} placeholder="Paste a JWT..." />
    </ToolPanel>
  );
}

function TextTool() {
  const [input, setInput] = useState('Hello, Local Browser Utilities!');
  const [mode, setMode] = useState<'camel' | 'pascal' | 'snake' | 'kebab' | 'upper' | 'lower' | 'title' | 'slug' | 'count'>('slug');
  const output = useMemo(() => {
    if (mode === 'slug') return generateSlug(input);
    if (mode === 'count') return countText(input);
    return caseConvert(input, mode);
  }, [input, mode]);
  return (
    <ToolPanel title="Text utilities" description="Convert text casing, generate URL-friendly slugs, and count characters, words, bytes, and lines.">
      <ModeButtons modes={[[ 'slug', 'Slug' ], [ 'camel', 'camelCase' ], [ 'pascal', 'PascalCase' ], [ 'snake', 'snake_case' ], [ 'kebab', 'kebab-case' ], [ 'upper', 'UPPER' ], [ 'lower', 'lower' ], [ 'title', 'Title Case' ], [ 'count', 'Count' ]]} selected={mode} onSelect={(value) => setMode(value as typeof mode)} />
      <ToolGrid input={input} output={output} onInput={setInput} placeholder="Enter text..." />
    </ToolPanel>
  );
}

function EncodingTool() {
  const [input, setInput] = useState('<p>Hello world & friends</p>');
  const [mode, setMode] = useState<'urlEncode' | 'urlDecode' | 'htmlEscape' | 'htmlUnescape' | 'unicodeEscape' | 'unicodeUnescape'>('htmlEscape');
  const output = useMemo(() => {
    try {
      if (mode === 'urlEncode') return encodeURIComponent(input);
      if (mode === 'urlDecode') return decodeURIComponent(input);
      if (mode === 'htmlEscape') return escapeHtml(input);
      if (mode === 'htmlUnescape') return unescapeHtml(input);
      if (mode === 'unicodeEscape') return unicodeEscape(input);
      return unicodeUnescape(input);
    } catch (error) {
      return `Unable to transform input: ${(error as Error).message}`;
    }
  }, [input, mode]);
  return (
    <ToolPanel title="Encoding utilities" description="Encode and decode URL components, HTML entities, and Unicode escape sequences.">
      <ModeButtons modes={[[ 'urlEncode', 'URL encode' ], [ 'urlDecode', 'URL decode' ], [ 'htmlEscape', 'HTML escape' ], [ 'htmlUnescape', 'HTML unescape' ], [ 'unicodeEscape', 'Unicode escape' ], [ 'unicodeUnescape', 'Unicode unescape' ]]} selected={mode} onSelect={(value) => setMode(value as typeof mode)} />
      <ToolGrid input={input} output={output} onInput={setInput} placeholder="Enter encoded or plain text..." />
    </ToolPanel>
  );
}

function JsonTool() {
  const [input, setInput] = useState('{"message":"Hello","items":[{"name":"alpha"}]}');
  const [path, setPath] = useState('$.items[0].name');
  const [mode, setMode] = useState<'format' | 'minify' | 'path'>('format');
  const output = useMemo(() => {
    try {
      if (mode === 'minify') return minifyJson(input);
      if (mode === 'path') return evaluateJsonPath(input, path);
      return prettyJson(input);
    } catch (error) {
      return `Invalid JSON: ${(error as Error).message}`;
    }
  }, [input, mode, path]);

  return (
    <ToolPanel title="JSON formatter/minifier and path lookup" description="Parse JSON locally, then pretty-print, compact, or query simple paths like $.user.name or $.items[0].id.">
      <ModeButtons modes={[[ 'format', 'Format' ], [ 'minify', 'Minify' ], [ 'path', 'Path lookup' ]]} selected={mode} onSelect={(value) => setMode(value as typeof mode)} />
      {mode === 'path' && <div className="mb-4"><label className="mb-2 block text-sm font-semibold text-slate-700">JSON path</label><TextInput value={path} onChange={setPath} placeholder="$.items[0].name" /></div>}
      <ToolGrid input={input} output={output} onInput={setInput} placeholder="Paste JSON..." />
    </ToolPanel>
  );
}

function CryptoTool() {
  const [input, setInput] = useState('Hash this locally');
  const [algorithm, setAlgorithm] = useState<'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'>('SHA-256');
  const [output, setOutput] = useState('Click Generate hash or Generate UUID.');

  async function generateHash() {
    const digest = await crypto.subtle.digest(algorithm, textEncoder.encode(input));
    setOutput(Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(''));
  }

  return (
    <ToolPanel title="Crypto utilities" description="Generate SHA digests with window.crypto.subtle and UUIDs with crypto.randomUUID().">
      <ModeButtons modes={[[ 'SHA-1', 'SHA-1' ], [ 'SHA-256', 'SHA-256' ], [ 'SHA-384', 'SHA-384' ], [ 'SHA-512', 'SHA-512' ]]} selected={algorithm} onSelect={(value) => setAlgorithm(value as typeof algorithm)} />
      <div className="mb-4 flex flex-wrap gap-2"><button className="rounded-full bg-cyan-600 px-5 py-2 text-sm font-bold text-white hover:bg-cyan-700" onClick={() => void generateHash()} type="button">Generate hash</button><button className="rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white hover:bg-slate-700" onClick={() => setOutput(crypto.randomUUID())} type="button">Generate UUID</button></div>
      <ToolGrid input={input} output={output} onInput={setInput} placeholder="Enter text to hash..." />
    </ToolPanel>
  );
}

function TimeTool() {
  const [input, setInput] = useState(String(Math.floor(Date.now() / 1000)));
  const [mode, setMode] = useState<'unix' | 'iso'>('unix');
  const output = useMemo(() => formatDateSummary(input, mode), [input, mode]);
  return (
    <ToolPanel title="Time utilities" description="Convert Unix timestamps in seconds or milliseconds, and format ISO/local dates.">
      <ModeButtons modes={[[ 'unix', 'Unix timestamp' ], [ 'iso', 'ISO/date text' ]]} selected={mode} onSelect={(value) => setMode(value as typeof mode)} />
      <ToolGrid input={input} output={output} onInput={setInput} placeholder="Enter timestamp or date..." />
    </ToolPanel>
  );
}

function ColorTool() {
  const [primary, setPrimary] = useState('#0f172a');
  const [secondary, setSecondary] = useState('#ffffff');
  const output = useMemo(() => {
    const color = parseColorInput(primary);
    const contrast = testContrast(primary, secondary);
    if (!color) return 'Enter a HEX (#0f172a), RGB (rgb(15, 23, 42)), or HSL (hsl(222, 47%, 11%)) color.';
    const hsl = rgbToHsl(color.r, color.g, color.b);
    return [`HEX: ${rgbToHex(color.r, color.g, color.b)}`, `RGB: rgb(${color.r}, ${color.g}, ${color.b})`, `HSL: hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, '', contrast].join('\n');
  }, [primary, secondary]);
  return (
    <ToolPanel title="Color utilities" description="Convert between HEX, RGB, and HSL, then check WCAG contrast between two colors.">
      <div className="mb-4 grid gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-semibold text-slate-700">Color to convert</label><TextInput value={primary} onChange={setPrimary} /></div><div><label className="mb-2 block text-sm font-semibold text-slate-700">Contrast color</label><TextInput value={secondary} onChange={setSecondary} /></div></div>
      <OutputBlock value={output} />
    </ToolPanel>
  );
}

function RegexTool() {
  const [pattern, setPattern] = useState('\\b\\w{5}\\b');
  const [flags, setFlags] = useState('gi');
  const [input, setInput] = useState('These local tools test regex matches in your browser.');
  const output = useMemo(() => {
    try {
      const regex = new RegExp(pattern, flags);
      const matcher = regex.global ? regex : new RegExp(regex.source, `${regex.flags}g`);
      const matches: RegExpMatchArray[] = Array.from(input.matchAll(matcher));
      if (!matches.length) return 'No matches.';
      return matches.map((match: RegExpMatchArray, index) => `${index + 1}. "${match[0]}" at index ${match.index}`).join('\n');
    } catch (error) {
      return `Invalid RegExp: ${(error as Error).message}`;
    }
  }, [pattern, flags, input]);
  return (
    <ToolPanel title="JavaScript regex tester" description="Run JavaScript RegExp matches locally with configurable pattern and flags.">
      <div className="mb-4 grid gap-4 sm:grid-cols-[1fr_8rem]"><div><label className="mb-2 block text-sm font-semibold text-slate-700">Pattern</label><TextInput value={pattern} onChange={setPattern} /></div><div><label className="mb-2 block text-sm font-semibold text-slate-700">Flags</label><TextInput value={flags} onChange={setFlags} /></div></div>
      <ToolGrid input={input} output={output} onInput={setInput} placeholder="Enter text to test..." />
    </ToolPanel>
  );
}

function ModeButtons({ modes, selected, onSelect }: { modes: [string, string][]; selected: string; onSelect: (value: string) => void }) {
  return <div className="mb-4 flex flex-wrap gap-2">{modes.map(([value, label]) => <button className={`rounded-full px-4 py-2 text-sm font-semibold ${selected === value ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`} key={value} onClick={() => onSelect(value)} type="button">{label}</button>)}</div>;
}

function ToolGrid({ input, output, onInput, placeholder }: { input: string; output: string; onInput: (value: string) => void; placeholder: string }) {
  return <div className="grid gap-5 lg:grid-cols-2"><div><label className="mb-2 block text-sm font-semibold text-slate-700">Input</label><TextArea value={input} onChange={onInput} placeholder={placeholder} /></div><OutputBlock value={output} /></div>;
}

function App() {
  const [activeTool, setActiveTool] = useState<ToolId>('base64');
  const selectedTool = tools.find((tool) => tool.id === activeTool) ?? tools[0];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
        <aside className="lg:w-80 lg:shrink-0"><div className="sticky top-8 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur"><p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-700">Decode Encode</p><h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Local browser utilities</h1><p className="mt-4 text-sm leading-6 text-slate-600">Everything runs in your browser. Inputs stay on your device, and this app has no backend, analytics, or API dependencies.</p><nav className="mt-6 flex flex-col gap-2" aria-label="Tool navigation">{tools.map((tool) => <button className={`rounded-2xl p-4 text-left transition ${activeTool === tool.id ? 'bg-slate-950 text-white shadow-lg' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`} key={tool.id} onClick={() => setActiveTool(tool.id)} type="button"><span className="block font-bold">{tool.name}</span><span className={`mt-1 block text-sm ${activeTool === tool.id ? 'text-slate-300' : 'text-slate-500'}`}>{tool.description}</span></button>)}</nav></div></aside>
        <div className="flex-1"><div className="mb-6 rounded-3xl border border-cyan-200 bg-cyan-50 p-5 text-cyan-950"><h2 className="font-bold">Privacy by default</h2><p className="mt-1 text-sm leading-6">Use these tools offline after the app loads. Processing is handled with native browser APIs like TextEncoder, JSON.parse, URL encoding helpers, RegExp, and Web Crypto.</p></div>
          {selectedTool.id === 'base64' && <Base64Tool />}
          {selectedTool.id === 'jwt' && <JwtTool />}
          {selectedTool.id === 'text' && <TextTool />}
          {selectedTool.id === 'encoding' && <EncodingTool />}
          {selectedTool.id === 'json' && <JsonTool />}
          {selectedTool.id === 'crypto' && <CryptoTool />}
          {selectedTool.id === 'time' && <TimeTool />}
          {selectedTool.id === 'color' && <ColorTool />}
          {selectedTool.id === 'regex' && <RegexTool />}
        </div>
      </div>
    </main>
  );
}

export default App;
