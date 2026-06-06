# Patrón UI: tablas con datos largos (overflow)

Cuando una tabla editable tiene columnas de texto largo (CECO, descripción, selects con labels extensos), las columnas numéricas (Monto, Cant., Total) pueden comprimirse y volverse ilegibles. Este documento describe el patrón de 3 capas usado en F1 y F2.

## Patrón de 3 capas

1. **Wrapper con scroll horizontal**
   ```tsx
   <div className="overflow-x-auto rounded-lg border border-border/40">
   ```

2. **Tabla con ancho mínimo total** + **th/td con `w-[Npx] min-w-[Npx]`**
   ```tsx
   <table className="w-full min-w-[960px] border-collapse text-xs">
     <th className="... w-[90px] min-w-[90px]">Monto</th>
     <td className="px-1 py-1 min-w-[90px]">...</td>
   ```

3. **Controles dentro de celdas**
   - **Select:** `SelectTrigger` con `w-full max-w-full overflow-hidden`, `SelectValue` con `truncate`, `SelectContent position="popper"`
   - **Input numérico:** `w-full min-w-[72px]` (Cant.: `min-w-[58px]`)
   - **Input texto largo:** `min-w-0 truncate` + `max-w-[...]` en el `<td>` si aplica

Constante reutilizable (F2):

```tsx
const SELECT_TRIGGER_CELL = "h-8 text-xs w-full max-w-full overflow-hidden";
```

## Archivos de referencia

| Área | Archivo | `min-w` tabla |
|------|---------|---------------|
| F1 Servicios | `client/src/features/expedientes/f1/sections/F1Servicios.tsx` | 1100px |
| F1 Formas de pago | `client/src/features/expedientes/f1/sections/F1FormasPago.tsx` | 1050px |
| F2 Hardware/Materiales | `client/src/features/expedientes/f2/sections/F2CostTable.tsx` → `F2CostTable` | 960px |
| F2 RRHH | mismo archivo → `F2RRHHTable` | 1040px |
| F2 Otros gastos | mismo archivo → `F2OtrosTable` | 920px |

## Commits de referencia (git)

Mensajes descriptivos permiten encontrar el fix años después:

```powershell
git log --oneline --grep="min-w"
git show 723c18a -p -- client/src/features/expedientes/f1/sections/F1Servicios.tsx
git show c7a53f4 -p -- client/src/features/expedientes/f1/sections/F1FormasPago.tsx
```

| Hash | Mensaje |
|------|---------|
| `723c18a` | `fix(f1): aumentar min-w tabla servicios a 1100px y fijar anchos mínimos en Valor Unit./Cant.` |
| `c7a53f4` | `fix(f1): aumentar min-w tabla formas de pago a 1050px y fijar anchos mínimos en columnas Monto` |

## Checklist para tablas nuevas

- [ ] Contenedor `overflow-x-auto`
- [ ] `<table>` con `min-w-[...]` ≥ suma de columnas críticas
- [ ] Cada columna numérica: `w-[Npx] min-w-[Npx]` en `<th>` y `<td>`
- [ ] Cant.: preferir `75px` mínimo (no `60px`)
- [ ] Selects: trigger con overflow + value truncado
- [ ] Inputs numéricos: `min-w-[72px]` / Cant. `min-w-[58px]`
- [ ] Probar con CECO/descripción largos en viewport estrecho

## Verificación manual

1. Abrir F2 → Hardware: elegir CECO con label largo y escribir descripción extensa.
2. Confirmar que Monto, Cant. y Total siguen legibles.
3. Reducir ancho de ventana: debe aparecer scroll horizontal.
4. Repetir en Materiales, RRHH y Otros Gastos.
