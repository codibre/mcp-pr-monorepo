import * as logLib from 'src/internal/log';

describe('run.ts - additional coverage', () => {
  beforeEach(() => {
    jest.spyOn(logLib, 'log').mockReturnValue(undefined);
  });

  it('uses provided options.cwd over contextService.cwd', async () => {
    const execMock = jest.fn((cmd: string, opts: any, cb: any) => cb(null, { stdout: 'OK\n', stderr: '' }));
    jest.doMock('child_process', () => ({ exec: execMock }));
    jest.doMock('../../../src/internal/context-service', () => ({
      contextService: {
        get cwd() {
          return '/should/not/be/used';
        },
      },
    }));

    const runMod = require('../../../src/internal/run');
    const out = await runMod.run('echo hi', { cwd: '/provided' });
    expect(out).toBe('OK');
    expect(execMock).toHaveBeenCalled();
  const calledOpts = execMock.mock.calls[0]![1];
    expect(calledOpts.cwd).toBe('/provided');
  });

  it('CommandBuilder.ifWith respects condition (true/false)', () => {
    const { command } = require('../../../src/internal/run');
    const cb = command('cmd').with('a');
    cb.ifWith(false, 'b');
    expect(cb.toString()).toBe('cmd a');
    cb.ifWith(true, 'b');
    expect(cb.toString()).toBe('cmd a b');
  });

  it('CommandBuilder.run forwards options to run', async () => {
    const execMock = jest.fn((cmd: string, opts: any, cb: any) => cb(null, { stdout: 'R\n', stderr: '' }));
    jest.doMock('child_process', () => ({ exec: execMock }));
    jest.doMock('../../../src/internal/context-service', () => ({
      contextService: {
        get cwd() {
          return process.cwd();
        },
      },
    }));

    const runMod = require('../../../src/internal/run');
    const cb = runMod.command('node').with('-p', '1');
    const res = await cb.run({ cwd: '/custom' });
    expect(res).toBe('R');
  const calledOpts = execMock.mock.calls[0]![1];
    expect(calledOpts.cwd).toBe('/custom');
  });

  it('attemptRun calls attempt for each provided command', async () => {
    const attemptMock = jest.fn(async (fn: any) => {
      // call the passed function to emulate attempt behavior
      await fn();
    });
    // mock attempt before importing run so attemptRun picks it up
    jest.doMock('../../../src/internal/attempt', () => ({ attempt: attemptMock }));

    // also mock child_process.exec so run() inside attempt won't fail if called
    const execMock = jest.fn((cmd: string, opts: any, cb: any) => cb(null, { stdout: '', stderr: '' }));
    jest.doMock('child_process', () => ({ exec: execMock }));
    jest.doMock('../../../src/internal/context-service', () => ({
      contextService: {
        get cwd() {
          return process.cwd();
        },
      },
    }));

    const runMod = require('../../../src/internal/run');
    await runMod.attemptRun('one', 'two', 'three');
    // attempt should be called three times (once per command)
    expect(attemptMock).toHaveBeenCalledTimes(3);
  });
});
