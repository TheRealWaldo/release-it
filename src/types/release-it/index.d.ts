declare module 'release-it' {
  interface options {
    increment: boolean;
    git: {
      requireCleanWorkingDir: boolean;
      requireUpstream: boolean;
      tag: boolean;
      tagName: string;
      tagAnnotation: string;
      commit: boolean;
      commitMessage: string;
      push: boolean;
    };
  }
  function runTasks(
    opts: options,
    di?: options
  ): Promise<{ name: string; changelog: string; latestVersion: string; version: string }>;
}
