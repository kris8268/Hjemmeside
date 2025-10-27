import * as helloWorld from "./templates/helloWorld"

export const registry = {
  "hello-world": {
    name: "Hello World",
    run: helloWorld.run,
    // (valgfrit) param-skema, beskrivelse m.m.
  },
} as const

export type TemplateSlug = keyof typeof registry
