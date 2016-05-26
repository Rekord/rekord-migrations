

  Rekord.migrationTest = false;
  Rekord.migrationStore = 'migrations';

  Rekord.migration = migration;
  Rekord.Migrations = Migrations;

  Rekord.ApplicationMigrator = ApplicationMigrator;
  Rekord.ModelMigrator = ModelMigrator;

})(this, Rekord);
