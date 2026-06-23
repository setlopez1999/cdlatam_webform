import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

function fmt(n: number) {
  return n > 0 && n < 1e-6 ? n.toFixed(10) : String(n);
}

export function TipoCambioInput({ value, onChange, className }: {
  value: number | null;
  onChange: (v: number | null) => void;
  className?: string;
}) {
  const [display, setDisplay] = useState(value != null ? fmt(value) : "");
  const isInternal = useRef(false);

  useEffect(() => {
    if (isInternal.current) { isInternal.current = false; return; }
    setDisplay(value != null ? fmt(value) : "");
  }, [value]);

  return (
    <Input type="text" inputMode="decimal" className={className} placeholder="0" maxLength={12}
      value={display}
      onChange={e => {
        setDisplay(e.target.value);
        isInternal.current = true;
        if (e.target.value === "") { onChange(null); return; }
        const n = parseFloat(e.target.value);
        if (!isNaN(n)) onChange(n);
      }}
      onBlur={() => {
        const n = parseFloat(display);
        if (isNaN(n) || display === ".") {
          setDisplay(value != null ? fmt(value) : "");
        } else {
          onChange(n);
        }
      }}
    />
  );
}
