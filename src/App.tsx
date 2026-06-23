import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type ToolId = 'base64' | 'jwt' | 'url' | 'json' | 'hash';

type Tool = {
  id: ToolId;
  name: string;
  description: string;
};

const tools: Tool[] = [
  { id: 'base64', name: 'Base64', description: 'Encode and decode UTF-8 text with Base64.' },
  { id: 'jwt', name: 'JWT inspect', description: 'Decode JWT header and payload without verification.' },
  { id: 'url', name: 'URL', description: 'Encode or decode URL components.' },
  { id: 'json', name: 'JSON', description: 'Format or minify JSON documents.' },
  { id: 'hash', name: 'SHA-256', description: 'Generate a SHA-256 digest using Web Crypto.' },
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
      </div>
      {children}
    </section>
  );
}

function TextArea({ value, onChange, placeholder }: { value: string; onChange?: (value: string) => void; placeholder?: string }) {
  return (
    <textarea
      className="min-h-48 w-full rounded-2xl border border-slate-300 bg-slate-50 p-4 font-mono text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
      placeholder={placeholder}
      readOnly={!onChange}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
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
      <ModeButtons modes={[['encode', 'Encode'], ['decode', 'Decode']]} selected={mode} onSelect={(value) => setMode(value as 'encode' | 'decode')} />
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

function UrlTool() {
  const [input, setInput] = useState('https://example.com/search?q=hello world&safe=true');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const output = useMemo(() => {
    try {
      return mode === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input);
    } catch (error) {
      return `Unable to ${mode}: ${(error as Error).message}`;
    }
  }, [input, mode]);

  return (
    <ToolPanel title="URL encode/decode" description="Encode strings for URL components or decode percent-encoded text.">
      <ModeButtons modes={[['encode', 'Encode'], ['decode', 'Decode']]} selected={mode} onSelect={(value) => setMode(value as 'encode' | 'decode')} />
      <ToolGrid input={input} output={output} onInput={setInput} placeholder="Enter URL text..." />
    </ToolPanel>
  );
}

function JsonTool() {
  const [input, setInput] = useState('{"message":"Hello","private":true}');
  const [mode, setMode] = useState<'format' | 'minify'>('format');
  const output = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(input), null, mode === 'format' ? 2 : 0);
    } catch (error) {
      return `Invalid JSON: ${(error as Error).message}`;
    }
  }, [input, mode]);

  return (
    <ToolPanel title="JSON formatter/minifier" description="Parse JSON in the browser, then pretty-print or compact it.">
      <ModeButtons modes={[['format', 'Format'], ['minify', 'Minify']]} selected={mode} onSelect={(value) => setMode(value as 'format' | 'minify')} />
      <ToolGrid input={input} output={output} onInput={setInput} placeholder="Paste JSON..." />
    </ToolPanel>
  );
}

function HashTool() {
  const [input, setInput] = useState('Hash this locally');
  const [output, setOutput] = useState('');

  async function generateHash(value: string) {
    const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(value));
    setOutput(Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(''));
  }

  return (
    <ToolPanel title="SHA-256 hash generator" description="Create a SHA-256 digest with the browser Web Crypto API.">
      <button className="mb-4 rounded-full bg-cyan-600 px-5 py-2 text-sm font-bold text-white hover:bg-cyan-700" onClick={() => void generateHash(input)} type="button">
        Generate SHA-256
      </button>
      <ToolGrid input={input} output={output || 'Click Generate SHA-256 to compute a hash.'} onInput={setInput} placeholder="Enter text to hash..." />
    </ToolPanel>
  );
}

function ModeButtons({ modes, selected, onSelect }: { modes: [string, string][]; selected: string; onSelect: (value: string) => void }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {modes.map(([value, label]) => (
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold ${selected === value ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          key={value}
          onClick={() => onSelect(value)}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ToolGrid({ input, output, onInput, placeholder }: { input: string; output: string; onInput: (value: string) => void; placeholder: string }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Input</label>
        <TextArea value={input} onChange={onInput} placeholder={placeholder} />
      </div>
      <OutputBlock value={output} />
    </div>
  );
}

function App() {
  const [activeTool, setActiveTool] = useState<ToolId>('base64');
  const selectedTool = tools.find((tool) => tool.id === activeTool) ?? tools[0];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
        <aside className="lg:w-80 lg:shrink-0">
          <div className="sticky top-8 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-700">Decode Encode</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Local browser utilities</h1>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Everything runs in your browser. Inputs stay on your device, and this app has no backend, analytics, or API dependencies.
            </p>
            <nav className="mt-6 flex flex-col gap-2" aria-label="Tool navigation">
              {tools.map((tool) => (
                <button
                  className={`rounded-2xl p-4 text-left transition ${activeTool === tool.id ? 'bg-slate-950 text-white shadow-lg' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  type="button"
                >
                  <span className="block font-bold">{tool.name}</span>
                  <span className={`mt-1 block text-sm ${activeTool === tool.id ? 'text-slate-300' : 'text-slate-500'}`}>{tool.description}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>
        <div className="flex-1">
          <div className="mb-6 rounded-3xl border border-cyan-200 bg-cyan-50 p-5 text-cyan-950">
            <h2 className="font-bold">Privacy by default</h2>
            <p className="mt-1 text-sm leading-6">
              Use these tools offline after the app loads. Processing is handled with native browser APIs like TextEncoder, JSON.parse, URL encoding helpers, and Web Crypto.
            </p>
          </div>
          {selectedTool.id === 'base64' && <Base64Tool />}
          {selectedTool.id === 'jwt' && <JwtTool />}
          {selectedTool.id === 'url' && <UrlTool />}
          {selectedTool.id === 'json' && <JsonTool />}
          {selectedTool.id === 'hash' && <HashTool />}
        </div>
      </div>
    </main>
  );
}

export default App;
