import type { AnimeSite } from "../shared/types";

export function extractMatches(strategies: AnimeSite[]): string[] {
    const matches = new Set<string>();

    for (const strategy of strategies) {
        for (const domain of strategy.domains) {
            matches.add(`*://${domain}/*`);
        }

        if (strategy.iframe_src) {
            for (const src of strategy.iframe_src) {
                matches.add(`*://${src}/*`);
            }
        }
    }

    return Array.from(matches);
}
