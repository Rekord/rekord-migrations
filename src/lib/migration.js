
var Migrations = [];
var MigrationMap = {};

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
