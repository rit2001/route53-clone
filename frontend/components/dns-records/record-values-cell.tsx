"use client";

import { Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { copyText } from "@/lib/utilities/clipboard";

export function RecordValuesCell({
  name,
  values,
}: Readonly<{ name: string; values: string[] }>) {
  const [expanded, setExpanded] = useState(false);
  const visibleValues = expanded ? values : values.slice(0, 3);

  async function copyValues() {
    if (await copyText(values.join("\n"))) {
      toast.success("Record values copied.");
    } else {
      toast.error("Unable to copy record values.");
    }
  }

  async function copyValue(value: string) {
    if (await copyText(value)) {
      toast.success("Record value copied.");
    } else {
      toast.error("Unable to copy the record value.");
    }
  }

  return (
    <div className="flex min-w-64 items-start justify-between gap-2">
      <div className="min-w-0">
        <ul className="space-y-1">
          {visibleValues.map((value, index) => (
            <li
              className="flex items-start gap-1 break-all font-mono text-[0.6875rem] leading-4"
              key={`${value}-${index}`}
            >
              <span className="min-w-0 flex-1">{value}</span>
              <button
                aria-label={`Copy record value ${value}`}
                className="copy-button min-h-5 min-w-5 shrink-0"
                onClick={() => void copyValue(value)}
                type="button"
              >
                <Copy aria-hidden="true" className="size-3" />
              </button>
            </li>
          ))}
        </ul>
        {values.length > 3 ? (
          <button
            className="mt-1 text-xs font-semibold text-[var(--link)] hover:underline"
            onClick={() => setExpanded((current) => !current)}
            type="button"
          >
            {expanded ? "Show less" : `Show all ${values.length} values`}
          </button>
        ) : null}
      </div>
      <button
        aria-label={`Copy all values for ${name}`}
        className="copy-button shrink-0"
        onClick={() => void copyValues()}
        type="button"
      >
        <Copy aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  );
}
