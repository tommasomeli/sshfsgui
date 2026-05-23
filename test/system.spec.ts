import { describe, expect, it } from 'vitest';
import { getInstallInstructions } from '../src/main/system';

describe('getInstallInstructions', () => {
  it('documents both Homebrew install stacks', () => {
    const instructions = getInstallInstructions();
    expect(instructions.stacks.map((s) => s.key)).toEqual(['fuseT', 'macfuse']);
    expect(instructions.stacks[0]?.commands.join(' ')).toContain('fuse-t');
    expect(instructions.stacks[1]?.commands.join(' ')).toContain('macfuse');
  });

  it('includes reference links', () => {
    const instructions = getInstallInstructions();
    const labels = instructions.links.map((l) => l.label);
    expect(labels).toContain('FUSE-T');
    expect(labels).toContain('macFUSE');
    expect(labels).toContain('Homebrew');
  });
});
