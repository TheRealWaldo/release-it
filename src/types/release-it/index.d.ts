declare module 'release-it' {
  export declare interface options {
    increment?: boolean;
    debug?: boolean;
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
  declare function fn(
    options: options
  ): Promise<{ name: string; changelog: string; latestVersion: string; version: string }>;
  export = fn;
}
