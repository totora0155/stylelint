import test from "tape"
import postcss from "postcss"
import stylelint from "../"

const configNumberedSeverity = {
  rules: {
    "block-opening-brace-newline-after": [ 2, "always" ],
    "color-no-invalid-hex": 1,
  },
}

const configErrorByDefault = {
  errorByDefault: true,
  rules: {
    "block-opening-brace-newline-after": "always",
    "color-no-invalid-hex": [ true, { "warn": true } ],
  },
}

const css = (
`a {
  color: #zzz;
}

b { background: pink; }

/* stylelint-disable color-no-invalid-hex */
.foo {
  color: #yyy;
}
/* stylelint-enable */

.bar {
  color: #mmm;
}
`)

function runTests(t, config) {
  t.plan(9)

  postcss()
    .use(stylelint(config))
    .process(css)
    .then(checkResult)
    .catch(err => console.log(err.stack))

  function checkResult(result) {
    const { messages } = result
    t.equal(messages.length, 3)
    t.ok(messages.every(m => m.type === "warning"))
    t.ok(messages.every(m => m.plugin === "stylelint"))
    t.equal(messages[0].text, "Expected newline after \"{\" (block-opening-brace-newline-after)")
    t.equal(messages[0].severity, "error")
    t.equal(messages[1].text, "Unexpected invalid hex color \"#zzz\" (color-no-invalid-hex)")
    t.equal(messages[1].severity, "warning")
    t.equal(messages[2].text, "Unexpected invalid hex color \"#mmm\" (color-no-invalid-hex)")
    t.equal(messages[2].severity, "warning")
  }
}

test("expected warnings with numbered severities", t => {
  runTests(t, configNumberedSeverity)
})

test("expected warnings with errorByDefault", t => {
  runTests(t, configErrorByDefault)
})
