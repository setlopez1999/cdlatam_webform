# Error: NotFoundError: Failed to execute 'removeChild' on 'Node'

## Descripción del Problema

Cuando un usuario utiliza la función de **traducción automática del navegador** (como Google Translate en Chrome) en una página construida con React, y luego interactúa con la página (por ejemplo, haciendo clic en un botón que cambia el estado), la aplicación "crashea" mostrando el siguiente error en consola o en la UI:

```text
NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.
```

## Causa Raíz

Este es un conflicto conocido entre React y las herramientas de traducción del navegador:

1. React renderiza el DOM inicial (ej: un texto que dice "Ingresar").
2. El usuario activa la traducción automática.
3. El traductor del navegador **modifica directamente el DOM**, reemplazando los nodos de texto originales (`TextNode`) por nuevos nodos con el texto traducido (ej: `<font>Enter</font>`).
4. El usuario hace clic en el botón.
5. React intenta actualizar el estado (ej: cambiar "Ingresar" a "Verificando...").
6. React busca el nodo de texto original que él mismo creó para removerlo (`removeChild`), pero **ya no lo encuentra** porque el traductor lo reemplazó.
7. React lanza la excepción `NotFoundError` y la aplicación se rompe.

Esto ocurre principalmente cuando se renderizan strings directamente condicionales sin un elemento contenedor estable.

## Solución Implementada

Para solucionar este problema de forma definitiva, se aplicaron dos estrategias combinadas:

### 1. Atributo `translate="no"` (Recomendado para Formularios)

Se agregó el atributo HTML estándar `translate="no"` al contenedor principal del formulario de Login. Esto le indica explícitamente a los navegadores y herramientas de traducción que **no deben intentar traducir el contenido de ese bloque**.

```tsx
// Antes
<div className="flex-1 flex flex-col items-center...">

// Después
<div className="flex-1 flex flex-col items-center..." translate="no">
```

Esta es la solución ideal para un Login, ya que los nombres de usuario, contraseñas y etiquetas técnicas ("Usuario", "Contraseña") no deberían traducirse para evitar confusiones.

### 2. Wrappers `<span>` para textos dinámicos

Para proteger el código React en general (incluso si se permite la traducción), se envolvieron los textos dinámicos en etiquetas `<span>`. Esto le da a React un nodo padre estable (`<span>`) que el traductor no elimina, permitiendo que React actualice el contenido interno sin perder la referencia del DOM.

```tsx
// ❌ Vulnerable (React pierde la referencia si el texto es traducido)
{isLoggingIn ? "Verificando..." : "Ingresar al sistema"}

// ✅ Seguro (React mantiene la referencia del span)
{isLoggingIn ? <span>Verificando...</span> : <span>Ingresar al sistema</span>}
```

## Prevención Futura

Para futuros desarrollos en el proyecto:
- **Nunca** renderizar strings condicionales "desnudos" directamente en el JSX si la página es susceptible a ser traducida.
- Siempre envolver textos dinámicos en `<span>`, `<p>` o `<div>`.
- Usar `translate="no"` en componentes críticos donde la traducción automática pueda romper la experiencia de usuario (como editores de código, consolas, o formularios técnicos).
