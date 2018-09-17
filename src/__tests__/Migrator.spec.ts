import { context } from './types';
import {
  Migration,
  Migrator,
} from '..';
import { PoolConfig } from 'pg';

if (!process.env.PGDATABASE) process.env.PGDATABASE = 'testcode';

let tableName: string | undefined;
let poolConfig: PoolConfig | undefined;
const connect = () => new Migrator(tableName, poolConfig);

afterEach(async () => {
  return await connect().dropTable();
});

beforeAll(async () => {
  await connect().createDatabase();
});

afterAll(async () => {
  return await connect().dropDatabase();
});

describe('Migrator', () => {
  describe('#new', () => {
    const subject = connect;

    it('will set a default tableName', () => {
      const migrator = subject();
      expect(migrator.tableName).toBeDefined();
      expect(typeof migrator.tableName).toBe('string');
    });

    context('when tableName is passed', {
      definitions() {
        tableName = 'test';
      },
      tests() {
        it('will use passed value', () => {
          expect(subject().tableName).toBe(tableName);
        });
      },
    });

    context('when tableName is empty', {
      definitions() {
        tableName = '';
      },
      tests() {
        it('throw error', () => {
          try {
            subject();
          } catch (error) {
            expect(false).toBeTruthy(); // not expected to reach
          }
          expect(true).toBeTruthy();
        });
      },
      reset() {
        tableName = undefined;
      },
    });

    context('when tableName is invalid', {
      definitions() {
        tableName = '! !';
      },
      tests() {
        it('throw error', () => {
          try {
            subject();
          } catch (error) {
            expect(false).toBeTruthy(); // not expected to reach
          }
          expect(true).toBeTruthy();
        });
      },
      reset() {
        tableName = undefined;
      },
    });

    context('when poolConfig is not present', {
      definitions() {
        poolConfig = undefined;
      },
      tests() {
        it('will set a default', () => {
          const migrator = subject();
          expect(migrator.poolConfig).toBeUndefined();
        });
      },
    });

    context('when poolConfig is passed', {
      definitions() {
        poolConfig = {};
      },
      tests() {
        it('will use passed value', () => {
          expect(subject().poolConfig).toBe(poolConfig);
        });
      },
    });
  });

  describe('#migrate', () => {
    let migrations: Migration[] = [];
    const subject = () => connect().migrate(migrations);

    it('does not throw error', async () => {
      try {
        await subject();
      } catch (error) {
        expect(false).toBeTruthy(); // not expected to reach
      }
      expect(true).toBeTruthy();
    });

    context('when migration is present', {
      definitions() {
        migrations = [
          {
            version: 'test-1',
            up: jest.fn(),
            down: jest.fn(),
          },
        ];
      },
      tests() {
        it('applies migration', async () => {
          const fn = migrations[0].up;
          await subject();
          expect(fn).toBeCalled();
        });

        context('when running migrate multiple times', {
          definitions() {
            migrations = [
              {
                version: 'test-1a',
                up: jest.fn(),
                down: jest.fn(),
              },
            ];
          },
          tests() {
            it('applies migration', async () => {
              let fn = migrations[0].up;
              await subject();
              expect(fn).toBeCalled();
              migrations = [
                {
                  version: 'test-1b',
                  up: jest.fn(),
                  down: jest.fn(),
                },
              ];
              fn = migrations[0].up;
              await subject();
              expect(fn).toBeCalled();
            });

            context('when version was already applied', {
              definitions() {
                migrations = [
                  {
                    version: 'test-2a',
                    up: jest.fn(),
                    down: jest.fn(),
                  },
                ];
              },
              tests() {
                it('skips second migration migration', async () => {
                  let fn = migrations[0].up;
                  await subject();
                  expect(fn).toBeCalled();
                  migrations = [
                    {
                      version: 'test-2a',
                      up: jest.fn(),
                      down: jest.fn(),
                    },
                  ];
                  fn = migrations[0].up;
                  await subject();
                  expect(fn).not.toBeCalled();
                });
              },
            });

            context('when parent version was already applied', {
              definitions() {
                migrations = [
                  {
                    version: 'test-3a',
                    up: jest.fn(),
                    down: jest.fn(),
                  },
                ];
              },
              tests() {
                it('applies migration', async () => {
                  let fn = migrations[0].up;
                  await subject();
                  expect(fn).toBeCalled();
                  migrations = [
                    {
                      parent: ['test-3a'],
                      version: 'test-3b',
                      up: jest.fn(),
                      down: jest.fn(),
                    },
                  ];
                  fn = migrations[0].up;
                  await subject();
                  expect(fn).toBeCalled();
                });
              },
            });
          },
        });
      },
    });

    context('when migration has invalid parent', {
      definitions() {
        migrations = [
          {
            parent: ['test-0'],
            version: 'test-1',
            up: jest.fn(),
            down: jest.fn(),
          },
        ];
      },
      tests() {
        it('throws error', async () => {
          try {
            await subject();
          } catch (error) {
            return expect(error).toBeDefined();
          }
          expect(false).toBeTruthy(); // not expected to reach
        });
      },
    });

    context('when migration throws error', {
      definitions() {
        migrations = [
          {
            version: 'test-1',
            up: () => { throw 'error'; },
            down: jest.fn(),
          },
        ];
      },
      tests() {
        it('throws error', async () => {
          try {
            await subject();
          } catch (error) {
            return expect(error).toBeDefined();
          }
          expect(false).toBeTruthy(); // not expected to reach
        });
      },
    });

    context('when migrations parent build infinite loop', {
      definitions() {
        migrations = [
          {
            parent: ['test-1'],
            version: 'test-0',
            up: jest.fn(),
            down: jest.fn(),
          },
          {
            parent: ['test-0'],
            version: 'test-1',
            up: jest.fn(),
            down: jest.fn(),
          },
        ];
      },
      tests() {
        it('throws error', async () => {
          try {
            await subject();
          } catch (error) {
            return expect(error).toBeDefined();
          }
          expect(false).toBeTruthy(); // not expected to reach
        });
      },
    });
  });

  describe('#up', () => {
    let migration: Migration = {
      version: 'test-1',
      up: jest.fn(),
      down: jest.fn(),
    };

    const subject = () => connect().up(migration);

    context('when migration is present', {
      definitions() {
        migration = {
          version: 'test-up-1',
          up: jest.fn(),
          down: jest.fn(),
        };
      },
      tests() {
        it('applies migration', async () => {
          const fn = migration.up;
          await subject();
          expect(fn).toBeCalled();
        });
      },
    });

    context('when migration has invalid parent', {
      definitions() {
        migration = {
          parent: ['test-0'],
          version: 'test-up-2',
          up: jest.fn(),
          down: jest.fn(),
        };
      },
      tests() {
        it('throws error', async () => {
          try {
            await subject();
          } catch (error) {
            return expect(error).toBeDefined();
          }
          expect(false).toBeTruthy(); // not expected to reach
        });
      },
    });

    context('when migration throws error', {
      definitions() {
        migration = {
          version: 'test-up-3',
          up: () => { throw 'error'; },
          down: jest.fn(),
        };
      },
      tests() {
        it('throws error', async () => {
          try {
            await subject();
          } catch (error) {
            return expect(error).toBeDefined();
          }
          expect(false).toBeTruthy(); // not expected to reach
        });
      },
    });
  });

  describe('#down', () => {
    let migration: Migration = {
      version: 'test-1',
      up: jest.fn(),
      down: jest.fn(),
    };

    const subject = () => connect().down(migration);

    context('when migration is present', {
      definitions() {
        migration = {
          version: 'test-down-1',
          up: jest.fn(),
          down: jest.fn(),
        };
      },
      tests() {
        it('rolls back migration', async () => {
          const fn = migration.down;
          await subject();
          expect(fn).toBeCalled();
        });
      },
    });

    context('when migration has invalid parent', {
      definitions() {
        migration = {
          parent: ['test-0'],
          version: 'test-down-2',
          up: jest.fn(),
          down: jest.fn(),
        };
      },
      tests() {
        it('rolls back migration', async () => {
          const fn = migration.down;
          await subject();
          expect(fn).toBeCalled();
        });
      },
    });

    context('when migration throws error', {
      definitions() {
        migration = {
          version: 'test-down-3',
          up: jest.fn(),
          down: () => { throw 'error'; },
        };
      },
      tests() {
        it('throws error', async () => {
          try {
            await subject();
          } catch (error) {
            return expect(error).toBeDefined();
          }
          expect(false).toBeTruthy(); // not expected to reach
        });
      },
    });
  });

  describe('#dropTable', () => {
    const subject = () => connect().dropTable();

    it('does nothing when no table present', async () => {
      const migrator = connect();
      expect(await migrator.tableExists()).toBe(false);
      await subject();
      expect(await migrator.tableExists()).toBe(false);
    });

    context('when table is created before', {
      async definitions() {
        await connect().createTable();
      },
      tests() {
        it('drops table', async () => {
          const migrator = await connect();
          expect(await migrator.tableExists()).toBe(true);
          await subject();
          expect(await migrator.tableExists()).toBe(false);
        });
      },
    });
  });
});
