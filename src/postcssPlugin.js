import postcss from "postcss"
import { configurationError } from "./utils"
import ruleDefinitions from "./rules"
import disableRanges from "./disableRanges"
import buildConfig from "./buildConfig"

const numberedSeveritiesMap = new Map()
numberedSeveritiesMap.set(0, "ignore")
numberedSeveritiesMap.set(1, "warning")
numberedSeveritiesMap.set(2, "error")

export default postcss.plugin("stylelint", (options = {}) => {
  return (root, result) => {
    // result.stylelint is the namespace for passing stylelint-related
    // configuration and data across sub-plugins via the PostCSS Result
    result.stylelint = result.stylelint || {}
    result.stylelint.ruleSeverities = {}

    return buildConfig(options).then(config => {
      if (!config) {
        throw configurationError("No configuration provided")
      }
      if (!config.rules) {
        throw configurationError("No rules found within configuration")
      }
      if (config.plugins) {
        config.plugins.forEach(pluginPath => {
          const plugin = require(pluginPath).default
          ruleDefinitions[plugin.ruleName] = plugin.rule
        })
      }

      // Register details about the configuration
      result.stylelint.quiet = config.quiet

      // First check for disabled ranges, adding them to the result object
      disableRanges(root, result)

      Object.keys(config.rules).forEach(ruleName => {
        if (!ruleDefinitions[ruleName]) {
          throw configurationError(`Undefined rule ${ruleName}`)
        }

        // If severity is 'ignore', run nothing
        const ruleSettings = [].concat(config.rules[ruleName])

        const ruleSeverity = getRuleSeverity(ruleName, ruleSettings)

        if (ruleSeverity === "ignore") { return }

        // Log the rule's severity
        result.stylelint.ruleSeverities[ruleName] = ruleSeverity

        // Run the rule with the primary and secondary options
        if (config.errorByDefault) {
          ruleDefinitions[ruleName](ruleSettings[0], ruleSettings[1])(root, result)
        } else {
          ruleDefinitions[ruleName](ruleSettings[1], ruleSettings[2])(root, result)
        }
      })

      function getRuleSeverity(ruleName, ruleSettings) {
        if (config.errorByDefault) {
          if (ruleSettings[0] === false) { return "ignore" }
          if (ruleSettings[1] && ruleSettings[1].warn === true) { return "warning" }
          return "error"
        }

        return numberedSeveritiesMap.get(ruleSettings[0])
      }
    })
  }
})
