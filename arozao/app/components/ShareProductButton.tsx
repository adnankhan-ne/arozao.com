"use client";

import React, { useState } from "react";
import { Share2, Check } from "lucide-react";
import { useToast } from "@/components/ToastNotification";

interface ShareProductButtonProps {
  title: string;
  slug: string;
}

export function ShareProductButton({ title, slug }: ShareProductButtonProps) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url =
      typeof window !== "undefined"
        ? window.location.href
        : `https://arozao.com/product/${slug}`;

    // 1. Try Native Web Share API first
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${title} | Arozao`,
          text: `Check out "${title}" on Arozao!`,
          url,
        });
        showToast("Shared successfully!", { type: "success" });
        return;
      } catch (err) {
        // If user cancelled the share sheet, do nothing
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
      }
    }

    // 2. Fallback: Copy product URL to clipboard
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      setCopied(true);
      showToast("Product link copied to clipboard!", { type: "success" });
      setTimeout(() => setCopied(false), 2400);
    } catch {
      showToast("Could not copy link to clipboard.", { type: "warning" });
    }
  };

  return (
    <button
      type="button"
      className={`pdp-share-btn ${copied ? "is-copied" : ""}`}
      onClick={handleShare}
      title="Share this product"
      aria-label="Share this product"
    >
      {copied ? (
        <Check size={14} className="share-icon text-emerald-600" aria-hidden="true" />
      ) : (
        <Share2 size={14} className="share-icon" aria-hidden="true" />
      )}
      <span>{copied ? "Link Copied!" : "Share"}</span>
    </button>
  );
}
