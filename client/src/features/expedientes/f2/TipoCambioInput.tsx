import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

export function TipoCambioInput({ value, onChange, className }: {
  value: number | null;
  onChange: (v: number | null) => void;
  className?: string;
}) {
  const [raw, setRaw] = useState(value != null ? String(value) : "");
  const internalRef = useRef(false);

  useEffect(() => {
    if (internalRef.current) { internalRef.current = false; return; }
    setRaw(value != null ? String(value) : "");
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const s = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
    setRaw(s);
    internalRef.current = true;
    const n = parseFloat(s);
    if (!isNaN(n)) onChange(n);
    else if (s === "") onChange(null);
  };

  const handleBlur = () => {
    const n = parseFloat(raw);
    if (raw === "" || raw === "." || isNaN(n)) {
      setRaw(value != null ? String(value) : "");
    } else {
      const formatted = String(n);
      if (formatted !== raw) setRaw(formatted);
    }
  };

  return (
    <Input type="text" inputMode="decimal" className={className} placeholder="1.0000" maxLength={12}
      value={raw}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
