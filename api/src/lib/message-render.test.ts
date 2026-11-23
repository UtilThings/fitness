import { expect, test } from "bun:test";
import { extractVariables, formatDate, formatMoneyCents, formatTime, renderHtml, renderTemplate, renderText, validateTemplate } from "./message-render";

const valid = { key: "booking_confirmed", subject: "Hola", body: "{{client_first_name}}" };

test("escapa texto y valores HTML con párrafos y saltos de línea", () => {
  expect(renderHtml("Hola {{client_first_name}}\nAdiós\n\n<script>", { client_first_name: `<b>Ana</b> "'&` }))
    .toBe("<p>Hola &lt;b&gt;Ana&lt;/b&gt; &quot;&#39;&amp;<br>Adiós</p><p>&lt;script&gt;</p>");
});

test("parsea variables repetidas y valores vacíos sin volver a interpretar el valor", () => {
  expect(extractVariables("{{ name }} {{name}}")).toEqual(["name"]);
  expect(renderText("{{x}}.{{y}}", { x: "", y: "{{literal}}" })).toBe(".{{literal}}");
  expect(() => renderText(valid.body, {})).toThrow("Falta el valor");
  for (const body of ["{{ {{client_first_name}} }}", "{{client_first_name", "texto }}"]) {
    expect(validateTemplate({ ...valid, body })).not.toEqual([]);
  }
});

test("valida campos, longitudes, variables y saltos del asunto renderizado", () => {
  for (const variable of ["password", "amount", "constructor"]) {
    expect(validateTemplate({ ...valid, body: `{{${variable}}}` })[0]?.variable).toBe(variable);
  }
  expect(validateTemplate({ ...valid, subject: "\r\n", body: "x".repeat(5001) }).map(({ field }) => field))
    .toEqual(["subject", "subject", "body"]);
  expect(validateTemplate({ ...valid, subject: "x".repeat(151) })).toHaveLength(1);
  expect(validateTemplate({ ...valid, subject: "x".repeat(150), body: "x".repeat(5000) })).toEqual([]);
  expect(() => renderTemplate({ ...valid, subject: "{{client_first_name}}" }, { client_first_name: "Ana\nOtro" })).toThrow();
});

test("formatea fecha local bilingüe e importes en dólares", () => {
  const instant = "2026-11-21 14:00:00.000Z";
  expect(`${formatDate(instant, "es")}, ${formatTime(instant)}`).toBe("sáb 21 nov, 9:00 AM");
  expect(`${formatDate(instant, "en")}, ${formatTime(instant)}`).toBe("Sat, Nov 21, 9:00 AM");
  expect(formatMoneyCents(26800)).toBe("$268.00");
});
