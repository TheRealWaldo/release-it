declare module 'release-it' {
  export interface options {
    increment?: boolean;
    git?: {
      requireCleanWorkingDir?: boolean;
      requireUpstream?: boolean;
      tag?: boolean;
      tagName?: string;
      tagAnnotation?: string;
      commit?: boolean;
      commitMessage?: string;
      push?: boolean;
    };
  }
  export function runTasks(
    opts: options,
    di?: options
  ): Promise<{ name: string; changelog: string; latestVersion: string; version: string }>;
}
