"use client";
import { useEffect, useState } from "react";

export function ShareLinks({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  // Browser-only value: read after hydration so server and client markup match.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setUrl(window.location.href), []);
  const enc = encodeURIComponent;
  return (
    <div className="flex flex-col gap-2">
      <p className="eyebrow mb-1">Share</p>
      <button type="button" className="text-left text-[13px] text-charcoal hover:text-teal" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); } catch {} }}>
        {copied ? "Link copied ✓" : "Copy link"}
      </button>
      <a className="text-[13px] text-charcoal hover:text-teal" href={`https://wa.me/?text=${enc(`${title} ${url}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a className="text-[13px] text-charcoal hover:text-teal" href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`} target="_blank" rel="noopener noreferrer">Facebook</a>
      <a className="text-[13px] text-charcoal hover:text-teal" href={`https://x.com/intent/post?text=${enc(title)}&url=${enc(url)}`} target="_blank" rel="noopener noreferrer">X</a>
    </div>
  );
}
