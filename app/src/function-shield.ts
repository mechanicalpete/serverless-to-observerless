import { FUNCTION_SHIELD_TOKEN } from "./constants";

// https://www.puresec.io/function-shield


export function initialiseFunctionShield(): void {
  /* istanbul ignore if */
  if (process.env.CI !== 'true') {
    /* istanbul ignore next */
    const FunctionShield = require('@puresec/function-shield');
    /* istanbul ignore next */
    FunctionShield.configure({
      policy: {
        // 'block' mode => active blocking
        // 'alert' mode => log only
        // 'allow' mode => allowed, implicitly occurs if key does not exist
        outbound_connectivity: "alert",
        read_write_tmp: "alert",
        create_child_process: "alert",
        read_handler: "alert"
      },
      token: FUNCTION_SHIELD_TOKEN
    });
  }
}