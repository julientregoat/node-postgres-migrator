import { resolve, basename } from 'path';
import {
  readdirSync,
  existsSync,
  mkdirSync,
} from 'fs';
import { Migration } from './types';

export class CLI {
  folder: string;

  private envHelp() {
    console.log('');
    console.log('Environment variables:');
    console.log('  PGHOST             Host of postgres server');
    console.log('  PGPORT             Port of postgres server ');
    console.log('  PGUSER             Username of postgres user');
    console.log('  PGPASSWORD         Password of postgres user');
    console.log('  PGDATABASE         Database Name');
  }

  help() {
    console.log('usage: pg-migrator <command> [paramenters]');
    console.log('To see help text, you can run:');
    console.log('');
    console.log('  pg-migrator help');
    console.log('  pg-migrator <command> help');
  }

  migrateHelp() {
    console.log('Applies all pending migrations from the given folder');
    console.log('');
    console.log('usage: pg-migrator migrate [paramenters]');
    console.log('');
    console.log('Options:');
    console.log('  -f, --folder       Folder which contains the migrations');
    console.log('                     (default: migrations)');
    this.envHelp();
  }

  upHelp() {
    console.log('Applies the migration');
    console.log('');
    console.log('usage: pg-migrator up [paramenters]');
    console.log('');
    console.log('Options:');
    console.log('  -f, --folder       Folder which contains the migrations');
    console.log('                     (default: migrations)');
    console.log('  -k, --key          Key of the migration');
    console.log('  -v, --version      Version of the migration (first part of key)');
    this.envHelp();
  }

  downHelp() {
    console.log('Does a rollback of the migration');
    console.log('');
    console.log('usage: pg-migrator down [paramenters]');
    console.log('');
    console.log('Options:');
    console.log('  -f, --folder       Folder which contains the migrations');
    console.log('                     (default: migrations)');
    console.log('  -k, --key          Key of the migration');
    console.log('  -v, --version      Version of the migration (first part of key)');
    this.envHelp();
  }

  create_databaseHelp() {
    console.log('Creates the database if not already existing');
    console.log('');
    console.log('usage: pg-migrator create_database [paramenters]');
    this.envHelp();
  }

  drop_databaseHelp() {
    console.log('Drops the database if already existing');
    console.log('');
    console.log('usage: pg-migrator drop_database [paramenters]');
    this.envHelp();
  }

  createHelp() {
    console.log('Creates a empty migration with the given name');
    console.log('');
    console.log('usage: pg-migrator create <name> [paramenters]');
    console.log('  -f, --folder       Folder which contains the migrations');
    console.log('                     (default: migrations)');
    this.envHelp();
  }

  createFolder(path: string) {
    const parent = resolve(path, '..');
    if (!existsSync(parent)) this.createFolder(parent);
    if (!existsSync(path)) mkdirSync(path);
  }

  get migrationsPath() {
    const folderParam = this.getParam('f', 'folder');
    const path = folderParam ? resolve(folderParam) : resolve('migrations');
    this.createFolder(path);
    return path;
  }

  get migrationKeys() {
    const path = this.migrationsPath;
    const files = readdirSync(path);
    console.log(this.migrationsPath);
    const jsFiles = files.filter(file => file.endsWith('.js'));
    return jsFiles.map(file => basename(file, '.js'));
  }

  getMigrations(keys: string[]): Migration[] {
    const path = this.migrationsPath;
    return keys.map(key => ({ key, ...require(`${path}/${key}`) }));
  }

  private getParam(shortKey: string, longKey: string) {
    const shortParam = `-${shortKey}`;
    const longParam = `--${longKey}=`;
    const argv = process.argv;
    let result: string | undefined = undefined;
    for (let index = 0; index < argv.length; index += 1) {
      const param = argv[index];
      if (param === shortParam) {
        const nextParam = argv[index + 1];
        if (nextParam) {
          if (!nextParam.startsWith('-')) {
            result = nextParam;
          } else {
            throw `invalid parameter value for «${shortParam}»: «${nextParam}»`;
          }
        } else {
          throw `value missing for parameter «${shortParam}»`;
        }
      }
      if (param.startsWith(longParam)) {
        result = param.substr(longParam.length);
      }
    }
    return result;
  }

  migrate() {
    const keys = this.migrationKeys;
    const migrations = this.getMigrations(keys);
    console.log({ keys, migrations });
  }
}

export default CLI;
