import { useEffect, useMemo, useState } from 'react';
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
  shortcut: string;
};

const tools: Tool[] = [
  { id: 'base64', name: 'Base64', description: 'Encode and decode UTF-8 text with Base64.', shortcut: 'B64' },
  { id: 'jwt', name: 'JWT inspect', description: 'Decode JWT header and payload without verification.', shortcut: 'JWT' },
  { id: 'text', name: 'Text utilities', description: 'Convert case, generate slugs, and count text.', shortcut: 'TXT' },
  { id: 'encoding', name: 'Encoding utilities', description: 'URL, HTML entity, and Unicode escaping.', shortcut: 'ENC' },
  { id: 'json', name: 'JSON utilities', description: 'Format, minify, and query JSON paths.', shortcut: 'JSN' },
  { id: 'crypto', name: 'Crypto utilities', description: 'Hash text and generate UUIDs locally.', shortcut: 'SHA' },
  { id: 'time', name: 'Time utilities', description: 'Convert Unix timestamps and format dates.', shortcut: 'UTC' },
  { id: 'color', name: 'Color utilities', description: 'Convert HEX/RGB/HSL and check contrast.', shortcut: 'HEX' },
  { id: 'regex', name: 'Regex tester', description: 'Test JavaScript regular expressions.', shortcut: 'REG' },
];

const defaultToolId: ToolId = 'base64';

function isToolId(value: string): value is ToolId {
  return tools.some((tool) => tool.id === value);
}

function getToolFromLocation() {
  const hash = window.location.hash.replace(/^#/, '').trim();
  return isToolId(hash) ? hash : defaultToolId;
}

function buildToolUrl(toolId: ToolId) {
  return `${window.location.pathname}${window.location.search}#${toolId}`;
}

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
    <section className="overflow-hidden rounded-lg border border-stone-300 bg-white shadow-[0_20px_60px_rgba(28,25,23,0.08)]">
      <div className="border-b border-stone-200 bg-stone-50 px-5 py-5 sm:px-7 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-700">Browser-only tool</p>
            <h2 className="mt-1 text-2xl font-black text-stone-950 sm:text-3xl">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600 sm:text-base">{description}</p>
          </div>
          <p className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">Local input</p>
        </div>
      </div>
      <div className="p-5 sm:p-7 lg:p-8">
        {children}
      </div>
    </section>
  );
}

function TextArea({ value, onChange, placeholder, minHeight = 'min-h-[22rem]' }: { value: string; onChange?: (value: string) => void; placeholder?: string; minHeight?: string }) {
  return (
    <textarea
      className={`${minHeight} w-full resize-y rounded-md border border-stone-300 bg-stone-50 p-4 font-mono text-sm leading-6 text-stone-950 shadow-inner outline-none transition placeholder:text-stone-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100`}
      placeholder={placeholder}
      readOnly={!onChange}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <input className="w-full rounded-md border border-stone-300 bg-stone-50 p-3 text-sm text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />;
}

function OutputBlock({ value }: { value: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-3 flex h-10 items-center justify-between gap-3">
        <label className="text-sm font-bold text-stone-800">Output</label>
        <button className="h-10 rounded-md bg-stone-950 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-100" onClick={() => copyText(value)} type="button">
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
      {mode === 'path' && <div className="mb-5"><label className="mb-2 block text-sm font-bold text-stone-800">JSON path</label><TextInput value={path} onChange={setPath} placeholder="$.items[0].name" /></div>}
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
      <div className="mb-5 flex flex-wrap gap-3"><button className="rounded-md bg-teal-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100" onClick={() => void generateHash()} type="button">Generate hash</button><button className="rounded-md bg-stone-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-stone-800 focus:outline-none focus:ring-4 focus:ring-stone-200" onClick={() => setOutput(crypto.randomUUID())} type="button">Generate UUID</button></div>
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
      <div className="mb-5 grid gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-bold text-stone-800">Color to convert</label><TextInput value={primary} onChange={setPrimary} /></div><div><label className="mb-2 block text-sm font-bold text-stone-800">Contrast color</label><TextInput value={secondary} onChange={setSecondary} /></div></div>
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
      <div className="mb-5 grid gap-4 sm:grid-cols-[1fr_8rem]"><div><label className="mb-2 block text-sm font-bold text-stone-800">Pattern</label><TextInput value={pattern} onChange={setPattern} /></div><div><label className="mb-2 block text-sm font-bold text-stone-800">Flags</label><TextInput value={flags} onChange={setFlags} /></div></div>
      <ToolGrid input={input} output={output} onInput={setInput} placeholder="Enter text to test..." />
    </ToolPanel>
  );
}

function ModeButtons({ modes, selected, onSelect }: { modes: [string, string][]; selected: string; onSelect: (value: string) => void }) {
  return <div className="mb-5 flex flex-wrap gap-2">{modes.map(([value, label]) => <button className={`rounded-md border px-4 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-teal-100 ${selected === value ? 'border-teal-700 bg-teal-700 text-white shadow-sm' : 'border-stone-300 bg-stone-100 text-stone-800 hover:border-stone-400 hover:bg-white'}`} key={value} onClick={() => onSelect(value)} type="button">{label}</button>)}</div>;
}

function ToolGrid({ input, output, onInput, placeholder }: { input: string; output: string; onInput: (value: string) => void; placeholder: string }) {
  return <div className="grid gap-6 xl:grid-cols-2"><div className="min-w-0"><div className="mb-3 flex h-10 items-center"><label className="block text-sm font-bold text-stone-800">Input</label></div><TextArea value={input} onChange={onInput} placeholder={placeholder} /></div><OutputBlock value={output} /></div>;
}

function ToolNav({
  activeTool,
  collapsed,
  onSelect,
}: {
  activeTool: ToolId;
  collapsed: boolean;
  onSelect: (tool: ToolId) => void;
}) {
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0" aria-label="Tool navigation">
      {tools.map((tool) => {
        const isActive = activeTool === tool.id;
        return (
          <button
            aria-label={collapsed ? tool.name : undefined}
            className={`group min-w-max rounded-md border text-left transition focus:outline-none focus:ring-4 focus:ring-teal-100 lg:min-w-0 ${
              collapsed ? 'lg:grid lg:h-12 lg:w-12 lg:min-w-12 lg:place-items-center lg:p-0' : 'px-4 py-3'
            } ${isActive ? 'border-stone-950 bg-stone-950 text-white shadow-lg shadow-stone-950/10' : 'border-stone-300 bg-white text-stone-800 hover:border-teal-600 hover:bg-teal-50'}`}
            key={tool.id}
            onClick={() => onSelect(tool.id)}
            title={collapsed ? tool.name : undefined}
            type="button"
          >
            <span className={`flex items-center ${collapsed ? 'lg:justify-center' : 'gap-3'}`}>
              <span className={`grid shrink-0 place-items-center rounded text-xs font-black ${collapsed ? 'h-12 w-12 lg:h-auto lg:w-auto lg:border-0 lg:bg-transparent' : 'h-9 w-11 border'} ${isActive ? 'border-white/20 bg-white/10 text-white' : 'border-stone-300 bg-stone-100 text-stone-800 group-hover:border-teal-200 group-hover:bg-white'}`}>{tool.shortcut}</span>
              {!collapsed && <span className="font-black">{tool.name}</span>}
            </span>
            {!collapsed && <span className={`mt-2 block max-w-56 text-sm leading-5 ${isActive ? 'text-stone-300' : 'text-stone-600'}`}>{tool.description}</span>}
          </button>
        );
      })}
    </nav>
  );
}

function App() {
  const [activeTool, setActiveTool] = useState<ToolId>(() => getToolFromLocation());
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const selectedTool = tools.find((tool) => tool.id === activeTool) ?? tools[0];

  useEffect(() => {
    const syncToolFromLocation = () => {
      setActiveTool(getToolFromLocation());
    };

    window.history.replaceState(window.history.state, '', buildToolUrl(getToolFromLocation()));
    window.addEventListener('popstate', syncToolFromLocation);
    window.addEventListener('hashchange', syncToolFromLocation);

    return () => {
      window.removeEventListener('popstate', syncToolFromLocation);
      window.removeEventListener('hashchange', syncToolFromLocation);
    };
  }, []);

  function handleToolSelect(toolId: ToolId) {
    if (toolId === activeTool) return;
    window.history.pushState({ toolId }, '', buildToolUrl(toolId));
    setActiveTool(toolId);
  }

  return (
    <main className="min-h-screen bg-stone-100 text-stone-950">
      <div className="mx-auto flex min-h-screen max-w-[96rem] flex-col gap-4 px-3 py-3 sm:px-5 sm:py-5 lg:flex-row lg:gap-5">
        <aside className={`${isNavCollapsed ? 'lg:w-[5rem]' : 'lg:w-[21rem]'} lg:shrink-0`}>
          <div className={`sticky top-5 rounded-lg border border-stone-300 bg-stone-50 p-4 shadow-[0_18px_45px_rgba(28,25,23,0.08)] ${isNavCollapsed ? 'lg:p-3' : 'lg:p-5'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className={isNavCollapsed ? 'lg:sr-only' : ''}>
                <p className="text-sm font-black text-teal-700">Decode Encode</p>
                <h1 className="mt-2 text-2xl font-black text-stone-950 sm:text-3xl">Local utilities</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600 lg:max-w-none">Fast browser tools for transforming, inspecting, and validating text without leaving the page.</p>
              </div>
              <button
                aria-label={isNavCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="hidden h-10 w-10 shrink-0 place-items-center rounded-md border border-stone-300 bg-white text-lg font-black text-stone-800 shadow-sm transition hover:border-teal-600 hover:text-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-100 lg:grid"
                onClick={() => setIsNavCollapsed((value) => !value)}
                title={isNavCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                type="button"
              >
                {isNavCollapsed ? '>' : '<'}
              </button>
            </div>
            <div className={isNavCollapsed ? 'mt-4 lg:flex lg:justify-center' : 'mt-5'}>
              <ToolNav activeTool={activeTool} collapsed={isNavCollapsed} onSelect={handleToolSelect} />
            </div>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="mb-4 border-l-4 border-teal-700 bg-white px-4 py-3 text-stone-800 shadow-sm sm:px-5">
            <p className="text-sm leading-6"><span className="font-black text-stone-950">{selectedTool.name}</span> runs locally after the app loads. Use the tabs or sidebar to switch tools without losing browser-only processing.</p>
          </div>
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
