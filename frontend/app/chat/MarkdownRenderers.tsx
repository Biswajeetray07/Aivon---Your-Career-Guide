"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export const markdownComponents = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <div className="relative mt-4 mb-4 rounded-lg overflow-hidden border border-white/10 group">
        <div className="flex items-center justify-between px-4 py-2 bg-[#05070A] border-b border-white/5">
          <span className="text-[10px] uppercase tracking-widest text-[#00E5B0] font-bold">{match[1]}</span>
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500/50" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
            <div className="w-2 h-2 rounded-full bg-green-500/50" />
          </div>
        </div>
        <SyntaxHighlighter
          style={vscDarkPlus as any}
          language={match[1]}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "#0A0F14",
            fontSize: "12px",
            lineHeight: "1.5"
          }}
          {...props}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code className="bg-[#05070A]/50 border border-white/10 px-1.5 py-0.5 rounded text-[#00C2FF] text-[12px]" {...props}>
        {children}
      </code>
    );
  },
  p({ children }: any) { return <p className="mb-4 last:mb-0 leading-relaxed text-[#E2E8F0] tracking-wide">{children}</p>; },
  ul({ children }: any) { return <ul className="list-disc leading-relaxed text-[#E2E8F0] ml-4 mb-4">{children}</ul>; },
  ol({ children }: any) { return <ol className="list-decimal leading-relaxed text-[#E2E8F0] ml-4 mb-4">{children}</ol>; },
  li({ children }: any) { return <li className="mb-2 pl-2 marker:text-[#00E5B0]">{children}</li>; },
  h1({ children }: any) { return <h1 className="text-[#00E5B0] text-xl font-bold uppercase tracking-widest mb-4 mt-8 pb-2 border-b border-white/5">{children}</h1>; },
  h2({ children }: any) { return <h2 className="text-[#00C2FF] text-lg font-bold tracking-widest mb-3 mt-6">{children}</h2>; },
  h3({ children }: any) { return <h3 className="text-white text-md font-bold tracking-wider mb-2 mt-4">{children}</h3>; },
  blockquote({ children }: any) { return <blockquote className="border-l-2 border-[#FACC15] pl-4 py-1 mb-4 my-2 text-[#E2E8F0]/70 italic bg-[#FACC15]/5 rounded-r">{children}</blockquote>; },
  table({ children }: any) { return <div className="overflow-x-auto mb-4 border border-white/10 rounded-lg"><table className="w-full text-left border-collapse text-sm">{children}</table></div>; },
  th({ children }: any) { return <th className="p-3 border-b border-white/10 bg-[#05070A] text-[#00E5B0] uppercase tracking-widest text-[10px] font-bold">{children}</th>; },
  td({ children }: any) { return <td className="p-3 border-b border-white/5 text-[#E2E8F0]">{children}</td>; },
  strong({ children }: any) { return <strong className="font-bold text-[#00E5B0]">{children}</strong>; },
  a({ href, children }: any) { return <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#00C2FF] underline underline-offset-4 hover:text-[#00E5B0] transition-colors">{children}</a>; }
};

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  );
}
