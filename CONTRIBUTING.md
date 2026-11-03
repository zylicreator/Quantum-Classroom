# Contributing

Thank you for helping make probability and orbital models easier to explore. Contributions can be code, teaching activities, explanations, translations, accessibility improvements, or scientific corrections.

## Discuss a change

Open a bug report for incorrect behavior or a teaching-idea issue for a classroom proposal. Include the laboratory, selected model, parameters, and a short way to reproduce the observation. For a scientific correction, distinguish a calculation error from a limitation of the stated approximation and link the supporting reference.

Use synthetic examples in public reports. Learning-record exports can contain student answers; do not attach identifiable student records.

## Work on the source

The editable application is in `assets/`. Keep the atomic model, molecular model, classroom content, and shared workspace separate. Edit these sources, then rebuild the standalone files:

```sh
python assets/build.py
npm test
```

If you change the interface, run the browser checks too:

```sh
npm install
npx playwright install chromium
npm run test:browser
```

Numerical changes should have a check that would detect a meaningful error: for example, normalization, a known symmetry or node, an independently calculated probability, or a sampling moment with a justified tolerance. The optional independent Python checks are documented in [README.md](README.md#develop-and-verify).

## Prepare a pull request

- Describe the user-visible or scientific problem and the resulting behavior.
- State the assumptions of any added model and cite its derivation or reference data.
- Keep Chinese and English explanations consistent. Language and view changes should preserve measurements and answers.
- Include the rebuilt standalone HTML files when source changes affect them.
- Summarize the checks you ran. Add a screenshot when it helps explain an interface change.

Avoid committing generated learning records, local browser profiles, test-output folders, or machine-specific paths. Preserve applicable third-party copyright and license notices.

## Scientific and teaching conventions

Each dot represents an independent simulated position measurement after preparing the selected state again. Do not present dots as a trajectory, colors as electric charge, or probability theorems as a derivation of quantum states.

Keep model limitations close to the controls or explanation they affect. A new visual should make clear whether it shows an amplitude, a probability density, a marginal distribution, or a projection. Written explanations are for reflection and discussion; the current app does not automatically grade them.

## License

By contributing, you agree to release your contribution under the project's MIT License. Include the source and applicable notice for any third-party material you add.
