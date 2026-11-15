import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const project = process.cwd();

describe('shopping assistant removal', () => {
  it('does not ship assistant routes, page, component, or navigation entry', () => {
    expect(existsSync(resolve(project, 'app/api/assistant/route.ts'))).toBe(false);
    expect(existsSync(resolve(project, 'app/ai-studio/page.tsx'))).toBe(false);
    expect(existsSync(resolve(project, 'components/assistant.tsx'))).toBe(false);
    expect(existsSync(resolve(project, 'lib/ai.ts'))).toBe(false);
    expect(readFileSync(resolve(project, 'components/site-header.tsx'), 'utf8')).not.toContain('/ai-studio');
    expect(readFileSync(resolve(project, 'app/page.tsx'), 'utf8')).not.toContain('<Assistant');
  });
});
