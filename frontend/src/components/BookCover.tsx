"use client";

import { useState } from "react";

type Props = {
  title: string;
  src: string | null | undefined;
  className?: string;
};

export function BookCover({ title, src, className = "" }: Props) {
  const [ok, setOk] = useState(true);
  const hasSrc = Boolean(src?.trim());

  if (!hasSrc || !ok) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-indigo-600/40 via-slate-800 to-cyan-900/40 text-center text-xs font-medium leading-snug text-white/90 ${className}`}
        aria-hidden
      >
        <span className="line-clamp-4 px-2">{title}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src ?? ""}
      alt=""
      className={`h-full w-full object-cover ${className}`}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setOk(false)}
    />
  );
}
