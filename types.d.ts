declare module '*.css';
declare module 'next' { export type Metadata = { title?: string; description?: string }; }
declare module 'next/types.js' { export type ResolvingMetadata = unknown; export type ResolvingViewport = unknown; }
