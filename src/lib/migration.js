
var Migrations = [];
var MigrationMap = {};

var migrationLogs = [];

function migration(name, dependencies, migrate)
{
  var definition = {
    name: name,
    dependencies: dependencies,
    migrate: migrate
  };

  MigrationMap[ name ] = Migrations.length;
  Migrations.push( definition );
}

function migrationsClear()
{
  MigrationMap = {};
  Migrations.length = 0;
}

function migrationLog()
{
  migrationLogs.push( Array.prototype.slice.call( arguments ) );
}
