
  Events.MigrationsLoaded       = 'migrations-loaded';
  Events.MigrationRan           = 'migration-ran';
  Events.MigrationClassNotFound = 'migration-class-not-found';
  Events.MigrationsSaved        = 'migrations-saved';
  Events.MigrationsTested       = 'migrations-tested';
  Events.MigrationsNotLoaded    = 'migrations-not-loaded';
  Events.MigrationsFinished     = 'migrations-finished';

  Rekord.migrationTest = false;
  Rekord.migrationStore = 'migrations';

  Rekord.migration = migration;
  Rekord.migrationsClear = migrationsClear;
  Rekord.Migrations = Migrations;

  Rekord.ApplicationMigrator = ApplicationMigrator;
  Rekord.ModelMigrator = ModelMigrator;

})(this, Rekord);
